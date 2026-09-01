/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  // Only collect coverage from files that contain runtime code (schemas, enums).
  // Pure interface/type files emit no executable JS and are excluded to avoid
  // artificially deflating the coverage percentage (issue #1024).
  collectCoverageFrom: [
    'src/validation.types.ts',
    'src/error.types.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  // Issue #1024: enforce 90% coverage across all validators/type exports
  coverageThreshold: {
    global: {
      lines: 90,
      functions: 90,
      branches: 85,
      statements: 90,
    },
  },
};
