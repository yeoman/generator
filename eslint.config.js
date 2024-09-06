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
  },
});
