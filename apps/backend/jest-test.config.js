/**
 * Jest configuration for all unit and integration tests matching *.test.ts.
 * This covers tests added by Issues #842 and #843.
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.(test|spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    // Issue #1023: 85% coverage threshold for core services
    global: {
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85,
    },
  },
  testEnvironment: 'node',
  testTimeout: 60000,
};
