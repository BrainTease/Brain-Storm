module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/tests/integration/credential-issuance.integration-spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  testTimeout: 60_000,
};
