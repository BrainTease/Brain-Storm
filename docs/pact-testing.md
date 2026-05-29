# Pact API Contract Testing

## Overview

Pact testing ensures that the frontend and backend API contracts are compatible. These tests verify that the API responses match the expected structure and types.

## Running Pact Tests

```bash
npm run test:pact
```

## Test Files

- `auth.pact.test.ts` - Authentication endpoints (register, login)
- `courses.pact.test.ts` - Course endpoints (list, get by id)

## Contract Verification

After running consumer tests, verify provider compatibility:

```bash
npm run test:pact:verify
```

## Adding New Contracts

1. Create a new `.pact.test.ts` file in `tests/pact/`
2. Define consumer expectations using Pact matchers
3. Add provider state setup in backend
4. Run tests to generate pact files
5. Verify provider against pact files

## Pact Matchers

- `Matchers.uuid()` - UUID format
- `Matchers.iso8601DateTime()` - ISO 8601 datetime
- `Matchers.regex(/pattern/)` - Regex pattern
- `Matchers.eachLike(example)` - Array of similar objects
- `Matchers.string(example)` - String type
- `Matchers.integer(example)` - Integer type
