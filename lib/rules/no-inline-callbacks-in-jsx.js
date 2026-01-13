/**
 * Rule: no-inline-callbacks-in-jsx
 *
 * Запрещает использование inline-коллбеков в JSX согласно соглашению:
 *
 * В JSX-рендере не используем inline-коллбеки: используем заранее объявленные функции/хендлеры
 * вместо анонимных функций в JSX.
 */

/**
 * Проверяет, является ли выражение inline-коллбеком
 */
function isInlineCallback(node) {
    if (!node) {
        return false;
    }
    if (node.type === 'ArrowFunctionExpression') {
        return true;
    }
    if (node.type === 'FunctionExpression') {
        return true;
    }
    if (node.type === 'CallExpression') {
        const { callee } = node;
        if (
            callee.type === 'MemberExpression' &&
            callee.property &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'bind'
        ) {
            return true;
        }
    }
    return false;
}

/**
 * Получает имя атрибута JSX
 */
function getJSXAttributeName(node) {
    if (!node || !node.name) {
        return null;
    }
    if (node.name.type === 'JSXIdentifier') {
        return node.name.name;
    }
    if (node.name.type === 'JSXNamespacedName') {
        return `${node.name.namespace.name}:${node.name.name.name}`;
    }
    return null;
}

module.exports = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Запрещает использование inline-коллбеков в JSX',
            category: 'Stylistic Issues',
            recommended: false,
        },
        fixable: null,
        schema: [],
        messages: {
            noInlineCallbacks: 'Не используйте inline-коллбеки в JSX. Объявите функцию отдельно и используйте её имя.',
        },
    },

    create(context) {
        return {
            JSXExpressionContainer(node) {
                const { expression } = node;
                if (isInlineCallback(expression)) {
                    const { parent } = node;
                    if (parent && parent.type === 'JSXAttribute') {
                        const attributeName = getJSXAttributeName(parent);
                        if (attributeName && /^on[A-Z]/.test(attributeName)) {
                            context.report({
                                node: expression,
                                messageId: 'noInlineCallbacks',
                            });
                        }
                    }
                }
            },
        };
    },
};
