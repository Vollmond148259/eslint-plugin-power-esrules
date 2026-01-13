/**
 * Rule: id-naming-convention
 *
 * Проверяет именование идентификаторов согласно соглашению:
 *
 * Если переменная обозначает идентификатор чего-либо, то id пишется всегда капсом - assetID, taskID и т.п.
 *
 * Пример неправильного использования:
 * const assetId = 123;
 * const taskId = 456;
 * function getUser(userId) {}
 *
 * Пример правильного использования:
 * const assetID = 123;
 * const taskID = 456;
 * function getUser(userID) {}
 */

/**
 * Проверяет, содержит ли имя переменной "id" (в любом регистре)
 */
function containsId(name) {
    if (!name || typeof name !== 'string') {
        return false;
    }
    return /id/i.test(name);
}

/**
 * Проверяет, правильно ли написано "ID" в имени переменной
 */
function hasCorrectIdFormat(name) {
    if (!name || typeof name !== 'string') {
        return true; // Если имени нет, пропускаем
    }
    const lowerName = name.toLowerCase();
    const excludedWords = [
        'identifier',
        'valid',
        'invalid',
        'provide',
        'divide',
        'decide',
        'hide',
        'slide',
        'guide',
        'wide',
        'side',
        'messageid',
    ];
    if (excludedWords.some((word) => lowerName.includes(word)) || lowerName==="id") {
        return true;
    }
    const idMatches = name.matchAll(/([a-zA-Z]*?)([Ii]d|ID)([a-zA-Z]*)/g);
    const matchesArray = Array.from(idMatches);
    for (const match of matchesArray) {
        const idPart = match[2];
        const afterID = match[3];
        if (afterID && afterID.length > 0) {
            continue;
        }
        if (idPart !== 'ID') {
            return false;
        }
    }
    return true;
}

/**
 * Получает имя из узла объявления переменной
 */
function getVariableName(node) {
    if (!node) {
        return null;
    }
    if (node.type === 'Identifier') {
        return node.name;
    }
    if (node.type === 'VariableDeclarator' && node.id) {
        if (node.id.type === 'Identifier') {
            return node.id.name;
        }
        if (node.id.type === 'ObjectPattern') {
            return null;
        }
    }
    return null;
}

/**
 * Генерирует правильное имя с ID в капсе
 */
function fixIdName(name) {
    if (!name || typeof name !== 'string') {
        return name;
    }
    return name.replace(/([a-zA-Z]*?)([Ii]d)([^a-zA-Z]*|$)/g, (match, before, idPart, after) => {
        if (after && /[a-zA-Z]/.test(after)) {
            return match;
        }
        return `${before}ID${after}`;
    });
}

/**
 * Проверяет все идентификаторы в деструктуризации
 */
function checkDestructuredProperties(node, context) {
    if (!node || node.type !== 'ObjectPattern') {
        return;
    }
    const { properties } = node;
    if (!properties || !Array.isArray(properties)) {
        return;
    }
    for (const prop of properties) {
        if (prop.type === 'Property') {
            const { key } = prop;
            if (key && key.type === 'Identifier') {
                const { name } = key;
                if (containsId(name) && !hasCorrectIdFormat(name)) {
                    const suggestedName = fixIdName(name);
                    context.report({
                        node: key,
                        messageId: 'idMustBeUppercase',
                        data: {
                            variableName: name,
                            suggestedName,
                        },
                        fix(fixer) {
                            return fixer.replaceText(key, suggestedName);
                        },
                    });
                }
            }
        }
    }
}

module.exports = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Проверяет, что идентификаторы используют ID в капсе',
            category: 'Stylistic Issues',
            recommended: false,
        },
        fixable: 'code',
        schema: [],
        messages: {
            idMustBeUppercase:
                'Идентификаторы должны использовать "ID" в капсе. ' +
                'Вместо "{{variableName}}" используйте "{{suggestedName}}"',
        },
    },

    create(context) {
        return {
            VariableDeclarator(node) {
                const variableName = getVariableName(node);
                if (variableName && containsId(variableName) && !hasCorrectIdFormat(variableName)) {
                    const suggestedName = fixIdName(variableName);
                    context.report({
                        node: node.id,
                        messageId: 'idMustBeUppercase',
                        data: {
                            variableName,
                            suggestedName,
                        },
                        fix(fixer) {
                            return fixer.replaceText(node.id, suggestedName);
                        },
                    });
                }
                if (node.id && node.id.type === 'ObjectPattern') {
                    checkDestructuredProperties(node.id, context);
                }
            },

            FunctionDeclaration(node) {
                if (!node.params || !Array.isArray(node.params)) {
                    return;
                }
                for (const param of node.params) {
                    if (param.type === 'Identifier') {
                        const { name } = param;
                        if (containsId(name) && !hasCorrectIdFormat(name)) {
                            const suggestedName = fixIdName(name);
                            context.report({
                                node: param,
                                messageId: 'idMustBeUppercase',
                                data: {
                                    variableName: name,
                                    suggestedName,
                                },
                                fix(fixer) {
                                    return fixer.replaceText(param, suggestedName);
                                },
                            });
                        }
                    } else if (param.type === 'ObjectPattern') {
                        checkDestructuredProperties(param, context);
                    }
                }
            },

            ArrowFunctionExpression(node) {
                if (!node.params || !Array.isArray(node.params)) {
                    return;
                }
                for (const param of node.params) {
                    if (param.type === 'Identifier') {
                        const { name } = param;
                        if (containsId(name) && !hasCorrectIdFormat(name)) {
                            const suggestedName = fixIdName(name);
                            context.report({
                                node: param,
                                messageId: 'idMustBeUppercase',
                                data: {
                                    variableName: name,
                                    suggestedName,
                                },
                                fix(fixer) {
                                    return fixer.replaceText(param, suggestedName);
                                },
                            });
                        }
                    } else if (param.type === 'ObjectPattern') {
                        checkDestructuredProperties(param, context);
                    }
                }
            },

            Property(node) {
                if (node.key && node.key.type === 'Identifier') {
                    const { name } = node.key;
                    if (containsId(name) && !hasCorrectIdFormat(name)) {
                        const suggestedName = fixIdName(name);
                        context.report({
                            node: node.key,
                            messageId: 'idMustBeUppercase',
                            data: {
                                variableName: name,
                                suggestedName,
                            },
                            fix(fixer) {
                                return fixer.replaceText(node.key, suggestedName);
                            },
                        });
                    }
                }
            },
        };
    },
};
