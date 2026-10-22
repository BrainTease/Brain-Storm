module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'simple-import-sort',
    'import',
    'filenames',
  ],
  rules: {
    // Enforce kebab-case file naming for source files.
    // Allows optional .test/.spec/.d suffixes and index files.
    'filenames/match-regex': [
      'error',
      '^[a-z0-9]+(-[a-z0-9]+)*(?:\\.(?:test|spec|d))?$',
      true,
    ],
    // TypeScript strict rules
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // Prevent raw console.log usage - use structured logging instead
    'no-console': ['error', { allow: ['warn', 'error'] }],
    // Import ordering rules
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          // External packages
          ['^@?\\w'],
          // Internal packages (alphabetical)
          ['^@brain-storm/'],
          // Relative imports
          ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
          ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
        ],
      },
    ],
    'simple-import-sort/exports': 'error',
    'import/no-duplicates': 'error',
    'import/no-unresolved': 'error',
    'import/no-cycle': 'warn',
    // Monorepo package boundaries (ADR-012): packages must not import from apps,
    // application trees must not import each other, and no package may import the
    // Expo app shell from the reusable mobile SDK.
    // These are the executable import constraints defined by ADR-012.
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: ['packages/**'],
            from: ['apps/**'],
            message:
              'Packages must not import from apps/ — packages are lower layers than applications (ADR-012).',
          },
          {
            target: ['packages/mobile/**'],
            from: ['packages/mobile-app/**'],
            message:
              'The mobile SDK must not depend on the Expo app shell — the dependency edge is one-way: mobile-app -> mobile (ADR-012).',
          },
        ],
      },
    ],
  },
  settings: {
    'import/resolver': {
      typescript: {},
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  env: {
    browser: true,
    node: true,
    es2020: true,
  },
  // Build output and generated files should never be linted by lint-staged
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    'lib/',
    'out/',
    '.next/',
    '*.min.js',
    '*.d.ts',
  ],
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
      env: {
        jest: true,
      },
    },
  ],
};
