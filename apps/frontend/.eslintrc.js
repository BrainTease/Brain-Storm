module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'react', 'react-hooks'],
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  ignorePatterns: ['.eslintrc.js', '.next', 'out', 'dist', 'coverage'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_' },
    ],
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    /**
     * #971 — flag hardcoded JSX text that should be extracted to the i18n catalog.
     *
     * The rule warns on any string literal or template literal that appears
     * directly inside JSX elements (e.g. <p>Hello world</p>).  Whitespace-only
     * nodes and punctuation-only strings are intentionally excluded by the
     * pattern.  Use next-intl's `useTranslations()` hook and the message
     * catalog under `messages/` instead.
     *
     * To suppress a single justified exception (e.g. a brand name that must
     * not be translated) add an eslint-disable-next-line comment:
     *   // eslint-disable-next-line react/jsx-no-literals
     */
    'react/jsx-no-literals': [
      'warn',
      {
        noStrings: true,
        ignoreProps: true,
        noAttributeStrings: false,
      },
    ],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
