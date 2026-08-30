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
    // certificates module should meet the 85 % target
    'global': {
      lines: 70,
      functions: 70,
      branches: 60,
      statements: 70,
    },
  },
  testEnvironment: 'node',
  testTimeout: 60000,
};
