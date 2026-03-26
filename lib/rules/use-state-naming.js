/**
 * Rule: use-state-naming
 *
 * Проверяет именование переменных useState согласно соглашению:
 *
 * Названия переменных созданных через useState по возможности должны иметь окончание State
 * (например innerModalState, setInnerModalState).
 */
String.prototype.firstLetterToUppercase = function () {
  return this[0].toUpperCase() + this.slice(1);
};

/**
 * Проверяет, является ли узел вызовом useState
 */
function isUseStateCall(node) {
  if (!node || node.type !== "CallExpression") {
    return false;
  }
  const { callee } = node;
  if (callee.type === "Identifier" && callee.name === "useState") {
    return true;
  }
  if (
    callee.type === "MemberExpression" &&
    callee.property &&
    callee.property.type === "Identifier" &&
    callee.property.name === "useState"
  ) {
    return true;
  }
  return false;
}

/**
 * Проверяет, заканчивается ли имя на "State"
 */
function endsWithState(name) {
  if (!name || typeof name !== "string") {
    return false;
  }
  return name.endsWith("State");
}

/**
 * Генерирует правильное имя с окончанием State
 */
function fixStateName(name) {
  if (!name || typeof name !== "string") {
    return name;
  }
  if (endsWithState(name)) {
    return name;
  }
  return `${name}State`;
}

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Проверяет, что переменные useState имеют окончание State",
      category: "Stylistic Issues",
      recommended: false,
    },
    // fixable: 'code', // OLD: auto-fixable (eslint --fix)
    hasSuggestions: true, // NEW: quick-fix suggestions (not applied by eslint --fix)
    schema: [],
    messages: {
      useStateShouldEndWithState:
        'Переменные useState должны иметь окончание "State". ' +
        'Вместо "{{variableName}}" используйте "{{suggestedName}}"',
      suggestRenameTo: 'Переименовать в "{{suggestedName}}"',
    },
  },

  create(context) {
    return {
      VariableDeclarator(node) {
        if (!node.id || node.id.type !== "ArrayPattern") {
          return;
        }
        const { init } = node;
        if (!init || !isUseStateCall(init)) {
          return;
        }
        const { elements } = node.id;
        if (!elements || elements.length < 1) {
          return;
        }
        const stateElement = elements[0];
        let stateName = null;
        if (stateElement && stateElement.type === "Identifier") {
          stateName = stateElement.name;
          if (!endsWithState(stateName)) {
            const suggestedName = fixStateName(stateName);
            context.report({
              node: stateElement,
              messageId: "useStateShouldEndWithState",
              data: {
                variableName: stateName,
                suggestedName,
              },
              /*
               * OLD auto-fix:
               * fix(fixer) {
               *   return fixer.replaceText(stateElement, suggestedName);
               * },
               */
              suggest: [
                {
                  messageId: "suggestRenameTo",
                  data: { suggestedName },
                  fix(fixer) {
                    return fixer.replaceText(stateElement, suggestedName);
                  },
                },
              ],
            });
          }
        }
        const setterElement = elements[1];
        if (setterElement && setterElement.type === "Identifier" && stateName) {
          const setterName = setterElement.name;
          const correctedStateName = endsWithState(stateName)
            ? stateName
            : fixStateName(stateName);
          const stateNameWithoutState = correctedStateName
            .replace(/State$/, "")
            .firstLetterToUppercase();
          const expectedSetterName = `set${stateNameWithoutState}State`;
          if (setterName !== expectedSetterName) {
            context.report({
              node: setterElement,
              messageId: "useStateShouldEndWithState",
              data: {
                variableName: setterName,
                suggestedName: expectedSetterName,
              },
              /*
               * OLD auto-fix:
               * fix(fixer) {
               *   return fixer.replaceText(setterElement, expectedSetterName);
               * },
               */
              suggest: [
                {
                  messageId: "suggestRenameTo",
                  data: { suggestedName: expectedSetterName },
                  fix(fixer) {
                    return fixer.replaceText(setterElement, expectedSetterName);
                  },
                },
              ],
            });
          }
        }
      },
    };
  },
};
