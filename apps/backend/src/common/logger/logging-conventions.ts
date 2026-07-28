/**
 * Logging Conventions – Issue #802
 *
 * This file documents the approved logging approach for the Brain-Storm backend
 * and is intentionally kept in-source so it compiles and is visible to every
 * contributor who reads the source.
 *
 * ── Rule 1: Never use console.log / console.error / console.warn ─────────
 *
 *   BAD  → console.log('user found', userId);
 *   GOOD → this.logger.log(`User found: ${userId}`);
 *
 *   Exceptions: standalone CLI scripts in src/migrations/ (migration-runner,
 *   migration-validator, migration-rollback) run outside the NestJS IoC
 *   container and intentionally use console for CLI output.
 *
 * ── Rule 2: Prefer the NestJS built-in Logger for service/guard/strategy files
 *
 *   Use  `new Logger(ClassName.name)` as a class-level field.
 *   The NestJS Logger is lightweight, has no extra dependencies, and is
 *   available everywhere without DI configuration.
 *
 *   For richer structured logging (correlation IDs, request context, JSON
 *   transport), inject `LoggerFactory` from `src/common/logger` and call
 *   `this.loggerFactory.createLogger(ClassName.name)`.
 *
 * ── Rule 3: Log levels ────────────────────────────────────────────────────
 *
 *   logger.verbose(...)  – very detailed traces (disabled in prod by default)
 *   logger.debug(...)    – developer-facing debug info
 *   logger.log(...)      – normal operational info (maps to INFO level)
 *   logger.warn(...)     – recoverable issues / unexpected-but-handled states
 *   logger.error(...)    – failures that require attention; include error/trace
 *
 * ── Rule 4: Structured error logging ─────────────────────────────────────
 *
 *   this.logger.error(`Operation failed: ${err.message}`, err.stack);
 *
 *   Never swallow errors silently.  Even in fire-and-forget paths, log at warn
 *   level with enough context to diagnose later.
 *
 * ── Rule 5: No log spam ───────────────────────────────────────────────────
 *
 *   Avoid logging inside tight loops.  Aggregate and log summaries instead.
 *   E.g., log "Processed 500 records" rather than one line per record.
 */

// This file intentionally has no runtime exports.
// It is imported by the logging spec to ensure it compiles correctly.
export const LOGGING_CONVENTIONS_VERSION = '1.0.0';
