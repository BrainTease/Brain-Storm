module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testRegex: '.e2e-spec.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Some transitive dependencies ship ESM-only which jest cannot require.
  // Map them to their CJS builds via moduleNameMapper.
  moduleNameMapper: {
    '^htmlparser2$': require.resolve('htmlparser2', { paths: [__dirname, '../../'] }),
    '^otplib$': require.resolve('otplib', { paths: [__dirname, '../../'] }),
    '^@otplib/plugin-base32-scure$': require.resolve('@otplib/plugin-base32-scure', { paths: [__dirname, '../../'] }),
  },
  // Use isolatedModules: true to use transpileModule instead of the
  // full compiler, which avoids the "Identifier has already been declared"
  // error that appeared with the duplicate class (now fixed).
  globals: {
    'ts-jest': {
      isolatedModules: true,
      diagnostics: false,
    },
  },
};