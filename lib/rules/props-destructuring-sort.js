/**
 * Rule: props-destructuring-sort
 *
 * Сортирует деструктурированные props React-компонентов по алфавиту:
 * - const { ... } = props (внутри функционального React-компонента)
 * - const { ... } = this.props (внутри классового React-компонента)
 * - function Component({ ... }) и аналогичные стрелочные/function expression
 */

const REACT_WRAPPER_CALLEES = new Set(["memo", "forwardRef", "lazy"]);

const NESTED_FUNCTION_TYPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);

function isPropsInitializer(node) {
  if (!node) {
    return false;
  }
  if (node.type === "Identifier" && node.name === "props") {
    return true;
  }
  if (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.object.type === "ThisExpression" &&
    node.property.type === "Identifier" &&
    node.property.name === "props"
  ) {
    return true;
  }
  return false;
}

function isReactComponentName(name) {
  if (!name || typeof name !== "string") {
    return false;
  }
  return /^[A-Z]/.test(name);
}

function isReactComponentClass(node) {
  if (
    !node ||
    (node.type !== "ClassDeclaration" && node.type !== "ClassExpression")
  ) {
    return false;
  }
  if (!node.superClass) {
    return false;
  }
  const { superClass } = node;
  if (superClass.type === "Identifier") {
    return (
      superClass.name === "Component" || superClass.name === "PureComponent"
    );
  }
  if (
    superClass.type === "MemberExpression" &&
    superClass.object &&
    superClass.object.type === "Identifier" &&
    superClass.object.name === "React" &&
    superClass.property &&
    superClass.property.type === "Identifier" &&
    (superClass.property.name === "Component" ||
      superClass.property.name === "PureComponent")
  ) {
    return true;
  }
  return false;
}

function getCalleeName(callee) {
  if (!callee) {
    return null;
  }
  if (callee.type === "Identifier") {
    return callee.name;
  }
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier"
  ) {
    return callee.property.name;
  }
  return null;
}

function isWrappedByReactWrapper(funcNode) {
  let current = funcNode.parent;
  while (current) {
    if (current.type === "CallExpression") {
      const calleeName = getCalleeName(current.callee);
      if (calleeName && REACT_WRAPPER_CALLEES.has(calleeName)) {
        return current.arguments[0] === funcNode;
      }
    }
    current = current.parent;
  }
  return false;
}

function getReactComponentName(funcNode) {
  if (funcNode.type === "FunctionDeclaration" && funcNode.id) {
    return funcNode.id.name;
  }
  const { parent } = funcNode;
  if (parent?.type === "VariableDeclarator" && parent.id?.type === "Identifier") {
    return parent.id.name;
  }
  if (parent?.type === "AssignmentExpression" && parent.left?.type === "Identifier") {
    return parent.left.name;
  }
  return null;
}

function nodeContainsJSX(node) {
  if (!node || typeof node !== "object") {
    return false;
  }
  if (node.type === "JSXElement" || node.type === "JSXFragment") {
    return true;
  }
  for (const key of Object.keys(node)) {
    if (key === "parent") {
      continue;
    }
    const value = node[key];
    if (!value) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!item || typeof item !== "object" || !item.type) {
          continue;
        }
        if (NESTED_FUNCTION_TYPES.has(item.type)) {
          continue;
        }
        if (nodeContainsJSX(item)) {
          return true;
        }
      }
    } else if (typeof value === "object" && value.type) {
      if (NESTED_FUNCTION_TYPES.has(value.type)) {
        continue;
      }
      if (nodeContainsJSX(value)) {
        return true;
      }
    }
  }
  return false;
}

function functionBodyContainsJSX(funcNode) {
  const { body } = funcNode;
  if (!body) {
    return false;
  }
  if (body.type === "JSXElement" || body.type === "JSXFragment") {
    return true;
  }
  return nodeContainsJSX(body);
}

function isReactComponentFunction(funcNode) {
  if (!funcNode || !NESTED_FUNCTION_TYPES.has(funcNode.type)) {
    return false;
  }
  if (isWrappedByReactWrapper(funcNode)) {
    return true;
  }
  const componentName = getReactComponentName(funcNode);
  if (isReactComponentName(componentName)) {
    return true;
  }
  return functionBodyContainsJSX(funcNode);
}

function getEnclosingFunction(node) {
  let current = node.parent;
  while (current) {
    if (NESTED_FUNCTION_TYPES.has(current.type)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function isInsideReactClass(node) {
  let current = node.parent;
  while (current) {
    if (current.type === "ClassDeclaration" || current.type === "ClassExpression") {
      return isReactComponentClass(current);
    }
    current = current.parent;
  }
  return false;
}

function isInsideReactComponentFunction(node) {
  const enclosingFunction = getEnclosingFunction(node);
  if (!enclosingFunction) {
    return false;
  }
  return isReactComponentFunction(enclosingFunction);
}

function getPropertySortKey(prop) {
  if (prop.type === "RestElement") {
    return null;
  }
  if (prop.type === "Property") {
    if (prop.key.type === "Identifier" && !prop.computed) {
      return prop.key.name;
    }
    if (prop.key.type === "Literal") {
      return String(prop.key.value);
    }
  }
  return "";
}

function partitionProperties(properties) {
  const regular = [];
  const rest = [];
  for (const prop of properties) {
    if (prop.type === "RestElement") {
      rest.push(prop);
    } else {
      regular.push(prop);
    }
  }
  return { regular, rest };
}

function isAlphabeticallySorted(regular) {
  for (let i = 1; i < regular.length; i += 1) {
    const prevKey = getPropertySortKey(regular[i - 1]);
    const currentKey = getPropertySortKey(regular[i]);
    if (prevKey.localeCompare(currentKey) > 0) {
      return false;
    }
  }
  return true;
}

function sortObjectPatternProperties(properties) {
  const { regular, rest } = partitionProperties(properties);
  const sortedRegular = [...regular].sort((a, b) =>
    getPropertySortKey(a).localeCompare(getPropertySortKey(b)),
  );
  return [...sortedRegular, ...rest];
}

function getPropertiesSeparator(sourceCode, properties) {
  if (properties.length < 2) {
    return ", ";
  }
  const comma = sourceCode.getTokenAfter(properties[0], {
    filter: (token) => token.value === ",",
  });
  if (!comma) {
    return ", ";
  }
  return sourceCode.text.slice(comma.range[0], properties[1].range[0]);
}

function buildSortedObjectPatternText(patternNode, sortedProperties, sourceCode) {
  const openBrace = sourceCode.getFirstToken(patternNode);
  const closeBrace = sourceCode.getLastToken(patternNode);
  const originalProperties = patternNode.properties;
  const separator = getPropertiesSeparator(sourceCode, originalProperties);

  let innerText = "";
  for (let i = 0; i < sortedProperties.length; i += 1) {
    innerText += sourceCode.getText(sortedProperties[i]);
    if (i < sortedProperties.length - 1) {
      innerText += separator;
    }
  }

  const afterOpenBrace = sourceCode.text.slice(
    openBrace.range[1],
    originalProperties[0].range[0],
  );
  const lastOriginal = originalProperties[originalProperties.length - 1];
  const beforeCloseBrace = sourceCode.text.slice(
    lastOriginal.range[1],
    closeBrace.range[0],
  );

  return `{${afterOpenBrace}${innerText}${beforeCloseBrace}}`;
}

function checkObjectPattern(patternNode, context) {
  const { properties } = patternNode;
  if (!properties || properties.length < 2) {
    return;
  }

  const { regular } = partitionProperties(properties);
  if (regular.length < 2 || isAlphabeticallySorted(regular)) {
    return;
  }

  const sourceCode = context.getSourceCode();
  context.report({
    node: patternNode,
    messageId: "incorrectOrder",
    fix(fixer) {
      const sortedProperties = sortObjectPatternProperties(properties);
      const sortedText = buildSortedObjectPatternText(
        patternNode,
        sortedProperties,
        sourceCode,
      );
      return fixer.replaceText(patternNode, sortedText);
    },
  });
}

function checkFunctionParams(funcNode, context) {
  if (!isReactComponentFunction(funcNode)) {
    return;
  }
  const { params } = funcNode;
  if (!params || params.length === 0) {
    return;
  }
  const firstParam = params[0];
  if (firstParam.type === "ObjectPattern") {
    checkObjectPattern(firstParam, context);
  }
}

module.exports = {
  meta: {
    type: "layout",
    docs: {
      description:
        "Сортирует деструктурированные props React-компонентов по алфавиту",
      category: "Stylistic Issues",
      recommended: false,
    },
    fixable: "code",
    schema: [],
    messages: {
      incorrectOrder:
        "Деструктурированные props должны быть отсортированы по алфавиту",
    },
  },

  create(context) {
    return {
      VariableDeclarator(node) {
        if (node.id.type !== "ObjectPattern" || !isPropsInitializer(node.init)) {
          return;
        }
        const isThisProps =
          node.init.type === "MemberExpression" &&
          node.init.object.type === "ThisExpression";
        if (isThisProps) {
          if (!isInsideReactClass(node)) {
            return;
          }
        } else if (!isInsideReactComponentFunction(node)) {
          return;
        }
        checkObjectPattern(node.id, context);
      },

      FunctionDeclaration(node) {
        checkFunctionParams(node, context);
      },

      FunctionExpression(node) {
        checkFunctionParams(node, context);
      },

      ArrowFunctionExpression(node) {
        checkFunctionParams(node, context);
      },
    };
  },
};
