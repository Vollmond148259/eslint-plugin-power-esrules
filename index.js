module.exports = {
    rules: {
        'formatting-blank-lines': require('./lib/rules/formatting-blank-lines'),
        'no-default-props': require('./lib/rules/no-default-props'),
        'no-inline-callbacks-in-jsx': require('./lib/rules/no-inline-callbacks-in-jsx'),
        'id-naming-convention': require('./lib/rules/id-naming-convention'),
        'use-state-naming': require('./lib/rules/use-state-naming'),
        'class-to-functional': require('./lib/rules/class-to-functional'),
        'import-sorting': require('./lib/rules/import-sorting'),
    },
    configs: {
        recommended: {
            plugins: ['rules'],
            rules: {
                'rules/formatting-blank-lines': 'error',
                'rules/no-default-props': 'error',
                'rules/no-inline-callbacks-in-jsx': 'error',
                'rules/id-naming-convention': 'error',
                'rules/use-state-naming': 'error',
                'rules/class-to-functional': 'error',
                'rules/import-sorting': 'error',
            },
        },
    },
};
