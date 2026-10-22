# Brain-Storm Soroban Contracts

Each directory under `contracts/` is an independent Soroban crate. For the reasons behind the split, see [ADR-006](../docs/adr/ADR-006-contract-per-domain-architecture.md).

## Shared conventions

Before adding or changing a contract, read [ADR-011: Shared Contract Error, Storage, and Constant Conventions](../docs/adr/ADR-011-contract-shared-conventions.md). It covers:

- **Errors:** reuse `SharedError` for common conditions and keep domain codes outside its reserved ranges.
- **Storage keys:** use a typed `DataKey` enum per contract.
- **TTL and numeric constants:** take values from `contracts/shared/src/constants.rs` instead of hard-coding them.

The shared helpers themselves live in [`shared/`](./shared/).

## Related docs

- [Contract interfaces](../docs/contract-interfaces.md)
- [Contract upgrades](../docs/contract-upgrades.md)
- [Cross-contract call graph (ADR-0001)](../docs/adr/0001-contract-module-boundaries.md)
