# Test Scripts Consolidation — Issue #1356

## Overview

This document describes the consolidated test scripts for grants and certificates modules in the Brain-Storm backend.

## Test Scripts

### Individual Module Tests

```bash
# Test grants module only
npm run test:grants

# Test certificates module only
npm run test:certificates
```

### Consolidated Tests

```bash
# Test both grants and certificates modules together
npm run test:grants-and-certificates

# This runs:
# - apps/backend/src/grants/**/*.spec.ts
# - apps/backend/src/certificates/**/*.spec.ts
# - All integration tests in these modules
```

## Test Coverage

### Grants Tests
- **Service tests**: `src/grants/__tests__/grants.service.spec.ts`
- **Integration tests**: `src/grants/__tests__/grants.integration.test.ts`
- **Business logic tests**: `src/grants/__tests__/grants-business.spec.ts`
- **Controller tests**: `src/grants/__tests__/grants.controller.spec.ts` (if exists)
- **E2E tests**: `test/grants.e2e-spec.ts`

**Coverage target**: 85% lines/functions/statements, 80% branches

### Certificates Tests
- **Service tests**: `src/certificates/__tests__/certificate.service.test.ts`
- **Integration tests**: `src/certificates/__tests__/certificate.integration-spec.ts`
- **PDF service tests**: `src/certificates/__tests__/certificate-pdf.service.spec.ts` (if exists)
- **Minting service tests**: `src/certificates/__tests__/certificate-minting.service.spec.ts` (if exists)
- **Controller tests**: `src/certificates/__tests__/certificates.controller.spec.ts` (if exists)
- **E2E tests**: `test/certificates.e2e-spec.ts`

**Coverage target**: ≥85% (tracked separately per issue #842)

## Running All Tests

```bash
# Run all unit and integration tests
npm run test:unit

# Run with coverage report
npm run test:unit:coverage

# Run all test types (unit, integration, contract, e2e)
npm test
```

## Test Configuration

All consolidated tests use:
- **Config file**: `jest-test.config.js`
- **Environment**: `node`
- **Timeout**: Default 5000ms (or specified in individual tests)
- **Coverage thresholds**:
  - Statements: 85%
  - Branches: 80%
  - Functions: 85%
  - Lines: 85%

## Adding New Tests

When adding new tests for grants or certificates:

1. Follow the naming convention: `*.spec.ts` or `*.test.ts`
2. Place in `src/[module]/__tests__/` directory
3. Include in the appropriate module test script automatically
4. Ensure coverage meets or exceeds thresholds

## CI/CD Integration

These scripts are called in CI pipelines:

```bash
# Lint
npm run lint

# Format check
npm run format:check

# Unit tests (includes grants and certificates)
npm run test:unit

# Integration tests
npm run test:integration

# Contract integration tests
npm run test:contract-integration

# E2E tests
npm run test:e2e
```

## Troubleshooting

**Grants tests failing with "grants module not found"**
- Verify `src/grants/` directory exists
- Check `src/grants/grants.module.ts` exists
- Run `npm install` to ensure dependencies are resolved

**Certificates tests failing with "certificates module not found"**
- Verify `src/certificates/` directory exists
- Check `src/certificates/certificates.module.ts` exists
- Review certificate service imports

**Coverage not meeting thresholds**
- Review coverage report: `coverage/lcov-report/index.html`
- Add tests for uncovered branches and lines
- Follow existing test patterns in each module

## Related Issues

- **#1354**: Remove brittle snapshot tests (frontend)
- **#1355**: Mock Freighter wallet API (frontend)
- **#1356**: Grants and certificates test scripts consolidation (backend) ← This issue
- **#1357**: Add test for courses DTO validation (backend)

## Next Steps

- Monitor coverage trends over time
- Consider consolidating more module tests using the same pattern
- Evaluate performance of consolidated test runs
