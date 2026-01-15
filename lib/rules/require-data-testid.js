/**
 * Rule: require-data-testid
 *
 * Проверяет наличие data-testid атрибута у корневого контейнера JSX файла
 * и рекомендует запустить codemod скрипт для его добавления, если атрибут отсутствует.
 */

const path = require("path");

/**
 * Получает имя JSX элемента
 */
function getJSXName(jsxName) {
  if (!jsxName) return null;
  switch (jsxName.type) {
    case "JSXIdentifier":
      return jsxName.name || null;
    case "JSXMemberExpression":
      // Берем правую часть: UI.Button -> Button
      return getJSXName(jsxName.property);
    case "JSXNamespacedName":
      return `${jsxName.namespace?.name || "ns"}:${
        jsxName.name?.name || "Name"
      }`;
    default:
      return null;
  }
}

/**
 * Проверяет, является ли узел верхнеуровневым JSX элементом
 * (не вложенным в другой JSX элемент или Fragment)
 */
function isTopLevelJSX(node) {
  let current = node.parent;
  while (current) {
    const parentType = current.type;
    // Если родитель - JSX элемент или Fragment, значит это не верхнеуровневый элемент
    if (parentType === "JSXElement" || parentType === "JSXFragment") {
      return false;
    }
    // Если родитель - ReturnStatement, это возвращаемое значение компонента (верхнеуровневый)
    if (parentType === "ReturnStatement") {
      return true;
    }
    // Если родитель - ExportDefaultDeclaration или ExportNamedDeclaration,
    // это может быть верхнеуровневый JSX
    if (
      parentType === "ExportDefaultDeclaration" ||
      parentType === "ExportNamedDeclaration"
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Спускается от Fragment к первому рендеримому JSXElement
 */
function descendToFirstRenderable(node) {
  if (!node) return null;

  // 1) Если это JSXFragment — обходим детей
  if (node.type === "JSXFragment") {
    for (const child of node.children || []) {
      if (child.type === "JSXElement") {
        const resolved = descendToFirstRenderable(child);
        if (resolved) return resolved;
      }
    }
    return null;
  }

  // 2) Если это JSXElement с именем Fragment
  if (node.type === "JSXElement") {
    const name = getJSXName(node.openingElement?.name);
    if (name === "Fragment") {
      for (const child of node.children || []) {
        if (child.type === "JSXElement") {
          const resolved = descendToFirstRenderable(child);
          if (resolved) return resolved;
        }
      }
      return null;
    }
    // Иначе это реальный рендеримый элемент
    return node;
  }

  return null;
}

/**
 * Проверяет наличие data-testid или dataTestID атрибута
 */
function hasDataTestId(openingElement) {
  if (!openingElement || !openingElement.attributes) {
    return false;
  }
  return openingElement.attributes.some((attr) => {
    if (!attr || attr.type !== "JSXAttribute" || !attr.name) {
      return false;
    }
    const attrName = attr.name.name;
    return attrName === "data-testid" || attrName === "dataTestID";
  });
}

/**
 * Получает относительный путь к файлу от корня проекта
 */
function getRelativeFilePath(context) {
  const filename = context.getFilename();
  const workspaceRoot = context.getCwd ? context.getCwd() : process.cwd();
  return path.relative(workspaceRoot, filename);
}

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Проверяет наличие data-testid атрибута у корневого контейнера JSX файла и рекомендует запустить codemod",
      category: "Best Practices",
      recommended: false,
    },
    fixable: null,
    schema: [],
    messages: {
      missingDataTestId:
        "Корневой контейнер JSX не содержит атрибут data-testid. " +
        "Запустите: node node_modules/power-linter/scripts/addDataTestId/run-codemod.js {{filePath}}" +
        "или node node_modules/power-linter/scripts/addDataTestId/run-codemod.js src для всего проекта",
    },
  },

  create(context) {
    let hasReported = false;
    let rootJSXNode = null;

    return {
      ReturnStatement(node) {
        // Проверяем только один раз на файл
        if (hasReported || rootJSXNode) {
          return;
        }

        const returnArgument = node.argument;
        if (!returnArgument) {
          return;
        }

        // Если возвращается JSX элемент или Fragment
        if (
          returnArgument.type === "JSXElement" ||
          returnArgument.type === "JSXFragment"
        ) {
          // Проверяем, что это не вложенный JSX (не имеет JSX родителя)
          if (isTopLevelJSX(returnArgument)) {
            rootJSXNode = returnArgument;
          }
        }
      },

      JSXElement(node) {
        // Проверяем только один раз на файл
        if (hasReported || rootJSXNode) {
          return;
        }

        // Проверяем верхнеуровневые JSX элементы вне ReturnStatement
        // (например, экспортируемые напрямую)
        if (isTopLevelJSX(node)) {
          rootJSXNode = node;
        }
      },

      JSXFragment(node) {
        // Проверяем только один раз на файл
        if (hasReported || rootJSXNode) {
          return;
        }

        // Проверяем верхнеуровневые Fragment вне ReturnStatement
        if (isTopLevelJSX(node)) {
          rootJSXNode = node;
        }
      },

      "Program:exit"() {
        // После обхода всего файла проверяем корневой JSX элемент
        if (hasReported || !rootJSXNode) {
          return;
        }

        // Если это Fragment, спускаемся к первому рендеримому элементу
        const rootElement = descendToFirstRenderable(rootJSXNode);
        const elementToCheck = rootElement || rootJSXNode;

        if (!elementToCheck.openingElement) {
          return;
        }

        // Проверяем наличие data-testid
        if (!hasDataTestId(elementToCheck.openingElement)) {
          hasReported = true;
          const filePath = getRelativeFilePath(context);
          context.report({
            node: elementToCheck.openingElement,
            messageId: "missingDataTestId",
            data: {
              filePath,
            },
          });
        }
      },
    };
  },
};
