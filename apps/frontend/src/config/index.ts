/**
 * Centralized, validated application configuration.
 *
 * This is the only module in the frontend that reads environment variables,
 * and even here access goes through the allow-listed readers in `./env`.
 * Components, hooks and utilities must call {@link getConfig} instead of
 * touching `process.env` directly. That keeps environment handling in one
 * place, makes values typed and validated, and lets tests override the
 * configuration without mutating the global environment.
 */
import { ENV_DEFAULTS, readEnv } from './env';

export type StellarNetwork = 'testnet' | 'mainnet' | 'futurenet' | 'standalone';

export interface AppConfig {
  /** Base URL of the backend API. */
  apiUrl: string;
  /** Public site URL used in metadata and sitemaps. */
  siteUrl: string;
  /** Stellar network the app is configured to talk to. */
  stellarNetwork: StellarNetwork;
  /** Reward-token contract ID, or an empty string when not configured. */
  bstContractId: string;
  /** Sentry DSN, or `null` when error reporting is disabled. */
  sentryDsn: string | null;
  /** Git commit SHA of the running build, or `null` when unknown. */
  gitCommitSha: string | null;
  /** Current Node environment. */
  nodeEnv: 'development' | 'test' | 'production';
  /** Whether the app is running in production. */
  isProduction: boolean;
  /** Whether the app is running in development. */
  isDevelopment: boolean;
  /** Whether the app is running under test. */
  isTest: boolean;
}

export interface FeatureFlags {
  /** Enable Sentry error reporting (requires a DSN). */
  sentry: boolean;
  /** Enable wallet connectivity features. */
  wallet: boolean;
  /** Enable verbose debug logging. */
  debugLogging: boolean;
}

const VALID_NETWORKS: readonly StellarNetwork[] = ['testnet', 'mainnet', 'futurenet', 'standalone'];
const VALID_NODE_ENVS = ['development', 'test', 'production'] as const;

type NodeEnv = (typeof VALID_NODE_ENVS)[number];

function parseNodeEnv(raw: string | undefined): NodeEnv {
  if (raw && (VALID_NODE_ENVS as readonly string[]).includes(raw)) {
    return raw as NodeEnv;
  }
  return 'development';
}

function parseStellarNetwork(raw: string | undefined): StellarNetwork {
  if (raw && (VALID_NETWORKS as readonly string[]).includes(raw)) {
    return raw as StellarNetwork;
  }
  if (raw) {
    // Surface misconfiguration without crashing the app.
    // eslint-disable-next-line no-console
    console.warn(
      `[config] Invalid NEXT_PUBLIC_STELLAR_NETWORK "${raw}". ` +
        `Falling back to "${ENV_DEFAULTS.NEXT_PUBLIC_STELLAR_NETWORK}". ` +
        `Valid values: ${VALID_NETWORKS.join(', ')}.`
    );
  }
  return ENV_DEFAULTS.NEXT_PUBLIC_STELLAR_NETWORK as StellarNetwork;
}

function parseApiUrl(raw: string | undefined): string {
  const fallback = ENV_DEFAULTS.NEXT_PUBLIC_API_URL;
  if (!raw) {
    return fallback;
  }
  try {
    // Validate that the URL is well-formed.
    // eslint-disable-next-line no-new
    new URL(raw);
    return raw;
  } catch {
    // eslint-disable-next-line no-console
    console.warn(
      `[config] Invalid NEXT_PUBLIC_API_URL "${raw}". ` + `Falling back to "${fallback}".`
    );
    return fallback;
  }
}

function parseSiteUrl(raw: string | undefined): string {
  const fallback = ENV_DEFAULTS.NEXT_PUBLIC_SITE_URL;
  if (!raw) {
    return fallback;
  }
  try {
    // eslint-disable-next-line no-new
    new URL(raw);
    return raw;
  } catch {
    // eslint-disable-next-line no-console
    console.warn(
      `[config] Invalid NEXT_PUBLIC_SITE_URL "${raw}". ` + `Falling back to "${fallback}".`
    );
    return fallback;
  }
}

function buildConfig(): AppConfig {
  const nodeEnv = parseNodeEnv(readEnv('NODE_ENV'));
  return {
    apiUrl: parseApiUrl(readEnv('NEXT_PUBLIC_API_URL')),
    siteUrl: parseSiteUrl(readEnv('NEXT_PUBLIC_SITE_URL')),
    stellarNetwork: parseStellarNetwork(readEnv('NEXT_PUBLIC_STELLAR_NETWORK')),
    sentryDsn: readEnv('NEXT_PUBLIC_SENTRY_DSN') ?? null,
    gitCommitSha: readEnv('NEXT_PUBLIC_GIT_COMMIT_SHA') ?? null,
    bstContractId: readEnv('NEXT_PUBLIC_BST_CONTRACT_ID') ?? '',
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
  };
}

function buildFeatureFlags(config: AppConfig): FeatureFlags {
  return {
    sentry: config.sentryDsn !== null,
    wallet: true,
    debugLogging: !config.isProduction,
  };
}

let currentConfig: AppConfig = Object.freeze(buildConfig());
let currentFeatureFlags: FeatureFlags = Object.freeze(buildFeatureFlags(currentConfig));

/**
 * Returns the current application configuration.
 *
 * Always use this accessor rather than the `config` constant when the value
 * may have been replaced by {@link overrideConfig} (e.g. in tests).
 */
export function getConfig(): AppConfig {
  return currentConfig;
}

/** Returns the current feature flags. */
export function getFeatureFlags(): FeatureFlags {
  return currentFeatureFlags;
}

/**
 * Test-friendly override. Replaces the active configuration and feature
 * flags. Passing `null` resets the configuration by re-reading the
 * environment.
 *
 * Intended for use in tests only.
 */
export function overrideConfig(overrides: Partial<AppConfig> | null): AppConfig {
  if (overrides === null) {
    currentConfig = Object.freeze(buildConfig());
  } else {
    currentConfig = Object.freeze({ ...currentConfig, ...overrides });
  }
  currentFeatureFlags = Object.freeze(buildFeatureFlags(currentConfig));
  return currentConfig;
}

/** Test-friendly override for feature flags only. */
export function overrideFeatureFlags(overrides: Partial<FeatureFlags> | null): FeatureFlags {
  if (overrides === null) {
    currentFeatureFlags = Object.freeze(buildFeatureFlags(currentConfig));
  } else {
    currentFeatureFlags = Object.freeze({
      ...currentFeatureFlags,
      ...overrides,
    });
  }
  return currentFeatureFlags;
}

/** Resets configuration to the values read from the environment. */
export function resetConfig(): AppConfig {
  return overrideConfig(null);
}

/**
 * Live view of the active configuration, for call sites that prefer a
 * constant import. Prefer {@link getConfig} in application code.
 */
export const config: AppConfig = Object.freeze({
  get apiUrl(): string {
    return getConfig().apiUrl;
  },
  get siteUrl(): string {
    return getConfig().siteUrl;
  },
  get stellarNetwork(): StellarNetwork {
    return getConfig().stellarNetwork;
  },
  get bstContractId(): string {
    return getConfig().bstContractId;
  },
  get sentryDsn(): string | null {
    return getConfig().sentryDsn;
  },
  get gitCommitSha(): string | null {
    return getConfig().gitCommitSha;
  },
  get nodeEnv(): NodeEnv {
    return getConfig().nodeEnv;
  },
  get isProduction(): boolean {
    return getConfig().isProduction;
  },
  get isDevelopment(): boolean {
    return getConfig().isDevelopment;
  },
  get isTest(): boolean {
    return getConfig().isTest;
  },
});

/** Live view of the active feature flags. */
export const featureFlags: FeatureFlags = Object.freeze({
  get sentry(): boolean {
    return getFeatureFlags().sentry;
  },
  get wallet(): boolean {
    return getFeatureFlags().wallet;
  },
  get debugLogging(): boolean {
    return getFeatureFlags().debugLogging;
  },
});

export default config;
