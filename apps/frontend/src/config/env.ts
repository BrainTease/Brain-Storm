/**
 * The single source of truth for environment access in the frontend.
 *
 * `public-env.json` is shared with `next.config.js`, which uses its keys to
 * inline the public variables at build time. Because the keys are declared in
 * one place, `PublicEnvKey` is a literal union: reading an undeclared variable
 * (or misspelling one) is a compile-time error, and no runtime code outside
 * this directory can reach `process.env` at all.
 */
import publicEnvDefaults from './public-env.json';

/** Keys that Next.js inlines into the browser bundle. */
export type PublicEnvKey = keyof typeof publicEnvDefaults;

/** Every variable the app is allowed to read, including Node-only metadata. */
export type EnvKey = PublicEnvKey | 'NODE_ENV';

/** Keys that Next.js must inline for the browser build. */
export const PUBLIC_ENV_KEYS: readonly PublicEnvKey[] = Object.keys(
  publicEnvDefaults
) as PublicEnvKey[];

/** Default values declared alongside the keys they belong to. */
export const ENV_DEFAULTS: Readonly<Record<PublicEnvKey, string>> = publicEnvDefaults;

function normalize(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Reads an allow-listed environment variable.
 *
 * Each variable is accessed with a **static** `process.env.KEY` expression:
 * Next.js replaces those at build time (see `next.config.js`), while dynamic
 * `process.env[key]` access is not inlined and yields `undefined` in the
 * browser. The switch is exhaustive over {@link EnvKey}, so adding a key to
 * `public-env.json` is a compile error until it is handled here.
 */
export function readEnv(key: EnvKey): string | undefined {
  if (typeof process === 'undefined' || !process.env) {
    return undefined;
  }
  switch (key) {
    case 'NEXT_PUBLIC_API_URL':
      return normalize(process.env.NEXT_PUBLIC_API_URL);
    case 'NEXT_PUBLIC_STELLAR_NETWORK':
      return normalize(process.env.NEXT_PUBLIC_STELLAR_NETWORK);
    case 'NEXT_PUBLIC_SENTRY_DSN':
      return normalize(process.env.NEXT_PUBLIC_SENTRY_DSN);
    case 'NEXT_PUBLIC_GIT_COMMIT_SHA':
      return normalize(process.env.NEXT_PUBLIC_GIT_COMMIT_SHA);
    case 'NEXT_PUBLIC_SITE_URL':
      return normalize(process.env.NEXT_PUBLIC_SITE_URL);
    case 'NEXT_PUBLIC_BST_CONTRACT_ID':
      return normalize(process.env.NEXT_PUBLIC_BST_CONTRACT_ID);
    case 'NODE_ENV':
      return normalize(process.env.NODE_ENV);
    default:
      return assertNever(key);
  }
}

function assertNever(value: never): undefined {
  throw new Error(`[config] Unhandled environment variable: ${String(value)}`);
}
