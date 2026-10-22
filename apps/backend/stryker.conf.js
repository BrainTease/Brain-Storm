// @ts-check
/** @type {import('@stryker-mutator/api').StrykerOptions} */
const config = {
  _comment: 'Mutation testing configuration for Brain-Storm backend core modules',
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: {
    baseDir: '../../coverage/mutation/backend',
  },
  jsonReporter: {
    baseDir: '../../coverage/mutation/backend',
  },
  testRunner: 'jest',
  jest: {
    projectType: 'custom',
    configFile: 'jest-test.config.js',
  },
  // Focus mutation testing on core modules:
  // - services: Business logic layer (payment processing, user enrollment, course management)
  // - controllers: API endpoints and request handling
  // - guards: Authentication and authorization logic (critical for security)
  // - interceptors: Request/response transformations
  mutate: [
    'src/services/**/*.ts',
    'src/controllers/**/*.ts',
    'src/guards/**/*.ts',
    'src/interceptors/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.test.ts',
    '!**/index.ts',
    '!**/types.ts',
    '!**/constants.ts',
    '!**/interfaces.ts',
  ],
  // Exclude highly mutation-resistant code:
  // - ORM entities (TypeORM decorators + properties not easily mutable)
  // - Database migrations (deterministic schema changes)
  // - Config files (values, not logic)
  // - Module imports (infrastructure code)
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
  // Define acceptable mutation score thresholds for backend core modules
  thresholds: {
    high: 80,  // Excellent test coverage kills 80%+ of mutants
    medium: 60, // Good coverage kills 60-79% of mutants
    low: 40,    // Acceptable coverage kills 40-59% of mutants
    break: 40,  // Fail the build if coverage drops below 40%
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
