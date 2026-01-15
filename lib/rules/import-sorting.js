/**
 * Rule: import-sorting
 *
 * Проверяет сортировку импортов согласно соглашению:
 *
 * 1. Самыми первыми идут импорты из сторонних библиотек
 * 2. За ними следует импорты наших функций, классов, утилит
 * 3. Последними следуют компоненты (это не означает, что все что лежит в папке components, а именно компоненты)
 *
 * Между группами импортов должны быть пустые строки.
 */

/**
 * Определяет тип импорта
 * @param {Object} node - AST узел ImportDeclaration
 * @returns {string} - 'external', 'internal', или 'component'
 */
function getImportType(node) {
  const source = node.source.value;
  // Относительные импорты (./ или ../) всегда внутренние
  if (source.startsWith("./") || source.startsWith("../")) {
    // Проверяем, является ли это компонентом
    // Компоненты обычно импортируются как default или с большой буквы
    const isDefaultImport = node.specifiers.some(
      (spec) => spec.type === "ImportDefaultSpecifier"
    );
    const hasComponentName = node.specifiers.some(
      (spec) =>
        spec.type === "ImportSpecifier" &&
        spec.imported &&
        /^[A-Z]/.test(spec.imported.name)
    );
    if (isDefaultImport || hasComponentName) {
      return "component";
    }
    return "internal";
  }

  // Сторонние библиотеки (не относительные и не начинаются с внутренних путей)
  const internalPathPatterns = [
    /^components\//,
    /^utils\//,
    /^modules\//,
    /^pages\//,
    /^services\//,
    /^store\//,
    /^types\//,
    /^constants\//,
    /^hooks\//,
    /^helpers\//,
    /^selectors\//,
    /^base\//,
  ];
  const isInternalPath = internalPathPatterns.some((pattern) =>
    pattern.test(source)
  );
  if (!isInternalPath) {
    return "external";
  }
  // Внутренние пути
  // Компоненты обычно из папки components/ или имеют имена с большой буквы
  if (source.startsWith("components/")) {
    // Исключения: theme, constants, utils, helpers - это утилиты, не компоненты
    const isUtility =
      /components\/(theme|constants|utils|helpers|auxiliary)/.test(source);
    if (isUtility) {
      return "internal";
    }
    // Проверяем, является ли это компонентом
    const isDefaultImport = node.specifiers.some(
      (spec) => spec.type === "ImportDefaultSpecifier"
    );
    const hasComponentName = node.specifiers.some(
      (spec) =>
        spec.type === "ImportSpecifier" &&
        spec.imported &&
        /^[A-Z][a-zA-Z]*$/.test(spec.imported.name) && // Имя начинается с большой буквы и не все заглавные
        spec.imported.name !== spec.imported.name.toUpperCase() // Не константа (не все заглавные)
    );
    if (isDefaultImport || hasComponentName) {
      return "component";
    }
  }
  // Проверяем, является ли именованный импорт компонентом (начинается с большой буквы, но не константа)
  const hasComponentName = node.specifiers.some(
    (spec) =>
      spec.type === "ImportSpecifier" &&
      spec.imported &&
      /^[A-Z][a-zA-Z]*$/.test(spec.imported.name) &&
      spec.imported.name !== spec.imported.name.toUpperCase() // Не константа
  );
  if (hasComponentName) {
    return "component";
  }
  return "internal";
}

/**
 * Получает приоритет для сортировки
 */
function getImportPriority(type) {
  const priorities = {
    external: 1,
    internal: 2,
    component: 3,
  };
  return priorities[type] || 999;
}

/**
 * Сравнивает два импорта для сортировки
 */
function compareImports(a, b) {
  const typeA = getImportType(a);
  const typeB = getImportType(b);
  const priorityA = getImportPriority(typeA);
  const priorityB = getImportPriority(typeB);
  // Сначала по типу
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  // Затем по имени источника (алфавитно)
  const sourceA = a.source.value;
  const sourceB = b.source.value;
  return sourceA.localeCompare(sourceB);
}

/**
 * Проверяет, нужна ли пустая строка между двумя импортами
 */
function needsBlankLineBetween(importA, importB) {
  const typeA = getImportType(importA);
  const typeB = getImportType(importB);
  return typeA !== typeB;
}

module.exports = {
  meta: {
    type: "layout",
    docs: {
      description: "Проверяет сортировку импортов согласно соглашению",
      category: "Stylistic Issues",
      recommended: false,
    },
    fixable: "code",
    schema: [],
    messages: {
      // eslint-disable-next-line max-len
      incorrectOrder:
        "Импорты должны быть отсортированы: сначала сторонние библиотеки, затем внутренние утилиты, затем компоненты",
      missingBlankLine: "Требуется пустая строка между группами импортов",
    },
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    return {
      Program(node) {
        const imports = node.body.filter(
          (stmt) => stmt.type === "ImportDeclaration"
        );

        if (imports.length === 0) {
          return;
        }
        // Проверяем порядок импортов
        for (let i = 1; i < imports.length; i++) {
          const prev = imports[i - 1];
          const current = imports[i];
          const comparison = compareImports(prev, current);
          if (comparison > 0) {
            context.report({
              node: current,
              messageId: "incorrectOrder",
              fix(fixer) {
                // Находим все импорты и сортируем их
                const sortedImports = [...imports].sort(compareImports);
                const firstImport = imports[0];
                const lastImport = imports[imports.length - 1];
                const firstToken = sourceCode.getFirstToken(firstImport);
                const lastToken = sourceCode.getLastToken(lastImport);
                // Собираем текст для всех отсортированных импортов
                let sortedText = "";
                for (let j = 0; j < sortedImports.length; j++) {
                  const importNode = sortedImports[j];
                  // Получаем текст импорта и убираем завершающие переводы строк
                  let importText = sourceCode.getText(importNode);
                  // Убираем все завершающие переводы строк и пробелы
                  importText = importText.replace(/[\r\n\s]+$/, "");
                  sortedText += importText;
                  // Добавляем перевод строки между импортами
                  if (j < sortedImports.length - 1) {
                    const nextImport = sortedImports[j + 1];
                    if (needsBlankLineBetween(importNode, nextImport)) {
                      sortedText += "\n\n";
                    } else {
                      sortedText += "\n";
                    }
                  }
                }
                return fixer.replaceTextRange(
                  [firstToken.range[0], lastToken.range[1]],
                  sortedText
                );
              },
            });
            return; // Исправляем только первую найденную ошибку за раз
          }
        }

        // Проверяем пустые строки между группами
        for (let i = 1; i < imports.length; i++) {
          const prev = imports[i - 1];
          const current = imports[i];
          if (needsBlankLineBetween(prev, current)) {
            const firstTokenCurrent = sourceCode.getFirstToken(current);
            const lastTokenPrev = sourceCode.getLastToken(prev);
            const lineDiff =
              firstTokenCurrent.loc.start.line - lastTokenPrev.loc.end.line;
            const hasBlankLine = lineDiff > 1;
            if (!hasBlankLine) {
              context.report({
                node: current,
                messageId: "missingBlankLine",
                fix(fixer) {
                  const firstToken = sourceCode.getFirstToken(current);
                  return fixer.insertTextBefore(firstToken, "\n");
                },
              });
            }
          } else {
            // Проверяем, что нет лишних пустых строк внутри группы
            const firstTokenCurrent = sourceCode.getFirstToken(current);
            const lastTokenPrev = sourceCode.getLastToken(prev);
            const lineDiff =
              firstTokenCurrent.loc.start.line - lastTokenPrev.loc.end.line;
            const hasBlankLine = lineDiff > 1;
            if (hasBlankLine) {
              context.report({
                node: current,
                messageId: "missingBlankLine",
                fix(fixer) {
                  // Удаляем лишние пустые строки
                  const firstToken = sourceCode.getFirstToken(current);
                  const lastTokenOfPrev = sourceCode.getLastToken(prev);
                  const textBetween = sourceCode
                    .getText()
                    .slice(lastTokenOfPrev.range[1], firstToken.range[0]);
                  const fixedText = textBetween.replace(/\n\s*\n+/g, "\n");
                  return fixer.replaceTextRange(
                    [lastTokenOfPrev.range[1], firstToken.range[0]],
                    fixedText
                  );
                },
              });
            }
          }
        }
      },
    };
  },
};
