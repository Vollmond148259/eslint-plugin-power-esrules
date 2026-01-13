/**
 * Rule: class-to-functional
 *
 * Автоматически определяет классовые компоненты для конвертации в функциональные
 * и выводит уведомление с рекомендацией запустить codemod скрипт.
 *
 * Условия для определения:
 * 1. Не содержит внутреннего стейта (this.state)
 * 2. Содержит от 1 до 4 методов класса (не считая методы жизненного цикла)
 * Рекомендация: Запустите npm run codemod:classToFC -- <file-path>
 */

const path = require('path');

/**
 * Проверяет, является ли класс React компонентом
 */
function isReactComponentClass(node) {
    if (!node || (node.type !== 'ClassDeclaration' && node.type !== 'ClassExpression')) {
        return false;
    }
    if (!node.superClass) {
        return false;
    }
    const { superClass } = node;
    if (superClass.type === 'Identifier') {
        return superClass.name === 'Component' || superClass.name === 'PureComponent';
    }
    if (
        superClass.type === 'MemberExpression' &&
        superClass.object &&
        superClass.object.type === 'Identifier' &&
        superClass.object.name === 'React' &&
        superClass.property &&
        superClass.property.type === 'Identifier' &&
        (superClass.property.name === 'Component' || superClass.property.name === 'PureComponent')
    ) {
        return true;
    }
    return false;
}

/**
 * Проверяет, является ли метод методом жизненного цикла
 */
function isLifecycleMethod(methodName) {
    const lifecycleMethods = [
        'componentDidMount',
        'componentDidUpdate',
        'componentWillUnmount',
        'componentWillMount',
        'componentWillReceiveProps',
        'UNSAFE_componentWillMount',
        'UNSAFE_componentWillReceiveProps',
        'UNSAFE_componentWillUpdate',
        'shouldComponentUpdate',
        'componentWillUpdate',
        'getSnapshotBeforeUpdate',
        'componentDidCatch',
        'getDerivedStateFromProps',
    ];
    return lifecycleMethods.includes(methodName) || methodName.startsWith('component');
}

/**
 * Проверяет, содержит ли узел использование this.state или this.setState
 */
function hasStateUsage(node) {
    let hasState = false;
    // Используем обход AST для поиска this.state и this.setState
    function traverse(node) {
        if (!node || hasState) {
            return;
        }
        if (
            node.type === 'MemberExpression' &&
            node.object &&
            node.object.type === 'ThisExpression' &&
            node.property &&
            node.property.type === 'Identifier' &&
            node.property.name === 'state'
        ) {
            hasState = true;
            return;
        }
        if (
            node.type === 'CallExpression' &&
            node.callee &&
            node.callee.type === 'MemberExpression' &&
            node.callee.object &&
            node.callee.object.type === 'ThisExpression' &&
            node.callee.property &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'setState'
        ) {
            hasState = true;
            return;
        }
        // Рекурсивно обходим дочерние узлы
        for (const key in node) {
            if (key !== 'parent' && node[key] && typeof node[key] === 'object') {
                if (Array.isArray(node[key])) {
                    node[key].forEach((child) => traverse(child));
                } else {
                    traverse(node[key]);
                }
            }
        }
    }
    traverse(node);
    return hasState;
}

/**
 * Подсчитывает методы класса, исключая lifecycle методы, render и constructor
 */
function countNonLifecycleMethods(classBody) {
    let count = 0;
    if (!classBody || !classBody.body || !Array.isArray(classBody.body)) {
        return 0;
    }
    classBody.body.forEach((member) => {
        if (member.type === 'MethodDefinition') {
            const methodName = member.key && member.key.name;
            if (methodName === 'render' || methodName === 'constructor') {
                return;
            }
            if (!isLifecycleMethod(methodName)) {
                count++;
            }
        } else if (
            member.type === 'Property' ||
            member.type === 'ClassProperty' ||
            member.type === 'PropertyDefinition'
        ) {
            const methodName = member.key && member.key.name;
            if (methodName === 'render') {
                return;
            }
            if (!isLifecycleMethod(methodName)) {
                if (
                    member.value &&
                    (member.value.type === 'ArrowFunctionExpression' || member.value.type === 'FunctionExpression')
                ) {
                    count++;
                }
            }
        }
    });

    return count;
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
        type: 'suggestion',
        docs: {
            description:
                'Определяет классовые компоненты для конвертации в функциональные и рекомендует запустить codemod',
            category: 'Best Practices',
            recommended: false,
        },
        fixable: null,
        schema: [],
        messages: {
            shouldConvertToFunctional:
                'Классовый компонент "{{componentName}}" подходит для конвертации в функциональный. ' +
                'Запустите: npm run codemod:classToFC -- {{filePath}}',
        },
    },

    create(context) {
        return {
            ClassDeclaration(node) {
                if (!isReactComponentClass(node)) {
                    return;
                }
                const componentName = node.id ? node.id.name : 'Unknown';
                // Проверяем использование this.state
                if (hasStateUsage(node)) {
                    return;
                }
                const methodCount = countNonLifecycleMethods(node.body);
                if (methodCount >= 1 && methodCount <= 4) {
                    const filePath = getRelativeFilePath(context);
                    context.report({
                        node: node.id || node,
                        messageId: 'shouldConvertToFunctional',
                        data: {
                            componentName,
                            filePath,
                        },
                    });
                }
            },

            ClassExpression(node) {
                if (!isReactComponentClass(node)) {
                    return;
                }
                let componentName = 'Unknown';
                const { parent } = node;
                if (parent && parent.type === 'VariableDeclarator' && parent.id) {
                    componentName = parent.id.name;
                } else if (parent && parent.type === 'ExportDefaultDeclaration') {
                    componentName = 'DefaultExport';
                }
                // Проверяем использование this.state
                if (hasStateUsage(node)) {
                    return;
                }
                const methodCount = countNonLifecycleMethods(node.body);
                if (methodCount >= 1 && methodCount <= 4) {
                    const filePath = getRelativeFilePath(context);
                    context.report({
                        node: node.parent && node.parent.id ? node.parent.id : node,
                        messageId: 'shouldConvertToFunctional',
                        data: {
                            componentName,
                            filePath,
                        },
                    });
                }
            },
        };
    },
};
