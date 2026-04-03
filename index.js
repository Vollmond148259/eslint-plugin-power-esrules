module.exports = {
  rules: {
    "formatting-blank-lines": require("./lib/rules/formatting-blank-lines"),
    "no-default-props": require("./lib/rules/no-default-props"),
    "no-inline-callbacks-in-jsx": require("./lib/rules/no-inline-callbacks-in-jsx"),
    "id-naming-convention": require("./lib/rules/id-naming-convention"),
    "use-state-naming": require("./lib/rules/use-state-naming"),
    "class-to-functional": require("./lib/rules/class-to-functional"),
    "import-sorting": require("./lib/rules/import-sorting"),
    "require-data-testid": require("./lib/rules/require-data-testid"),
  },
  configs: {
    recommended: {
      plugins: ["power-esrules"],
      rules: {
        "power-esrules/formatting-blank-lines": "error",
        "power-esrules/no-default-props": "error",
        "power-esrules/no-inline-callbacks-in-jsx": "error",
        "power-esrules/id-naming-convention": "warn",
        "power-esrules/use-state-naming": "warn",
        "power-esrules/class-to-functional": "error",
        "power-esrules/import-sorting": "error",
        "power-esrules/require-data-testid": "warn",
      },
    },
  },
};
