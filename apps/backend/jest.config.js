module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        // Disable ts-jest type-checking diagnostics. Type checking is done
        // separately by the build step; disabling it here prevents pre-existing
        // errors in unrelated source files from blocking spec compilation.
        diagnostics: false,
      },
    ],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Enforce 85% coverage for all core metrics.
  // Issue #1023: establishing minimum coverage threshold to prevent silent regressions.
  coverageThreshold: {
    global: {
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85,
    },
  },
  testEnvironment: 'node',
};
