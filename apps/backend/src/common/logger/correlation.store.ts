/**
 * Correlation context (#1215).
 *
 * Uses AsyncLocalStorage so any code running inside a request lifecycle —
 * including `stellar` event handlers and `ws-gateway` message handlers that
 * are async-chained from the initial HTTP/WS entry — can read the same
 * correlation ID without threading it through every function signature.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface CorrelationContext {
  correlationId: string;
}

export const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

/** Read the active correlation ID, or undefined if none is bound. */
export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}

/** Run `fn` with the given correlation ID bound to the current async scope. */
export function runWithCorrelationId<T>(
  correlationId: string,
  fn: () => T,
): T {
  return correlationStorage.run({ correlationId }, fn);
}
