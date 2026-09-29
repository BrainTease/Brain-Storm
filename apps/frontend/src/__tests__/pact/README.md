# Pact Contract Tests

This directory contains the frontend Pact consumer contract tests.

## Status

The flaky and redundant Pact tests that previously lived here have been removed
as part of issue #1179. The remaining coverage for the affected interactions is
provided by the frontend unit/integration tests, so the duplicated contract
assertions were dropped to eliminate CI flakiness.

## What remains

No Pact consumer tests remain in this directory. The contract interactions that
were previously verified here are now covered by:

- `apps/frontend/src/__tests__` unit and integration tests for the API client
  and data-fetching hooks.
- Backend service/controller specs (e.g. `apps/backend/src/grants/__tests__`)
  which assert the response shapes the frontend depends on.

## Why

- The removed tests were flaky due to unstable mock-server/timing setup.
- They duplicated coverage already provided by the unit/integration suites.
- Keeping them added CI noise without adding meaningful contract guarantees.

If Pact contract testing is reintroduced in the future, prefer a single
provider-verification pipeline with deterministic mock-server startup rather
than per-test in-process mock servers.
