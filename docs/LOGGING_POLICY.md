# Logging-Level Policy

Applies to every backend module in `apps/backend/src`. The source-level
version of this policy lives in
[`apps/backend/src/common/logger/logging-conventions.ts`](../apps/backend/src/common/logger/logging-conventions.ts);
this document is the human-facing companion.

## Levels

| Level     | When to use                                                                              | On-call response |
|-----------|------------------------------------------------------------------------------------------|-------------------|
| `error`   | An operation the caller expected to succeed failed. Something is broken.                  | Investigate       |
| `warn`    | An operation degraded or a fallback was used, but the caller got a useful answer.         | Watch             |
| `info`    | A business event happened that we may need for audit or troubleshooting (user registered, contribution recorded, campaign created, WS client connected). | None |
| `debug`   | Diagnostics for developers: query plans, external call payloads, scoring math. Disabled in prod by default. | None |
| `verbose` | Very detailed traces. Disabled in prod by default.                                        | None |

### Rules of thumb

- **A normal user request that succeeds** → `info` at most, usually nothing.
- **A retry, fallback, or cache miss that gets answered** → `warn`.
- **A retry, fallback, or cache miss that also fails** → `error`.
- **Anything inside a hot loop** → aggregate and log one summary line per batch.
- **Secrets, PII, tokens, signatures** → never log them, at any level.

## Correlation IDs

Every log line inside a request lifecycle carries a `correlationId`:

- **HTTP:** `X-Correlation-ID` (falls back to `X-Request-ID`, then generated).
  Bound to the request via `AsyncLocalStorage`
  (`apps/backend/src/common/logger/correlation.store.ts`).
- **WebSocket:** same header on the handshake; if absent, a UUID is generated.
- **Stellar event handling / async workers:** the ID propagates automatically
  because the AsyncLocalStorage context is inherited by `await`-chained code.

### How to log with correlation

Inside any service:

```ts
import { Injectable } from '@nestjs/common';
import { StructuredLoggerService } from '../common/logger/structured-logger.service';

@Injectable()
export class MyService {
  constructor(private readonly logger: StructuredLoggerService) {}

  doThing() {
    // correlationId is auto-attached from AsyncLocalStorage
    this.logger.info('thing.started', { foo: 'bar' });
  }
}
import { getCorrelationId } from '../common/logger/correlation.store';
const cid = getCorrelationId();
grep -n "supertest" package.json
