import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseStellarNetwork } from './network';
import { validationSchema } from './validation.schema';

interface SchemaDescription {
  keys?: Record<string, { flags?: { presence?: string } }>;
}

const schemaDescription = validationSchema.describe() as unknown as SchemaDescription;
const schemaKeys = Object.keys(schemaDescription.keys ?? {}).sort();

/**
 * Guards against the #805/#1477 drift class: a variable read by the app but
 * missing from the Joi schema (so it is never validated), or declared but never
 * consumed (so the declaration silently rots).
 */
describe('config schema parity (#1551)', () => {
  function envKeysReadBy(file: string): string[] {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const found = new Set<string>();
    for (const match of withoutComments.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
      found.add(match[1]);
    }
    return [...found].sort();
  }

  it.each(['configuration.ts', 'env.ts'])(
    'reads only variables declared in the Joi schema (%s)',
    (file) => {
      const undeclared = envKeysReadBy(file).filter((key) => !schemaKeys.includes(key));
      expect(undeclared).toEqual([]);
    }
  );

  it('declares every required variable', () => {
    const required = Object.entries(schemaDescription.keys ?? {})
      .filter(([, rule]) => rule.flags?.presence === 'required')
      .map(([key]) => key)
      .sort();

    expect(required).toEqual(
      [
        'DATABASE_HOST',
        'DATABASE_NAME',
        'DATABASE_PASSWORD',
        'DATABASE_USER',
        'EMAIL_HOST',
        'EMAIL_PASS',
        'EMAIL_USER',
        'JWT_SECRET',
        'REDIS_URL',
        'STELLAR_SECRET_KEY',
      ].sort()
    );
  });

  it('keeps the parsed Stellar network within the schema-valid values', () => {
    expect(parseStellarNetwork('mainnet')).toBe('mainnet');
    expect(parseStellarNetwork('testnet')).toBe('testnet');
    expect(parseStellarNetwork(undefined)).toBe('testnet');
    expect(parseStellarNetwork('something-else')).toBe('testnet');
  });
});
