// @ts-check
import configs from '@yeoman/eslint';
import { config } from 'typescript-eslint';

export default config(...configs, {
  rules: {
    'unicorn/prevent-abbreviations': 'off',
    'unicorn/no-thenable': 'off',
    'unicorn/prefer-event-target': 'off',
    'unicorn/no-object-as-default-parameter': 'off',
    '@typescript-eslint/consistent-type-imports': 'error',
    'prefer-arrow-callback': 'error',
    // lodash-es is only the `_` property of the generator, loaded at its first use: use native code or src/util/object.ts.
    '@typescript-eslint/no-restricted-imports': [
      'error',
      {
        paths: [{ name: 'lodash-es', message: 'Use native code or src/util/object.ts.', allowTypeImports: true }],
        patterns: [
          { group: ['lodash-es/*'], message: 'Use native code or src/util/object.ts.', allowTypeImports: true },
        ],
      },
    ],
  },
});
