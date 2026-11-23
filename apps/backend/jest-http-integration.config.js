/**
 * Jest configuration for HTTP-layer integration tests
 * 
 * Tests auth and users API endpoints via HTTP using supertest and test database.
 * Tests are deterministic and isolated with clean database state per test.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.http-spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 60000,
  maxWorkers: 1, // Run serially for deterministic database state
  
  // Module name mappings for ESM-only packages
  moduleNameMapper: {
    '^htmlparser2$': require.resolve('htmlparser2', { paths: [__dirname, '../../'] }),
    '^otplib$': require.resolve('otplib', { paths: [__dirname, '../../'] }),
    '^@otplib/plugin-base32-scure$': require.resolve('@otplib/plugin-base32-scure', { paths: [__dirname, '../../'] }),
  },
  
  // TypeScript configuration
  globals: {
    'ts-jest': {
      isolatedModules: true,
      diagnostics: false,
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.controller.ts',
    'src/**/*.service.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.integration-spec.ts',
    '!src/**/*.http-spec.ts',
    '!src/main.ts',
    '!src/test/**',
  ],
  coverageDirectory: 'coverage-http-integration',
  
  // Setup and teardown
  setupFilesAfterEnv: ['<rootDir>/src/test/http-integration-setup.ts'],
};
