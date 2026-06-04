const { RuleTester } = require("eslint");
const rule = require("../lib/rules/import-sorting");

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
});

ruleTester.run("import-sorting", rule, {
  valid: [
    {
      name: "correctly sorted imports with blank lines",
      code: `
        import React from 'react';
        import _ from 'lodash';

        import { fetchData } from 'api';
        import { calculate } from 'utils';

        import Button from 'components/Button';
        import Header from 'components/Header';

        import helper from './helper';
      `,
    },
    {
      name: "single external import",
      code: `
        import React from 'react';
      `,
    },
    {
      name: "external and internal imports only",
      code: `
        import React from 'react';

        import { fetchData } from 'api';
      `,
    },
    {
      name: "component import after internal",
      code: `
        import React from 'react';

        import { fetchData } from 'api';

        import Button from 'components/Button';
      `,
    },
    {
      name: "relative imports last",
      code: `
        import React from 'react';

        import { fetchData } from 'api';

        import Button from 'components/Button';

        import util from '../util';
        import helper from './helper';
      `,
    },
    {
      name: "React context import is inner import",
      code: `
        import { fetchData } from 'api';
        import {PageContext} from 'pages/page';
        
        import ComponentA from 'components/ComponentA';
        
      `,
    },
  ],

  invalid: [
    {
      name: "external import after internal",
      code: `
        import { fetchData } from 'api';
        import React from 'react';
      `,
      output: `
        import React from 'react';

        import { fetchData } from 'api';
      `,
      errors: [{ messageId: "incorrectOrder" }],
    },
    {
      name: "component import before internal",
      code: `
        import Button from 'components/Button';
        import { fetchData } from 'api';
      `,
      output: `
        import { fetchData } from 'api';

        import Button from 'components/Button';
      `,
      errors: [{ messageId: "incorrectOrder" }],
    },
    {
      name: "missing blank line between groups",
      code: `
        import React from 'react';
        import _ from 'lodash';
        import { fetchData } from 'api';
      `,
      output: `
        import React from 'react';
        import _ from 'lodash';

        import { fetchData } from 'api';
      `,
      errors: [{ messageId: "missingBlankLine" }],
    },
    {
      name: "relative import not last",
      code: `
        import helper from './helper';
        import { fetchData } from 'api';
      `,
      output: `
        import { fetchData } from 'api';

        import helper from './helper';
      `,
      errors: [{ messageId: "incorrectOrder" }],
    },
    {
      name: "multiple issues at once",
      code: `
        import Button from 'components/Button';
        import React from 'react';
        import { fetchData } from 'api';
        import helper from './helper';
      `,
      output: `
        import React from 'react';

        import { fetchData } from 'api';

        import Button from 'components/Button';

        import helper from './helper';
      `,
      errors: [
        { messageId: "incorrectOrder" },
        { messageId: "missingBlankLine" },
      ],
    },
  ],
});

console.log("OK");
