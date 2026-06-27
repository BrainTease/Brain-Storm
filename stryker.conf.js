// @ts-check
/** @type {import('@stryker-mutator/api').StrykerOptions} */
const config = {
  _comment: 'This config was generated using "stryker init". Please take a look at: https://stryker-mutator.io/docs/stryker-js/configuration/ for more information.',
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: {
    baseDir: 'coverage/mutation',
  },
  jsonReporter: {
    baseDir: 'coverage/mutation',
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
  ],
  thresholds: {
    high: 80,
    medium: 60,
    low: 40,
  },
  timeoutMS: 5000,
  timeoutFactor: 1.25,
  maxConcurrentTestRunners: 4,
};

export default config;
