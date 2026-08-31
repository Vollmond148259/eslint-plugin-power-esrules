const espree = require("espree");
const { RuleTester } = require("eslint");
const rule = require("../lib/rules/props-destructuring-sort");

const defaultParserOptions = {
  ecmaVersion: 2022,
  sourceType: "module",
  ecmaFeatures: { jsx: true },
};

const ruleTester = new RuleTester({
  parserOptions: defaultParserOptions,
});

function rewriteRestElementsToExperimentalRestProperty(node) {
  if (!node || typeof node !== "object") {
    return;
  }
  if (node.type === "RestElement") {
    node.type = "ExperimentalRestProperty";
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
        rewriteRestElementsToExperimentalRestProperty(item);
      }
    } else if (typeof value === "object" && value.type) {
      rewriteRestElementsToExperimentalRestProperty(value);
    }
  }
}

const babelLegacyRestParser = {
  parse(code, options) {
    const ast = espree.parse(code, {
      ecmaVersion: options.ecmaVersion,
      sourceType: options.sourceType,
      loc: true,
      range: true,
      tokens: true,
      ecmaFeatures: options.ecmaFeatures,
    });
    rewriteRestElementsToExperimentalRestProperty(ast);
    return ast;
  },
};

ruleTester.run("props-destructuring-sort", rule, {
  valid: [
    {
      name: "sorted destructuring from props in functional component",
      code: `
      function MyComponent(props) {
        const { alpha, beta } = props;
        return <div>{alpha}{beta}</div>;
      }
    `,
    },
    {
      name: "single property from props",
      code: `
      function MyComponent(props) {
        const { only } = props;
        return <div>{only}</div>;
      }
    `,
    },
    {
      name: "unsorted props outside React component",
      code: `
      function util(props) {
        const { z, a } = props;
        return z + a;
      }
    `,
    },
    {
      name: "sorted params in arrow component",
      code: `
      const MyComponent = ({ alpha, beta }) => <div>{alpha}{beta}</div>;
    `,
    },
    {
      name: "sorted this.props in class component",
      code: `
      class MyComponent extends React.Component {
        render() {
          const { alpha, beta } = this.props;
          return <div>{alpha}{beta}</div>;
        }
      }
    `,
    },
    {
      name: "rest element last when already sorted",
      code: `
      function MyComponent(props) {
        const { alpha, beta, ...rest } = props;
        return <div>{alpha}</div>;
      }
    `,
    },
  ],

  invalid: [
    {
      name: "const from props in functional component",
      code: `
      function MyComponent(props) {
        const { zebra, alpha } = props;
        return <div>{zebra}{alpha}</div>;
      }
    `,
      output: `
      function MyComponent(props) {
        const { alpha, zebra } = props;
        return <div>{zebra}{alpha}</div>;
      }
    `,
      errors: [{ messageId: "incorrectOrder" }],
    },
    {
      name: "destructured params in function declaration",
      code: `
      function MyComponent({ zebra, alpha }) {
        return <div>{zebra}{alpha}</div>;
      }
    `,
      output: `
      function MyComponent({ alpha, zebra }) {
        return <div>{zebra}{alpha}</div>;
      }
    `,
      errors: [{ messageId: "incorrectOrder" }],
    },
    {
      name: "destructured params in arrow component with JSX",
      code: `
      const MyComponent = ({ zebra, alpha }) => <div>{zebra}{alpha}</div>;
    `,
      output: `
      const MyComponent = ({ alpha, zebra }) => <div>{zebra}{alpha}</div>;
    `,
      errors: [{ messageId: "incorrectOrder" }],
    },
    {
      name: "this.props in class component",
      code: `
      class MyComponent extends Component {
        render() {
          const { zebra, alpha } = this.props;
          return <div>{zebra}{alpha}</div>;
        }
      }
    `,
      output: `
      class MyComponent extends Component {
        render() {
          const { alpha, zebra } = this.props;
          return <div>{zebra}{alpha}</div>;
        }
      }
    `,
      errors: [{ messageId: "incorrectOrder" }],
    },
    {
      name: "rest stays last after sort",
      code: `
      function MyComponent(props) {
        const { zebra, alpha, ...rest } = props;
        return <div>{zebra}</div>;
      }
    `,
      output: `
      function MyComponent(props) {
        const { alpha, zebra, ...rest } = props;
        return <div>{zebra}</div>;
      }
    `,
      errors: [{ messageId: "incorrectOrder" }],
    },
    {
      name: "rest stays last when sorting three props",
      code: `
      function MyComponent(props) {
        const { c, b, a, ...d } = props;
        return <div>{a}</div>;
      }
    `,
      output: `
      function MyComponent(props) {
        const { a, b, c, ...d } = props;
        return <div>{a}</div>;
      }
    `,
      errors: [{ messageId: "incorrectOrder" }],
    },
    {
      name: "rest stays last with babel legacy ExperimentalRestProperty AST",
      parser: babelLegacyRestParser,
      code: `
      function MyComponent(props) {
        const { c, b, a, ...d } = props;
        return <div>{a}</div>;
      }
    `,
      output: `
      function MyComponent(props) {
        const { a, b, c, ...d } = props;
        return <div>{a}</div>;
      }
    `,
      errors: [{ messageId: "incorrectOrder" }],
    },
    {
      name: "rest stays last in destructured params",
      code: `
      function MyComponent({ c, b, a, ...d }) {
        return <div>{a}</div>;
      }
    `,
      output: `
      function MyComponent({ a, b, c, ...d }) {
        return <div>{a}</div>;
      }
    `,
      errors: [{ messageId: "incorrectOrder" }],
    },
    {
      name: "memo-wrapped component params",
      code: `
      const MyComponent = memo(({ zebra, alpha }) => <div>{zebra}</div>);
    `,
      output: `
      const MyComponent = memo(({ alpha, zebra }) => <div>{zebra}</div>);
    `,
      errors: [{ messageId: "incorrectOrder" }],
    },
  ],
});

console.log("OK");
