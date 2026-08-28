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
  testEnvironment: 'node',
};
