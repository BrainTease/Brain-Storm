# ADR-009: Separate `certificate`, `credential_metadata`, and `nft` Contracts

**Status:** Accepted

**Date:** 2026-07-25

**Author(s):** Brain-Storm maintainers

---

## Context

Three contracts under `contracts/` all relate to "what a student has": `certificate`, `credential_metadata`, and `nft`. This is the most frequently asked "why are these separate?" question new contributors raise about the contract boundaries. Reading each contract's actual interface (function signatures verified directly against `contracts/*/src/lib.rs`) shows they are not redundant — they implement three functionally distinct primitives:

| Contract              | What it is                                                                                                                                                                                                                              | Key functions                                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `certificate`         | A **soulbound-by-default** proof-of-completion token. Transfer is disabled unless an admin explicitly opts a specific certificate into transferability.                                                                                 | `mint_certificate`, `revoke_certificate`, `is_revoked`, `enable_transfer`, `transfer`, `is_transferable`, `is_valid`                                      |
| `credential_metadata` | A **metadata and lifecycle layer**: course name, completion date, grade, IPFS content hash, expiry/renewal, and a content-hash verification function — independent of whether the credential is represented as a certificate or an NFT. | `store_metadata`, `update_metadata`, `is_expired`, `can_renew`, `renew_credential`, `store_metadata_hash`, `verify_metadata_hash`, `get_metadata_history` |
| `nft`                 | A **generic, tradeable course token** with marketplace primitives: listing, buying, delisting, access grants, and royalty info — not credential-specific.                                                                               | `mint_course_nft`, `transfer_nft`, `list_nft`, `buy_nft`, `delist_nft`, `grant_access`, `revoke_access`, `has_access`, `get_royalty_info`                 |

`credential_metadata` optionally composes with `nft` through exactly one on-chain call: `issue_with_nft` mints a `credential_metadata` record and, in the same invocation, calls `nft::mint_course_nft` via a locally-declared client stub (`contracts/credential_metadata/src/linkage.rs`), storing a bidirectional `credential_id ↔ nft_id` link. `credential_metadata` also exposes a plain `store_metadata` path that does **not** touch `nft` at all. `certificate` has no on-chain relationship to either of the other two — it is entirely self-contained.

## Decision

Keep `certificate`, `credential_metadata`, and `nft` as three separate contracts, each with a distinct, narrow responsibility, composed optionally (not by default) rather than merged into one "Credentials" contract.

## Rationale

**Why not merge `certificate` and `credential_metadata`?**
`certificate` is intentionally minimal: mint, revoke, optionally-enable-transfer, done. It is the contract whose integrity matters most — a "proof of completion" record — so its attack surface is kept as small as possible. `credential_metadata`'s expiry/renewal/history features (`renew_credential`, `get_metadata_history`, content-hash verification) are considerably more complex and were added later (its `issue_with_nft` path is tagged issue `#635` in code comments). Bundling that complexity into `certificate` would mean every future metadata feature risks an upgrade or bug surface on the soulbound proof-of-completion contract itself. Keeping them separate means `certificate` can stay small, stable, and rarely need to change, while `credential_metadata` absorbs metadata-related feature growth.

**Why not merge `credential_metadata` and `nft`?**
They serve different consumers. `nft` is a general-purpose tradeable asset primitive — its marketplace functions (`list_nft`/`buy_nft`/`delist_nft`) and access-grant functions (`grant_access`/`revoke_access`/`has_access`) have nothing to do with credentials specifically; an NFT minted via `mint_course_nft` could represent a purchasable course seat as easily as a credential. `credential_metadata` needs to be usable **without** an NFT at all (`store_metadata` vs. `issue_with_nft`) — not every credential needs to be a tradeable, marketplace-listable asset, and forcing one onto the other would mean an admin issuing a plain internal credential record pays the gas and complexity cost of NFT semantics whether or not the credential is meant to be sellable.

**Why not merge all three into one "Credentials" contract?**
Mixing soulbound-integrity semantics (`certificate`), lifecycle/expiry semantics (`credential_metadata`), and tradeable-marketplace semantics (`nft`) in one contract means a bug in marketplace listing logic sits in the same audit scope, and shares the same upgrade path, as the code that decides whether a certificate is revoked. The current split lets each concern be reasoned about, and upgraded, independently — consistent with the general contract-per-domain rationale in [ADR-006](./ADR-006-contract-per-domain-architecture.md).

**Alternatives considered**

1. **One `Credential` contract with certificate + metadata + optional-NFT flag.** Rejected as above — conflates soulbound-integrity, lifecycle, and marketplace concerns in one audit/upgrade scope.
2. **Fold `credential_metadata`'s expiry/renewal into `certificate` directly, keep `nft` separate.** Rejected — `certificate`'s `is_valid`/`is_revoked` model and `credential_metadata`'s `is_expired`/`can_renew`/`renew_credential` model are different lifecycle state machines; forcing them into one contract's storage schema would require reconciling two different "is this still good?" definitions.
3. **Make the `credential_metadata → nft` link mandatory (every credential always mints an NFT).** Rejected — `store_metadata` (no NFT) is a real, used code path; not every credential needs marketplace tradeability, and mandatory NFT minting would add cost and complexity to the common case.

## Consequences

### Positive

- Each contract stays small and independently auditable (`certificate`: 17 functions; `credential_metadata`: 17 functions; `nft`: 16 functions — none of them large by Soroban contract standards).
- `nft` can be reused as a general marketplace primitive by other flows (e.g. `market`'s escrow) without dragging in credential-specific expiry logic.
- The one on-chain link (`issue_with_nft`) is atomic — per `linkage.rs`'s doc comment, "If either operation fails the whole call is rolled back" — so there's no partial state where a credential exists without its NFT or vice versa, for the flows that opt into linkage.

### Negative

- There is no single canonical "give me everything about this credential" query. A full picture requires reading `certificate` (if the credential was also issued as a soulbound cert), `credential_metadata` (course name/grade/expiry), and — only if `issue_with_nft` was used — `nft` (ownership/marketplace state) via `get_credential_link`. `apps/backend` is responsible for joining these views; see the worked example in [docs/contract-interfaces.md](../contract-interfaces.md#worked-example-2-credential-issuance-with-linked-nft-635).
- Contributors adding a new credential-related feature must decide up front which of the three contracts it belongs in; this ADR is the reference for that decision, but there's no automated check preventing e.g. expiry logic from accidentally being added to `certificate` instead of `credential_metadata`.

### Neutral

- `certificate` remains entirely unaware of `nft` and `credential_metadata` — it has zero on-chain or off-chain-required relationship to either, and can be used standalone.

## References

- [contracts/certificate/src/lib.rs](../../contracts/certificate/src/lib.rs)
- [contracts/credential_metadata/src/lib.rs](../../contracts/credential_metadata/src/lib.rs)
- [contracts/credential_metadata/src/linkage.rs](../../contracts/credential_metadata/src/linkage.rs)
- [contracts/nft/src/lib.rs](../../contracts/nft/src/lib.rs)
- [docs/contract-interfaces.md](../contract-interfaces.md)
- [ADR-006: Contract-Per-Domain Architecture](./ADR-006-contract-per-domain-architecture.md)
- [Issue #762](https://github.com/BrainTease/Brain-Storm/issues/762)

## Revision History

| Date       | Author                  | Change                          |
| ---------- | ----------------------- | ------------------------------- |
| 2026-07-25 | Brain-Storm maintainers | Initial proposal for issue #762 |
