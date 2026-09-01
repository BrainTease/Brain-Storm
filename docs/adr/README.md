# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) documenting significant technical decisions made in the Brain-Storm project.

## What is an ADR?

An ADR is a document that captures an important architectural decision along with its context and consequences. ADRs help teams understand why certain choices were made and provide historical context for future developers.

## Format

We use the [MADR (Markdown Any Decision Records)](https://adr.github.io/madr/) template format with the following sections:

- **Status**: Accepted, Proposed, Deprecated, or Superseded
- **Context**: The problem or situation requiring a decision
- **Decision**: The choice that was made
- **Rationale**: Why this decision was made (pros/cons analysis)
- **Consequences**: Positive, negative, and neutral outcomes
- **References**: Links to relevant documentation or resources

## Index

| ADR                                                            | Title                                                                  | Status   |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| [ADR-001](./ADR-001-stellar-soroban-over-ethereum.md)          | Use Stellar/Soroban over Ethereum                                      | Accepted |
| [ADR-002](./ADR-002-nestjs-over-express.md)                    | Use NestJS over Express                                                | Accepted |
| [ADR-003](./ADR-003-nextjs-app-router.md)                      | Use Next.js App Router                                                 | Accepted |
| [ADR-004](./ADR-004-soroban-persistent-storage-credentials.md) | Use Soroban Persistent Storage for Credentials                         | Accepted |
| [ADR-005](./ADR-005-token-economics.md)                        | Brain-Storm Token (BST) Economics                                      | Accepted |
| [ADR-006](./ADR-006-contract-per-domain-architecture.md)       | Contract-Per-Domain Architecture (vs. a Monolithic Contract)           | Accepted |
| [ADR-007](./ADR-007-shared-crate-for-common-code.md)           | `contracts/shared` for Common Contract Code                            | Accepted |
| [ADR-008](./ADR-008-registry-integration-separation.md)        | `registry` and `integration` Are Different Kinds of Crates             | Accepted |
| [ADR-009](./ADR-009-credential-nft-decomposition.md)           | Separate `certificate`, `credential_metadata`, and `nft` Contracts     | Accepted |
| [ADR-0001](./0001-contract-module-boundaries.md)               | Soroban Contract Module Boundaries and Cross-Contract Call Conventions | Accepted |

## Contract Module Boundaries

ADR-006 through ADR-009 document why `contracts/` is split into 19 separate Soroban crates instead of one monolith, including the verified on-chain cross-contract call graph. Start with [ADR-006](./ADR-006-contract-per-domain-architecture.md) for the overall rationale and call graph, then the others for specific boundary decisions. See also [docs/contract-interfaces.md](../contract-interfaces.md) for the full public interface of every contract and the cross-contract call conventions used across the codebase.

## Creating New ADRs

When making significant architectural decisions:

1. Copy the template from `ADR-TEMPLATE.md`
2. Number sequentially (ADR-010, ADR-011, etc.)
3. Use descriptive kebab-case filenames
4. Fill in all sections with context and reasoning
5. Update this README index
6. Get team review before marking as "Accepted"

For detailed guidance, see [ADR-GUIDE.md](./ADR-GUIDE.md).

## Resources

- [ADR Guide](./ADR-GUIDE.md) — How to create and review ADRs
- [ADR Template](./ADR-TEMPLATE.md) — Template for new ADRs
- [MADR Format](https://adr.github.io/madr/) — Markdown ADR format
- [ADR GitHub Organization](https://adr.github.io/)
