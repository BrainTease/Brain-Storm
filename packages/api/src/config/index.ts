/**
 * Typed environment access for the standalone API package.
 *
 * Keeping the read here means the only `process.env` access in this package is
 * in one auditable place, and an invalid PORT falls back explicitly instead of
 * silently producing a `NaN` listen port.
 */
const DEFAULT_PORT = 3000;
const MIN_PORT = 1;
const MAX_PORT = 65535;

/** Returns the configured HTTP port, or a safe default for invalid values. */
export function getPort(): number {
  const raw = process.env.PORT;
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_PORT;
  }

  const port = Number(raw.trim());
  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    // eslint-disable-next-line no-console
    console.warn(`[config] Invalid PORT "${raw}". Falling back to ${DEFAULT_PORT}.`);
    return DEFAULT_PORT;
  }

  return port;
}
