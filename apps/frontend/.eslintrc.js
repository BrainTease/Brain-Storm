module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    '@typescript-eslint/eslint-plugin',
    'react',
    'react-hooks',
    'import',
    'filenames',
    'unused-imports',
  ],
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  ignorePatterns: [
    '.eslintrc.js',
    '.next',
    'out',
    'dist',
    'coverage',
    'node_modules',
    'next-env.d.ts',
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: { project: './tsconfig.json' },
      node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    // Exported functions/components must declare explicit return types and prop interfaces.
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    // Prefer `import type { ... }` for type-only imports to keep runtime bundles lean.
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
    ],
    // Debug output must not ship: only console.error (or the project logger) is allowed.
    'no-console': ['error', { allow: ['error'] }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        pathGroups: [{ pattern: '@/**', group: 'internal', position: 'after' }],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-cycle': ['warn', { maxDepth: 3, ignoreExternal: true }],
    'import/no-duplicates': 'error',
    // Flag unused imports in-editor; unused exports are reported by `lint:dead-code` (knip).
    'unused-imports/no-unused-imports': 'error',
    'import/no-unused-modules': [
      'warn',
      {
        unusedExports: true,
        ignoreExports: [
          'src/app/**/{page,layout,loading,error,not-found,route,template}.{ts,tsx}',
          'src/middleware.ts',
          'next.config.js',
          'e2e/**/*.{ts,tsx}',
        ],
      },
    ],
    // File names must be kebab-case; suffixes like .d.ts, .spec.ts and .test.ts are allowed.
    'filenames/match-regex': [
      'error',
      '^[a-z0-9]+(?:-[a-z0-9]+)*(?:\\.(?:d|spec|test))?$',
      true,
    ],
    complexity: ['error', { max: 15 }],
    'max-lines-per-function': [
      'error',
      {
        max: 80,
        skipBlankLines: true,
        skipComments: true,
        IIFEs: true,
      },
    ],
  },
  overrides: [
    {
      // Test files may log while diagnosing failures and often use loose typing for mocks.
      files: ['src/__tests__/**/*.{ts,tsx}', '**/*.{spec,test}.{ts,tsx}'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
    },
    {
      // Entry points are consumed by the framework, not by other modules.
      files: [
        'src/app/**/*.{ts,tsx}',
        'src/pages/**/*.{ts,tsx}',
        'src/middleware.ts',
        'next.config.js',
        '.storybook/main.ts',
        'e2e/**/*.{ts,tsx}',
      ],
      rules: { 'import/no-unused-modules': 'off' },
    },
    {
      // Next.js special files and config files keep their framework-mandated names.
      files: [
        'src/pages/**/*.{ts,tsx}',
        'src/app/**/*.{ts,tsx}',
        '*.config.{js,ts}',
        'next-env.d.ts',
      ],
      rules: { 'filenames/match-regex': 'off' },
    },
    {
      // Config files are CommonJS and don't need explicit module boundary types.
      files: ['*.config.{js,ts}', '.eslintrc.js'],
      rules: { '@typescript-eslint/explicit-module-boundary-types': 'off' },
    },
  ],
};
