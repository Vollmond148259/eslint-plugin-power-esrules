/**
 * Rule: no-default-props
 *
 * Запрещает использование defaultProps согласно соглашению:
 *
 * При задании значений по умолчанию не пользуемся defaultProps.
 */

/**
 * Проверяет, является ли идентификатор React-компонентом
 */
function isReactComponentName(name) {
    if (!name || typeof name !== 'string') {
        return false;
    }
    return /^[A-Z]/.test(name);
}

/**
 * Получает имя компонента из узла присваивания
 */
function getComponentNameFromAssignment(node) {
    if (!node || node.type !== 'AssignmentExpression') {
        return null;
    }
    const { left } = node;
    if (!left || left.type !== 'MemberExpression') {
        return null;
    }
    if (left.property && left.property.type === 'Identifier' && left.property.name === 'defaultProps') {
        if (left.object && left.object.type === 'Identifier') {
            return left.object.name;
        }
    }
    return null;
}

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Запрещает использование defaultProps',
            category: 'Stylistic Issues',
            recommended: false,
        },
        fixable: null,
        schema: [],
        messages: {
            noDefaultProps:
                // eslint-disable-next-line max-len
                'Использование defaultProps запрещено. Используйте деструктуризацию с значениями по умолчанию в параметрах функции.',
        },
    },

    create(context) {
        return {
            AssignmentExpression(node) {
                const componentName = getComponentNameFromAssignment(node);
                if (componentName && isReactComponentName(componentName)) {
                    context.report({
                        node: node.left.property,
                        messageId: 'noDefaultProps',
                    });
                }
            },
        };
    },
};
