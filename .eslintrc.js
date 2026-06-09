module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'unused-imports'],
  extends: ['plugin:@typescript-eslint/recommended'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  "overrides": [{
    files: ['shared/**/*.ts', 'apps/**/*.ts', 'libs/**/*.ts'],
    rules: {
      '@typescript-eslint/no-inferrable-types': 'off',
      "@typescript-eslint/no-unused-vars":"off",
      "@typescript-eslint/no-unused-expressions":"off",
      'lines-between-class-members': ['warn', 'always', { exceptAfterSingleLine: true }],
      "no-unused-vars":"off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          "vars": "all",
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "args":"all",
          "caughtErrorsIgnorePattern": "^_",
        },
      ],
      '@typescript-eslint/return-await': ['error', 'error-handling-correctness-only'],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@kaltura/node-typescript-client/api/types',
              message:
                'Import from specific file, otherwise it will slow the project compile time',
            },
            {
              name: 'kaltura-node-typescript-client/api/types',
              message:
                'Import from specific file, otherwise it will slow the project compile time',
            },
          ],
        },
      ],
    }
  }]
};
