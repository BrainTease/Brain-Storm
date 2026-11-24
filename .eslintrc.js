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
    'filenames/match-regex': ['error', '^[a-z0-9]+(-[a-z0-9]+)*(?:\\.(?:test|spec|d))?$', true],
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
    // Cyclomatic-complexity limit (issue #1549): cap at 15 to keep functions
    // testable and reviewable. Any function already over the limit should be
    // refactored before merging rather than raising or suppressing this rule.
    complexity: ['error', { max: 15 }],
    // Environment access must go through a typed config module (#1551).
    // Apps have their own rules; this covers packages and shared code.
    'no-restricted-syntax': [
      'error',
      {
        selector: "MemberExpression[object.object.name='process'][object.property.name='env']",
        message:
          'Direct process.env access is not allowed. Read values through a typed config module instead.',
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
    {
      // Config modules are the single place allowed to read the environment.
      files: ['**/src/config/**/*.{ts,tsx}'],
      rules: { 'no-restricted-syntax': 'off' },
    },
    {
      // Test fixtures, build tooling and CLI scripts read their own variables
      // (CI, PORT overrides, artifact paths). Documented exceptions for #1551.
      files: [
        'scripts/**',
        '**/*.config.{js,ts}',
        '**/*.{test,spec}.{ts,tsx,js}',
        '**/__tests__/**/*',
        '**/e2e/**/*',
      ],
      rules: { 'no-restricted-syntax': 'off' },
    },
  ],
};
