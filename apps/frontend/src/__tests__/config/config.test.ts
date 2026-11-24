import fs from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  config,
  getConfig,
  getFeatureFlags,
  overrideConfig,
  overrideFeatureFlags,
  resetConfig,
} from '@/config';

const ENV_KEYS = [
  'NODE_ENV',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_STELLAR_NETWORK',
  'NEXT_PUBLIC_SENTRY_DSN',
  'NEXT_PUBLIC_GIT_COMMIT_SHA',
  'NEXT_PUBLIC_BST_CONTRACT_ID',
] as const;

/** Clears every variable the config module reads before each case. */
function clearEnvironment(): void {
  for (const key of ENV_KEYS) {
    vi.stubEnv(key, '');
  }
  resetConfig();
}

describe('frontend config (#1551)', () => {
  beforeEach(() => {
    clearEnvironment();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetConfig();
  });

  it('uses the documented defaults when nothing is configured', () => {
    const current = getConfig();

    expect(current.apiUrl).toBe('http://localhost:3000');
    expect(current.siteUrl).toBe('https://brain-storm.app');
    expect(current.stellarNetwork).toBe('testnet');
    expect(current.bstContractId).toBe('');
    expect(current.sentryDsn).toBeNull();
    expect(current.gitCommitSha).toBeNull();
    expect(current.nodeEnv).toBe('development');
    expect(current.isDevelopment).toBe(true);
    expect(current.isProduction).toBe(false);
    expect(current.isTest).toBe(false);
  });

  it('parses valid public values into typed fields', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'mainnet');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@sentry.example.com/1');
    vi.stubEnv('NEXT_PUBLIC_GIT_COMMIT_SHA', 'abc123');
    vi.stubEnv('NEXT_PUBLIC_BST_CONTRACT_ID', 'CBST...');
    resetConfig();

    const current = getConfig();
    expect(current.apiUrl).toBe('https://api.example.com');
    expect(current.siteUrl).toBe('https://example.com');
    expect(current.stellarNetwork).toBe('mainnet');
    expect(current.isProduction).toBe(true);
    expect(current.sentryDsn).toBe('https://key@sentry.example.com/1');
    expect(current.gitCommitSha).toBe('abc123');
    expect(current.bstContractId).toBe('CBST...');
    expect(getFeatureFlags().debugLogging).toBe(false);
  });

  it('warns and falls back for an invalid network', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'not-a-network');
    resetConfig();

    expect(getConfig().stellarNetwork).toBe('testnet');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid NEXT_PUBLIC_STELLAR_NETWORK'),
    );
  });

  it('warns and falls back for malformed URLs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'not a url');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'also not a url');
    resetConfig();

    expect(getConfig().apiUrl).toBe('http://localhost:3000');
    expect(getConfig().siteUrl).toBe('https://brain-storm.app');
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('supports test overrides and keeps the exported view live', () => {
    const frozen = overrideConfig({ apiUrl: 'https://override.example.com' });

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(getConfig().apiUrl).toBe('https://override.example.com');
    expect(config.apiUrl).toBe('https://override.example.com');

    overrideFeatureFlags({ wallet: false });
    expect(getFeatureFlags().wallet).toBe(false);

    expect(resetConfig().apiUrl).toBe('http://localhost:3000');
    expect(config.apiUrl).toBe('http://localhost:3000');
    expect(getFeatureFlags().wallet).toBe(true);
  });
});

describe('frontend env access guard (#1551)', () => {
  it('has no direct process.env reads in application source outside src/config', () => {
    const srcDir = path.join(__dirname, '../../');
    const configDir = path.join(srcDir, 'config');
    const offenders: string[] = [];

    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__' || entry.name === 'config') continue;
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.[jt]sx?$/.test(entry.name)) {
          continue;
        }
        const content = fs.readFileSync(full, 'utf8');
        const withoutComments = content
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '');
        if (/\bprocess\s*\.\s*env\b/.test(withoutComments)) {
          offenders.push(path.relative(srcDir, full).split(path.sep).join('/'));
        }
      }
    };

    walk(srcDir);
    expect(fs.existsSync(configDir)).toBe(true);
    expect(offenders).toEqual([]);
  });
});
