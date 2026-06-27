# Contract Integration Testing

## Overview

Integration tests verify that smart contracts interact correctly with the backend API and with each other. These tests ensure end-to-end workflows function properly.

## Running Integration Tests

```bash
npm run test:integration
```

## Test Scenarios

### Analytics Contract
- Record course progress on-chain
- Retrieve student progress from contract
- Handle concurrent progress updates

### Token Contract
- Mint reward tokens on course completion
- Query token balances
- Track mint history

### Credential Contract
- Issue certificates on course completion
- Verify credentials on-chain
- Store and retrieve credential metadata

### Cross-Contract Interactions
- Complete course → trigger token mint
- Handle concurrent contract calls
- Verify state consistency across contracts

## Test Structure

```
tests/integration/
├── contract-integration.test.ts    # Analytics & Token contracts
├── credential-integration.test.ts  # Credential & Metadata contracts
└── README.md
```

## Setup

Integration tests use the full NestJS application context with:
- Real database connections (via testcontainers)
- Contract interaction layer
- Authentication middleware

## Best Practices

1. Use meaningful test descriptions
2. Test both happy path and error scenarios
3. Verify transaction hashes are returned
4. Check state consistency after operations
5. Clean up test data after each test
