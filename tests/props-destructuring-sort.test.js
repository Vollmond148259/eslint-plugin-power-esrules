const { RuleTester } = require("eslint");
const rule = require("../lib/rules/props-destructuring-sort");

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
});

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
