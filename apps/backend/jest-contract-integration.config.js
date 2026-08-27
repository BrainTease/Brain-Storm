/**
 * jest-contract-integration.config.js — Issue #1019
 *
 * Jest configuration for the backend-to-contract integration test suite.
 * Tests live in tests/integration/ and match the *.integration-spec.ts pattern.
 *
 * Run via:
 *   cd apps/backend
 *   npx jest --config jest-contract-integration.config.js --runInBand
 *
 * Or from the workspace root:
 *   npm run test:contract-integration --workspace=apps/backend
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: [
    '<rootDir>/tests/integration/**/*.integration-spec.ts',
    '<rootDir>/test/integration/**/*.integration-spec.ts',
  ],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage/integration',
  testEnvironment: 'node',
  testTimeout: 60_000,
};
