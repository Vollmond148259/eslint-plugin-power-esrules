const { RuleTester } = require("eslint");
const rule = require("../lib/rules/require-data-testid");

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
});

ruleTester.run("require-data-testid", rule, {
  valid: [
    {
      name: "function declaration with data-testid",
      code: `
        function MyComponent() {
          return <div data-testid="my-component">Hello</div>;
        }
      `,
    },
    {
      name: "class component with data-testid",
      code: `
      class MyComponent extends PureComponent {
        render() {
          return <div data-testid="my-component">Hello</div>;
        }
      }
      `,
    },
    {
      name: "arrow component with dataTestID",
      code: `
        const MyComponent = () => <section dataTestID="section">Hi</section>;
      `,
    },
    {
      name: "memo-wrapped component with data-testid",
      code: `
        const MyComponent = memo(() => <div data-testid="memo">Memo</div>);
      `,
    },
    {
      name: "forwardRef component with data-testid",
      code: `
        const MyComponent = forwardRef((props, ref) => <div ref={ref} data-testid="ref">Ref</div>);
      `,
    },
    {
      name: "nested JSX inside Fragment",
      code: `
        const MyComponent = () => (
          <>
            <div data-testid="inside">Hello</div>
          </>
        );
      `,
    },
    {
      name: "non-PascalCase function is ignored",
      code: `
        function utilFunction() {
          return <div>Hello</div>;
        }
      `,
    },
  ],

  invalid: [
    {
      name: "function declaration without data-testid",
      code: `
        function MyComponent() {
          return <div>Hello</div>;
        }
      `,
      errors: [{ messageId: "missingDataTestId" }],
    },
    {
      name: "class component without data-testid",
      code: `
      class MyComponent extends PureComponent {
        render() {
          return <div>Hello</div>;
        }
      }
      `,
      errors: [{ messageId: "missingDataTestId" }],
    },
    {
      name: "arrow component missing data-testid",
      code: `
        const MyComponent = () => <section>Hi</section>;
      `,
      errors: [{ messageId: "missingDataTestId" }],
    },
    {
      name: "memo-wrapped component missing data-testid",
      code: `
        const MyComponent = memo(() => <div>Memo</div>);
      `,
      errors: [{ messageId: "missingDataTestId" }],
    },
    {
      name: "forwardRef component missing data-testid",
      code: `
        const MyComponent = forwardRef((props, ref) => <div ref={ref}>Ref</div>);
      `,
      errors: [{ messageId: "missingDataTestId" }],
    },
    {
      name: "nested JSX in Fragment missing data-testid",
      code: `
        const MyComponent = () => (
          <>
            <div>Hello</div>
          </>
        );
      `,
      errors: [{ messageId: "missingDataTestId" }],
    },
    {
      name: "HOC wrapped component without data-testid",
      code: `
        const MyComponent = observer(() => <div>Hello</div>);
      `,
      errors: [{ messageId: "missingDataTestId" }],
    },
  ],
});

console.log("OK");
