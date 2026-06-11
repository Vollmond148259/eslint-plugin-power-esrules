/**
 * Rule: require-data-testid
 *
 * Проверяет наличие data-testid атрибута у корневого JSX элемента React-компонента
 * и рекомендует запустить codemod скрипт для его добавления, если атрибут отсутствует.
 */

const path = require("path");
const packetName = "@hubex/power-linter";

/** Получает имя JSX элемента */
function getJSXName(jsxName) {
  if (!jsxName) return null;
  switch (jsxName.type) {
    case "JSXIdentifier":
      return jsxName.name || null;
    case "JSXMemberExpression":
      return getJSXName(jsxName.property);
    case "JSXNamespacedName":
      return `${jsxName.namespace?.name || "ns"}:${
        jsxName.name?.name || "Name"
      }`;
    default:
      return null;
  }
}

/** Проверка PascalCase */
function isPascalCase(name) {
  return /^[A-Z]/.test(name);
}

/** Находит имя компонента, учитывая HOC (memo, forwardRef, observer) */
function getComponentName(node) {
  if (!node) return null;

  if (node.type === "ClassDeclaration") {
    return node.id?.name ?? null;
  }

  if (
    node.type === "ClassExpression" &&
    node.parent?.type === "VariableDeclarator"
  ) {
    return node.parent.id?.name ?? null;
  }

  // Функция объявлена напрямую
  if (node.type === "FunctionDeclaration") {
    return node.id?.name ?? null;
  }

  // Переменная с функцией
  if (
    (node.type === "ArrowFunctionExpression" ||
      node.type === "FunctionExpression") &&
    node.parent?.type === "VariableDeclarator"
  ) {
    return node.parent.id?.name ?? null;
  }

  if (
    node.parent?.type === "CallExpression" &&
    node.parent.parent?.type === "VariableDeclarator"
  ) {
    node.parent.parent.id?.name ?? null;
  }

  if (
    node.type === "CallExpression" &&
    node.parent?.type === "VariableDeclarator"
  ) {
    return node.parent.id?.name ?? null;
  }

  // HOC обёртка: memo(() => {}) или forwardRef(() => {}) или observer(() => {})
  if (node.type === "CallExpression" && node.arguments.length > 0) {
    return getComponentName(node.arguments[0]);
  }

  return null;
}

/** Проверяет, является ли функция React-компонентом */
function isReactComponent(node) {
  const name = getComponentName(node);
  return Boolean(name && isPascalCase(name));
}

/** Находит корневой JSX элемент компонента, поддержка HOC */
function getRootJSXFromComponent(fnNode) {
  if (!fnNode) return null;

  if (fnNode.type === "ClassDeclaration" || fnNode.type === "ClassExpression") {
    const renderMethod = fnNode.body.body.find(
      (member) =>
        member.type === "MethodDefinition" && member.key?.name === "render",
    );

    if (!renderMethod) return null;

    const body = renderMethod.value.body.body;

    for (const stmt of body) {
      if (
        stmt.type === "ReturnStatement" &&
        stmt.argument &&
        (stmt.argument.type === "JSXElement" ||
          stmt.argument.type === "JSXFragment")
      ) {
        return stmt.argument;
      }
    }
  }

  // Разворачиваем HOC
  if (fnNode.type === "CallExpression" && fnNode.arguments.length > 0) {
    return getRootJSXFromComponent(fnNode.arguments[0]);
  }

  // Arrow function без блока: const X = () => <Page />
  if (
    fnNode.body?.type === "JSXElement" ||
    fnNode.body?.type === "JSXFragment"
  ) {
    return fnNode.body;
  }

  // Function с блоком
  if (fnNode.body?.type !== "BlockStatement") return null;

  for (const stmt of fnNode.body.body) {
    if (
      stmt.type === "ReturnStatement" &&
      stmt.argument &&
      (stmt.argument.type === "JSXElement" ||
        stmt.argument.type === "JSXFragment")
    ) {
      return stmt.argument;
    }
  }

  return null;
}

/** Рекурсивно спускается через Fragment к первому рендеримому JSXElement */
function descendToFirstRenderable(node) {
  if (!node) return null;

  if (node.type === "JSXFragment") {
    for (const child of node.children || []) {
      if (child.type === "JSXElement") {
        const resolved = descendToFirstRenderable(child);
        if (resolved) return resolved;
      }
    }
    return null;
  }

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
    return node;
  }

  return null;
}

/** Проверяет наличие data-testid или dataTestID */
function hasDataTestId(openingElement) {
  if (!openingElement || !openingElement.attributes) return false;

  return openingElement.attributes.some((attr) => {
    if (!attr || attr.type !== "JSXAttribute" || !attr.name) return false;
    const attrName = attr.name.name;
    return attrName === "data-testid" || attrName === "dataTestID";
  });
}

/** Получает относительный путь к файлу */
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
        "Проверяет наличие data-testid атрибута у корневого JSX элемента React-компонента",
      category: "Best Practices",
      recommended: false,
    },
    fixable: null,
    schema: [],
    messages: {
      missingDataTestId:
        "Корневой контейнер JSX не содержит атрибут data-testid. " +
        `Запустите: node node_modules/${packetName}/scripts/addDataTestId/run-codemod.js {{filePath}}` +
        ` или node node_modules/${packetName}/scripts/addDataTestId/run-codemod.js src для всего проекта`,
    },
  },

  create(context) {
    const components = new Set();

    function collectComponent(node) {
      if (isReactComponent(node)) {
        components.add(node);
      }
    }

    return {
      FunctionDeclaration: collectComponent,
      FunctionExpression: collectComponent,
      ArrowFunctionExpression: collectComponent,
      ClassDeclaration: collectComponent,
      ClassExpression: collectComponent,
      CallExpression: collectComponent,

      "Program:exit"() {
        for (const component of components) {
          const rootJSX = getRootJSXFromComponent(component);
          if (!rootJSX) continue;

          const elementToCheck = descendToFirstRenderable(rootJSX) || rootJSX;
          if (!elementToCheck?.openingElement) continue;

          if (!hasDataTestId(elementToCheck.openingElement)) {
            const filePath = getRelativeFilePath(context);
            context.report({
              node: elementToCheck.openingElement,
              messageId: "missingDataTestId",
              data: { filePath },
            });
          }
        }
      },
    };
  },
};
