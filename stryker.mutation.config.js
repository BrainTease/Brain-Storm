// @ts-check
/** @type {import('@stryker-mutator/api').StrykerOptions} */
const config = {
  _comment: 'Comprehensive mutation testing configuration for Brain-Storm',
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress', 'json', 'dashboard'],
  htmlReporter: {
    baseDir: 'coverage/mutation',
  },
  jsonReporter: {
    baseDir: 'coverage/mutation',
  },
  dashboardReporter: {
    project: 'github.com/BrainTease/Brain-Storm',
    version: process.env.GITHUB_SHA || 'local',
    module: 'brain-storm',
  },
  testRunner: 'jest',
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.js',
  },
  mutate: [
    'apps/backend/src/**/*.ts',
    'apps/frontend/src/**/*.ts',
    'apps/frontend/src/**/*.tsx',
    '!**/*.spec.ts',
    '!**/*.test.ts',
    '!**/*.spec.tsx',
    '!**/*.test.tsx',
    '!**/index.ts',
    '!**/types.ts',
    '!**/constants.ts',
    '!**/interfaces.ts',
  ],
  mutators: [
    'ArithmeticOperator',
    'ArrayDeclaration',
    'ArrowFunction',
    'AssignmentOperator',
    'BlockStatement',
    'BooleanLiteral',
    'ConditionalExpression',
    'EqualityOperator',
    'LogicalOperator',
    'ObjectLiteral',
    'RegExp',
    'ReturnValue',
    'StringLiteral',
    'UnaryOperator',
    'UpdateOperator',
  ],
  // Baseline mutation score recorded from the initial `npm run test:mutation` run.
  // `break` enforces the minimum acceptable score so weak tests fail the run.
  // `high`/`medium`/`low` drive the reporter color coding.
  thresholds: {
    high: 80,
    medium: 60,
    low: 40,
    break: 40,
  },
  timeoutMS: 5000,
  timeoutFactor: 1.25,
  maxConcurrentTestRunners: 4,
  concurrency: 4,
  plugins: ['@stryker-mutator/typescript-checker'],
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
};

export default config;
