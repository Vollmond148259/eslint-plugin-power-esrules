/**
 * Rule: formatting-blank-lines
 *
 * Проверяет расстановку пустых строк согласно соглашению:
 *
 * Добавляем пустую строку:
 * - После последнего импорта
 * - Между стилизованными styled-компонентами
 * - Перед объявлениями функций внутри react-компонента
 * - Перед return обозначающим начало блока рендера в react-компоненте
 * - Перед экспортом по дефолту
 *
 * Не добавляем пустую строку:
 * - Внутри тел функций или методов react-компонента
 * - Внутри стилизованного styled-компонента
 * - Внутри блока рендера react-компонента
 * - Между объявлениями переменных, констант, вызовами функций
 *   (только если их много или необходимо логическое разделение)
 */

/**
 * Проверяет, является ли узел styled-компонентом
 */
function isStyledComponent(node) {
    if (node.type !== 'VariableDeclarator' || !node.init) {
        return false;
    }
    const { init } = node;
    if (init.type === 'CallExpression') {
        const { callee } = init;
        if (callee.type === 'MemberExpression' && callee.object.name === 'styled') {
            return true;
        }
        if (callee.type === 'CallExpression' && callee.callee && callee.callee.name === 'styled') {
            return true;
        }
    }
    if (init.type === 'CallExpression' && init.callee.name === 'styled') {
        return true;
    }
    return false;
}

/**
 * Проверяет, является ли узел верхнего уровня объявлением функции
 */
function isTopLevelFunction(node) {
    if (node.type === 'FunctionDeclaration') {
        return true;
    }
    if (node.type === 'VariableDeclaration') {
        return node.declarations.some(
            (decl) =>
                decl.init && (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression')
        );
    }
    return false;
}

/**
 * Проверяет, является ли узел верхнего уровня styled-компонентом
 */
function isTopLevelStyledComponent(node) {
    if (node.type === 'VariableDeclaration') {
        return node.declarations.some((decl) => isStyledComponent(decl));
    }
    return false;
}

/**
 * Проверяет, является ли statement объявлением функции (внутри React-компонента)
 */
function isFunctionStatementInsideReactComponent(stmt) {
    if (stmt.type === 'FunctionDeclaration') {
        return true;
    }
    if (stmt.type === 'VariableDeclaration') {
        return stmt.declarations.some((decl) => {
            if (!decl.init) {
                return false;
            }
            if (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression') {
                return true;
            }
            if (decl.init.type === 'CallExpression') {
                const { callee } = decl.init;
                const hookName = callee.name || (callee.type === 'MemberExpression' && callee.property.name);
                if (hookName === 'useCallback' || hookName === 'useMemo') {
                    const firstArg = decl.init.arguments && decl.init.arguments[0];
                    if (
                        firstArg &&
                        (firstArg.type === 'ArrowFunctionExpression' || firstArg.type === 'FunctionExpression')
                    ) {
                        return true;
                    }
                }
            }
            return false;
        });
    }
    if (stmt.type === 'ExpressionStatement' && stmt.expression && stmt.expression.type === 'CallExpression') {
        const { callee } = stmt.expression;
        const hookName = callee.name || (callee.type === 'MemberExpression' && callee.property.name);
        if (hookName === 'useEffect' || hookName === 'useLayoutEffect') {
            const firstArg = stmt.expression.arguments && stmt.expression.arguments[0];
            if (firstArg && (firstArg.type === 'ArrowFunctionExpression' || firstArg.type === 'FunctionExpression')) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Получает количество пустых строк между двумя токенами
 */
function getBlankLinesBetween(sourceCode, token1, token2) {
    if (!token1 || !token2) {
        return 0;
    }
    const token1Line = token1.loc.end.line;
    const token2Line = token2.loc.start.line;
    if (token2Line <= token1Line) {
        return 0;
    }
    let blankLines = 0;
    const lines = sourceCode.text.split(/\r?\n/);
    for (let line = token1Line + 1; line < token2Line; line++) {
        const lineIndex = line - 1;
        if (lineIndex >= 0 && lineIndex < lines.length) {
            const lineText = lines[lineIndex];
            if (lineText.trim() === '') {
                blankLines++;
            } else {
                break;
            }
        }
    }
    return blankLines;
}

/**
 * Получает количество пустых строк перед узлом
 */
function getBlankLinesBefore(sourceCode, node) {
    const tokenBefore = sourceCode.getTokenBefore(node, { includeComments: false });
    if (!tokenBefore) {
        return 0;
    }
    const firstToken = sourceCode.getFirstToken(node);
    return getBlankLinesBetween(sourceCode, tokenBefore, firstToken);
}

module.exports = {
    meta: {
        type: 'layout',
        docs: {
            description: 'Проверяет расстановку пустых строк согласно соглашению форматирования',
            category: 'Stylistic Issues',
            recommended: false,
        },
        fixable: 'whitespace',
        schema: [],
        messages: {
            requireBlankLine: 'Требуется пустая строка перед {{nodeType}}',
            disallowBlankLine: 'Не должно быть пустой строки перед {{nodeType}}',
            requireBlankLineAfterImports: 'Требуется пустая строка после последнего импорта',
            requireBlankLineBetweenStyled: 'Требуется пустая строка между styled-компонентами',
            requireBlankLineAfterLastStyled: 'Требуется пустая строка после последнего styled-компонента',
            disallowBlankLineInFunction: 'Не должно быть пустой строки внутри тела функции',
            requireBlankLineBeforeFunction: 'Требуется пустая строка перед объявлением функции внутри React-компонента',
        },
    },

    create(context) {
        const sourceCode = context.getSourceCode();
        const functionStack = [];
        return {
            Program(node) {
                const { body } = node;
                let lastImportNode = null;
                let lastStyledNode = null;
                let lastStyledComponentInFile = null;
                for (let i = 0; i < body.length; i++) {
                    const current = body[i];
                    if (lastImportNode && current.type !== 'ImportDeclaration') {
                        const blankLines = getBlankLinesBefore(sourceCode, current);
                        if (blankLines === 0) {
                            context.report({
                                node: current,
                                messageId: 'requireBlankLineAfterImports',
                                fix(fixer) {
                                    return fixer.insertTextBefore(sourceCode.getFirstToken(current), '\n');
                                },
                            });
                        }
                        lastImportNode = null;
                    }
                    if (isTopLevelStyledComponent(current)) {
                        if (lastStyledNode) {
                            const blankLines = getBlankLinesBefore(sourceCode, current);
                            if (blankLines === 0) {
                                context.report({
                                    node: current,
                                    messageId: 'requireBlankLineBetweenStyled',
                                    fix(fixer) {
                                        return fixer.insertTextBefore(sourceCode.getFirstToken(current), '\n');
                                    },
                                });
                            }
                        }
                        lastStyledNode = current;
                        lastStyledComponentInFile = current;
                        continue;
                    }
                    if (isTopLevelFunction(current)) {
                        if (i > 0) {
                            const prevNode = body[i - 1];
                            const shouldHaveBlankLine =
                                prevNode.type !== 'FunctionDeclaration' &&
                                !isTopLevelFunction(prevNode) &&
                                !isTopLevelStyledComponent(prevNode);
                            if (shouldHaveBlankLine) {
                                const blankLines = getBlankLinesBefore(sourceCode, current);
                                if (blankLines === 0) {
                                    context.report({
                                        node: current,
                                        messageId: 'requireBlankLine',
                                        data: { nodeType: 'объявлением функции' },
                                        fix(fixer) {
                                            return fixer.insertTextBefore(sourceCode.getFirstToken(current), '\n');
                                        },
                                    });
                                }
                            }
                        }
                        lastStyledNode = null;
                        continue;
                    }
                    if (current.type === 'ExportDefaultDeclaration') {
                        const blankLines = getBlankLinesBefore(sourceCode, current);
                        if (blankLines === 0) {
                            context.report({
                                node: current,
                                messageId: 'requireBlankLine',
                                data: { nodeType: 'экспортом по дефолту' },
                                fix(fixer) {
                                    return fixer.insertTextBefore(sourceCode.getFirstToken(current), '\n');
                                },
                            });
                        }
                        lastStyledNode = null;
                        continue;
                    }
                    lastStyledNode = null;
                }
                if (lastStyledComponentInFile) {
                    const lastStyledIndex = body.indexOf(lastStyledComponentInFile);
                    if (lastStyledIndex >= 0 && lastStyledIndex < body.length - 1) {
                        const nextNode = body[lastStyledIndex + 1];
                        const blankLines = getBlankLinesBefore(sourceCode, nextNode);
                        if (blankLines === 0) {
                            context.report({
                                node: nextNode,
                                messageId: 'requireBlankLineAfterLastStyled',
                                fix(fixer) {
                                    return fixer.insertTextBefore(sourceCode.getFirstToken(nextNode), '\n');
                                },
                            });
                        }
                    }
                }
            },

            FunctionDeclaration(node) {
                if (node.id && /^[A-Z]/.test(node.id.name)) {
                    functionStack.push({ type: 'declaration', node, name: node.id.name });
                }
            },
            'FunctionDeclaration:exit': function (node) {
                if (functionStack.length > 0) {
                    const top = functionStack[functionStack.length - 1];
                    if (top.type === 'declaration' && top.node === node) {
                        functionStack.pop();
                    }
                }
            },

            ArrowFunctionExpression(node) {
                const { parent } = node;
                if (parent && parent.type === 'VariableDeclarator' && parent.id) {
                    if (/^[A-Z]/.test(parent.id.name)) {
                        functionStack.push({ type: 'arrow', node, name: parent.id.name });
                    }
                }
            },

            'ArrowFunctionExpression:exit': function (node) {
                if (functionStack.length > 0) {
                    const top = functionStack[functionStack.length - 1];
                    if (top.type === 'arrow' && top.node === node) {
                        functionStack.pop();
                    }
                }
            },

            FunctionExpression(node) {
                const { parent } = node;
                if (parent && parent.type === 'VariableDeclarator' && parent.id) {
                    if (/^[A-Z]/.test(parent.id.name)) {
                        functionStack.push({ type: 'expression', node, name: parent.id.name });
                    }
                }
            },

            'FunctionExpression:exit': function (node) {
                if (functionStack.length > 0) {
                    const top = functionStack[functionStack.length - 1];
                    if (top.type === 'expression' && top.node === node) {
                        functionStack.pop();
                    }
                }
            },

            ReturnStatement(node) {
                let isInComponent = false;
                for (let i = functionStack.length - 1; i >= 0; i--) {
                    const func = functionStack[i];
                    if (func.type === 'declaration' || func.type === 'arrow' || func.type === 'expression') {
                        isInComponent = true;
                        break;
                    }
                }
                if (isInComponent) {
                    const { parent } = node;
                    if (parent && parent.body && Array.isArray(parent.body)) {
                        const returnIndex = parent.body.indexOf(node);
                        if (returnIndex > 0) {
                            const blankLines = getBlankLinesBefore(sourceCode, node);
                            if (blankLines === 0) {
                                context.report({
                                    node,
                                    messageId: 'requireBlankLine',
                                    data: { nodeType: 'return' },
                                    fix(fixer) {
                                        return fixer.insertTextBefore(sourceCode.getFirstToken(node), '\n');
                                    },
                                });
                            }
                        }
                    }
                }
            },

            BlockStatement(node) {
                const { parent } = node;
                if (
                    parent.type !== 'FunctionDeclaration' &&
                    parent.type !== 'ArrowFunctionExpression' &&
                    parent.type !== 'FunctionExpression'
                ) {
                    return;
                }
                let isComponent = false;
                if (parent.type === 'FunctionDeclaration') {
                    isComponent = parent.id && /^[A-Z]/.test(parent.id.name);
                } else if (parent.parent && parent.parent.type === 'VariableDeclarator') {
                    const varDecl = parent.parent;
                    isComponent = varDecl.id && /^[A-Z]/.test(varDecl.id.name);
                }
                if (!isComponent) {
                    return;
                }
                const statements = node.body;
                for (let i = 1; i < statements.length; i++) {
                    const prevStmt = statements[i - 1];
                    const currentStmt = statements[i];
                    if (currentStmt.type === 'ReturnStatement') {
                        continue;
                    }
                    if (isFunctionStatementInsideReactComponent(currentStmt)) {
                        const blankLines = getBlankLinesBetween(
                            sourceCode,
                            sourceCode.getLastToken(prevStmt),
                            sourceCode.getFirstToken(currentStmt)
                        );
                        if (blankLines === 0) {
                            context.report({
                                node: currentStmt,
                                messageId: 'requireBlankLineBeforeFunction',
                                fix(fixer) {
                                    return fixer.insertTextBefore(sourceCode.getFirstToken(currentStmt), '\n');
                                },
                            });
                        }
                        continue;
                    }
                    const blankLines = getBlankLinesBetween(
                        sourceCode,
                        sourceCode.getLastToken(prevStmt),
                        sourceCode.getFirstToken(currentStmt)
                    );
                    if (blankLines > 0) {
                        context.report({
                            node: currentStmt,
                            messageId: 'disallowBlankLineInFunction',
                            fix(fixer) {
                                const prevToken = sourceCode.getLastToken(prevStmt);
                                const currentToken = sourceCode.getFirstToken(currentStmt);
                                const text = sourceCode.getText().slice(prevToken.range[1], currentToken.range[0]);
                                const fixedText = text.replace(/\n\s*\n/g, '\n');
                                return fixer.replaceTextRange([prevToken.range[1], currentToken.range[0]], fixedText);
                            },
                        });
                    }
                }
            },
        };
    },
};
