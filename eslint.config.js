import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const nodeGlobals = {
  console: 'readonly',
  process: 'readonly',
  Buffer: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: nodeGlobals,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Complexity is analyzed and surfaced on every lint run / CI so overly
      // branchy functions are visible and can be refactored before they grow.
      complexity: ['warn', 15],
      'max-depth': ['warn', 4],
    },
  },
  {
    // Actively-maintained source is held to a hard complexity ceiling so CI
    // fails if a function here becomes excessively branchy.
    files: ['cli_utils/**/*.ts', 'scripts/**/*.{js,mjs,cjs}'],
    rules: {
      complexity: ['error', 20],
    },
  },
);
