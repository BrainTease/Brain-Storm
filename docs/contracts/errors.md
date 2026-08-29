# Contract-Level Error Codes Reference

This document is the authoritative reference for all error codes emitted by the Brain-Storm Soroban smart contracts. It is consumed by `packages/sdk`, `apps/backend`, `apps/frontend`, and external integrations to decode on-chain contract errors into human-readable messages and actionable UI feedback.

> **Regeneration:** This document is automatically generated from `contracts/shared/src/errors.rs`. To update after modifying contract errors, run:
>
> ```bash
> node scripts/generate-contract-errors.js
> ```

---

## Table of Contents

1. [Overview & Error Decoding](#overview--error-decoding)
2. [Master Error Code Reference Table](#master-error-code-reference-table)
3. [Errors by Category](#errors-by-category)
   - [Initialization & State](#initialization-state)
   - [Authorization & Access Control](#authorization-access-control)
   - [Validation Errors](#validation-errors)
   - [State & Data](#state-data)
   - [Contract State](#contract-state)
   - [Proposals & Governance](#proposals-governance)
   - [Limits & Restrictions](#limits-restrictions)
   - [Credential & Metadata Specific](#credential-metadata-specific)
   - [NFT & Linkage](#nft-linkage)
   - [General Errors](#general-errors)
4. [Coverage Across Contracts (All 20 Contracts)](#coverage-across-contracts-all-20-contracts)
5. [Client SDK & Backend Error Handling](#client-sdk--backend-error-handling)

---

## Overview & Error Decoding

When a Soroban contract invocation fails, the Stellar RPC node returns a transaction result containing an `Error(Contract, #code)` payload.

- **Contract Error Representation:** In Soroban SDK / XDR, contract errors are represented as `u32` error codes defined in the contract's `SharedError` enum.
- **Unified Error Space:** Brain-Storm uses a centralized error enum in `contracts/shared/src/errors.rs` (ADR-007) ensuring that error codes are unique, consistent, and predictable across all 20 contract crates.

### Decoding Formula

```typescript
// Given a raw Soroban error code 'code':
const errorMessage = CONTRACT_ERRORS[code]?.meaning || 'Unknown contract error';
```

---

## Master Error Code Reference Table

|  Code   | Variant                   | Category                       | Meaning & Trigger Condition                                                                      | Applicable Contracts                                                                   |
| :-----: | ------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
|  **1**  | `NotInitialized`          | Initialization & State         | Contract has not been initialized. Must call initialize(admin) before invoking other methods.    | All Contracts                                                                          |
|  **2**  | `AlreadyInitialized`      | Initialization & State         | Contract is already initialized. Re-initialization is strictly rejected.                         | All Contracts                                                                          |
|  **3**  | `InvalidState`            | Initialization & State         | The contract or referenced resource is in an invalid state for this operation.                   | All Contracts, dispute, market, scholarship_fund                                       |
| **11**  | `Unauthorized`            | Authorization & Access Control | Caller is not authorized to execute this operation or required authentication is missing.        | All Contracts                                                                          |
| **12**  | `AdminOnly`               | Authorization & Access Control | Operation restricted exclusively to the designated contract admin address.                       | All Contracts                                                                          |
| **13**  | `CuratorOnly`             | Authorization & Access Control | Operation restricted exclusively to authorized curator or verifier accounts.                     | registry, dispute, certificate, credential_metadata                                    |
| **14**  | `InvalidRole`             | Authorization & Access Control | Caller lacks the required RBAC role (e.g., Instructor, Student, Admin) or invalid role supplied. | shared, registry, governance                                                           |
| **21**  | `InvalidAmount`           | Validation Errors              | Provided amount is zero, negative, insufficient, or exceeds allowed maximum.                     | token, market, liquidity_pool, grants, scholarship_fund, buyback, royalty_distribution |
| **22**  | `InvalidPercentage`       | Validation Errors              | Percentage or basis point value is out of valid range (e.g. not 0-100% or > 10,000 bps).         | analytics, royalty_distribution, liquidity_pool, governance                            |
| **23**  | `InvalidTimestamp`        | Validation Errors              | Timestamp is invalid (e.g., in the past, expiration before start, or deadline elapsed).          | governance, grants, token_restrictions, certificate, credential_metadata               |
| **24**  | `EmptyString`             | Validation Errors              | Required string parameter (e.g., symbol, URI, course ID, name) is empty.                         | analytics, badges, certificate, credential_metadata, nft, registry                     |
| **25**  | `InvalidCredential`       | Validation Errors              | Credential identifier or structure is invalid or malformed.                                      | certificate, credential_metadata, registry                                             |
| **26**  | `InvalidMetadata`         | Validation Errors              | Metadata URL, payload, or schema is invalid or exceeds maximum allowable length.                 | certificate, credential_metadata, badges, nft                                          |
| **41**  | `NotFound`                | State & Data                   | Requested record, entity, account, listing, or proposal was not found in contract storage.       | All Contracts                                                                          |
| **42**  | `AlreadyExists`           | State & Data                   | An entity with the given identifier or parameters already exists in storage.                     | badges, registry, certificate, market, token_restrictions                              |
| **43**  | `AlreadyPaused`           | State & Data                   | Contract or subsystem is already paused; cannot pause again.                                     | shared, token, market, liquidity_pool                                                  |
| **44**  | `NotPaused`               | State & Data                   | Contract or subsystem is not currently paused; cannot unpause.                                   | shared, token, market, liquidity_pool                                                  |
| **61**  | `ContractPaused`          | Contract State                 | Operation rejected because the contract is currently in emergency paused state.                  | shared, token, market, liquidity_pool, governance                                      |
| **62**  | `ReentrantCall`           | Contract State                 | Reentrant call detected. Recursive or re-entrant invocations are blocked.                        | shared, market, liquidity_pool, grants, royalty_distribution                           |
| **63**  | `OperationBlocked`        | Contract State                 | Operation is blocked by safety controls or security lock.                                        | shared, token_restrictions, dispute                                                    |
| **71**  | `ProposalExpired`         | Proposals & Governance         | Proposal voting or execution period has expired.                                                 | governance, grants                                                                     |
| **72**  | `ProposalAlreadyExecuted` | Proposals & Governance         | Proposal has already been executed and cannot be re-executed.                                    | governance, grants                                                                     |
| **73**  | `InsufficientApprovals`   | Proposals & Governance         | Insufficient votes, quorum, or multisig approvals to execute proposal.                           | governance, grants, shared                                                             |
| **74**  | `ProposalNotFound`        | Proposals & Governance         | Governance or grant proposal with the specified ID was not found.                                | governance, grants                                                                     |
| **91**  | `LimitExceeded`           | Limits & Restrictions          | Requested action exceeds configured limit, maximum cap, or quota.                                | token, token_restrictions, liquidity_pool, scholarship_fund                            |
| **92**  | `BlacklisterError`        | Limits & Restrictions          | Operation rejected because target account is restricted by blacklisting.                         | token_restrictions, token                                                              |
| **93**  | `WhitelistError`          | Limits & Restrictions          | Target account is not included in the required whitelist.                                        | token_restrictions, grants, registry                                                   |
| **94**  | `TransferDenied`          | Limits & Restrictions          | Transfer denied (e.g. soulbound token/badge, timelock active, or compliance check failed).       | certificate, badges, token_restrictions, token                                         |
| **95**  | `ApprovalRequired`        | Limits & Restrictions          | Explicit prior approval or token allowance is required before completing transfer.               | token, market, liquidity_pool                                                          |
| **111** | `CredentialExpired`       | Credential & Metadata Specific | Educational credential has passed its expiration date and is no longer valid.                    | certificate, credential_metadata                                                       |
| **112** | `CredentialNotValid`      | Credential & Metadata Specific | Credential has been revoked or failed cryptographic signature verification.                      | certificate, credential_metadata, registry                                             |
| **113** | `CredentialCannotRenew`   | Credential & Metadata Specific | Credential type is non-renewable or renewal criteria are not satisfied.                          | certificate, credential_metadata                                                       |
| **114** | `HashMismatch`            | Credential & Metadata Specific | Computed cryptographic content hash does not match the registered credential hash.               | credential_metadata, certificate, registry                                             |
| **131** | `NFTContractNotSet`       | NFT & Linkage                  | Linked NFT contract address is not configured in contract instance storage.                      | credential_metadata, certificate                                                       |
| **132** | `NFTMintFailed`           | NFT & Linkage                  | Cross-contract call to mint associated NFT failed or returned an error.                          | credential_metadata, certificate                                                       |
| **133** | `LinkageNotFound`         | NFT & Linkage                  | Linkage record between educational credential and NFT token was not found.                       | credential_metadata                                                                    |
| **200** | `OperationFailed`         | General Errors                 | General execution failure, arithmetic overflow, or internal contract error.                      | All Contracts                                                                          |

---

## Errors by Category

### Initialization & State

| Code  | Variant              | Description                                                                                   | Applicable Contracts                             |
| :---: | -------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **1** | `NotInitialized`     | Contract has not been initialized. Must call initialize(admin) before invoking other methods. | All Contracts                                    |
| **2** | `AlreadyInitialized` | Contract is already initialized. Re-initialization is strictly rejected.                      | All Contracts                                    |
| **3** | `InvalidState`       | The contract or referenced resource is in an invalid state for this operation.                | All Contracts, dispute, market, scholarship_fund |

### Authorization & Access Control

|  Code  | Variant        | Description                                                                                      | Applicable Contracts                                |
| :----: | -------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| **11** | `Unauthorized` | Caller is not authorized to execute this operation or required authentication is missing.        | All Contracts                                       |
| **12** | `AdminOnly`    | Operation restricted exclusively to the designated contract admin address.                       | All Contracts                                       |
| **13** | `CuratorOnly`  | Operation restricted exclusively to authorized curator or verifier accounts.                     | registry, dispute, certificate, credential_metadata |
| **14** | `InvalidRole`  | Caller lacks the required RBAC role (e.g., Instructor, Student, Admin) or invalid role supplied. | shared, registry, governance                        |

### Validation Errors

|  Code  | Variant             | Description                                                                              | Applicable Contracts                                                                   |
| :----: | ------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **21** | `InvalidAmount`     | Provided amount is zero, negative, insufficient, or exceeds allowed maximum.             | token, market, liquidity_pool, grants, scholarship_fund, buyback, royalty_distribution |
| **22** | `InvalidPercentage` | Percentage or basis point value is out of valid range (e.g. not 0-100% or > 10,000 bps). | analytics, royalty_distribution, liquidity_pool, governance                            |
| **23** | `InvalidTimestamp`  | Timestamp is invalid (e.g., in the past, expiration before start, or deadline elapsed).  | governance, grants, token_restrictions, certificate, credential_metadata               |
| **24** | `EmptyString`       | Required string parameter (e.g., symbol, URI, course ID, name) is empty.                 | analytics, badges, certificate, credential_metadata, nft, registry                     |
| **25** | `InvalidCredential` | Credential identifier or structure is invalid or malformed.                              | certificate, credential_metadata, registry                                             |
| **26** | `InvalidMetadata`   | Metadata URL, payload, or schema is invalid or exceeds maximum allowable length.         | certificate, credential_metadata, badges, nft                                          |

### State & Data

|  Code  | Variant         | Description                                                                                | Applicable Contracts                                      |
| :----: | --------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| **41** | `NotFound`      | Requested record, entity, account, listing, or proposal was not found in contract storage. | All Contracts                                             |
| **42** | `AlreadyExists` | An entity with the given identifier or parameters already exists in storage.               | badges, registry, certificate, market, token_restrictions |
| **43** | `AlreadyPaused` | Contract or subsystem is already paused; cannot pause again.                               | shared, token, market, liquidity_pool                     |
| **44** | `NotPaused`     | Contract or subsystem is not currently paused; cannot unpause.                             | shared, token, market, liquidity_pool                     |

### Contract State

|  Code  | Variant            | Description                                                                     | Applicable Contracts                                         |
| :----: | ------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **61** | `ContractPaused`   | Operation rejected because the contract is currently in emergency paused state. | shared, token, market, liquidity_pool, governance            |
| **62** | `ReentrantCall`    | Reentrant call detected. Recursive or re-entrant invocations are blocked.       | shared, market, liquidity_pool, grants, royalty_distribution |
| **63** | `OperationBlocked` | Operation is blocked by safety controls or security lock.                       | shared, token_restrictions, dispute                          |

### Proposals & Governance

|  Code  | Variant                   | Description                                                            | Applicable Contracts       |
| :----: | ------------------------- | ---------------------------------------------------------------------- | -------------------------- |
| **71** | `ProposalExpired`         | Proposal voting or execution period has expired.                       | governance, grants         |
| **72** | `ProposalAlreadyExecuted` | Proposal has already been executed and cannot be re-executed.          | governance, grants         |
| **73** | `InsufficientApprovals`   | Insufficient votes, quorum, or multisig approvals to execute proposal. | governance, grants, shared |
| **74** | `ProposalNotFound`        | Governance or grant proposal with the specified ID was not found.      | governance, grants         |

### Limits & Restrictions

|  Code  | Variant            | Description                                                                                | Applicable Contracts                                        |
| :----: | ------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| **91** | `LimitExceeded`    | Requested action exceeds configured limit, maximum cap, or quota.                          | token, token_restrictions, liquidity_pool, scholarship_fund |
| **92** | `BlacklisterError` | Operation rejected because target account is restricted by blacklisting.                   | token_restrictions, token                                   |
| **93** | `WhitelistError`   | Target account is not included in the required whitelist.                                  | token_restrictions, grants, registry                        |
| **94** | `TransferDenied`   | Transfer denied (e.g. soulbound token/badge, timelock active, or compliance check failed). | certificate, badges, token_restrictions, token              |
| **95** | `ApprovalRequired` | Explicit prior approval or token allowance is required before completing transfer.         | token, market, liquidity_pool                               |

### Credential & Metadata Specific

|  Code   | Variant                 | Description                                                                        | Applicable Contracts                       |
| :-----: | ----------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------ |
| **111** | `CredentialExpired`     | Educational credential has passed its expiration date and is no longer valid.      | certificate, credential_metadata           |
| **112** | `CredentialNotValid`    | Credential has been revoked or failed cryptographic signature verification.        | certificate, credential_metadata, registry |
| **113** | `CredentialCannotRenew` | Credential type is non-renewable or renewal criteria are not satisfied.            | certificate, credential_metadata           |
| **114** | `HashMismatch`          | Computed cryptographic content hash does not match the registered credential hash. | credential_metadata, certificate, registry |

### NFT & Linkage

|  Code   | Variant             | Description                                                                 | Applicable Contracts             |
| :-----: | ------------------- | --------------------------------------------------------------------------- | -------------------------------- |
| **131** | `NFTContractNotSet` | Linked NFT contract address is not configured in contract instance storage. | credential_metadata, certificate |
| **132** | `NFTMintFailed`     | Cross-contract call to mint associated NFT failed or returned an error.     | credential_metadata, certificate |
| **133** | `LinkageNotFound`   | Linkage record between educational credential and NFT token was not found.  | credential_metadata              |

### General Errors

|  Code   | Variant           | Description                                                                 | Applicable Contracts |
| :-----: | ----------------- | --------------------------------------------------------------------------- | -------------------- |
| **200** | `OperationFailed` | General execution failure, arithmetic overflow, or internal contract error. | All Contracts        |

---

## Coverage Across Contracts (All 20 Contracts)

Every contract crate in `contracts/*` adheres to the standard error codes:

| #   | Contract / Crate                 | Purpose                                                                                  | Primary Error Codes Used            |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | `contracts/analytics`            | Tracks student course progress, milestone completions, and aggregate platform metrics    | 1, 2, 3, 11, 12, 22, ... (9 total)  |
| 2   | `contracts/badges`               | Issues and manages soulbound and transferable skill/achievement badges                   | 1, 2, 3, 11, 12, 24, ... (11 total) |
| 3   | `contracts/buyback`              | Automated BST token buyback and burn/treasury mechanism using platform fees              | 1, 2, 3, 11, 12, 21, 41, 200        |
| 4   | `contracts/certificate`          | Issues and verifies verifiable, soulbound course completion certificates                 | 1, 2, 3, 11, 12, 13, ... (20 total) |
| 5   | `contracts/credential_metadata`  | Extended on-chain and off-chain metadata registry for educational credentials            | 1, 2, 3, 11, 12, 13, ... (19 total) |
| 6   | `contracts/dispute`              | Handles decentralized dispute resolution and escrow arbitration                          | 1, 2, 3, 11, 12, 13, ... (9 total)  |
| 7   | `contracts/governance`           | Community proposal creation, BST-weighted voting, and execution                          | 1, 2, 3, 11, 12, 14, ... (15 total) |
| 8   | `contracts/grants`               | Educational grant proposal management, milestone tracking, and fund disbursement         | 1, 2, 3, 11, 12, 21, ... (15 total) |
| 9   | `contracts/integration`          | End-to-end multi-contract workflow orchestration and test harness                        | 1, 2, 3, 11, 12, 41, 200            |
| 10  | `contracts/liquidity_pool`       | Automated market maker (AMM) constant-product pool for BST pairs                         | 1, 2, 3, 11, 12, 21, ... (15 total) |
| 11  | `contracts/market`               | Course and asset marketplace with escrow and multi-signature settlement                  | 1, 2, 3, 11, 12, 21, ... (14 total) |
| 12  | `contracts/nft`                  | Non-fungible token implementation for course credentials and collectible assets          | 1, 2, 3, 11, 12, 24, ... (9 total)  |
| 13  | `contracts/registry`             | Decentralized registry of verified course providers, educators, and verifiers            | 1, 2, 3, 11, 12, 13, ... (15 total) |
| 14  | `contracts/reputation`           | Tracks decentralized reputation scores for students, instructors, and reviewers          | 1, 2, 3, 11, 12, 41, 200            |
| 15  | `contracts/royalty_distribution` | Splits and distributes secondary sale and platform royalties to creators                 | 1, 2, 3, 11, 12, 21, ... (10 total) |
| 16  | `contracts/scholarship_fund`     | Manages student scholarship applications, donor funding, and disbursements               | 1, 2, 3, 11, 12, 21, ... (9 total)  |
| 17  | `contracts/shared`               | RBAC, access control, reentrancy guards, emergency pause, and protocol error definitions | 1, 2, 3, 11, 12, 14, ... (14 total) |
| 18  | `contracts/token`                | Brain-Storm Token (BST) SEP-41 standard token implementation with staking and airdrops   | 1, 2, 3, 11, 12, 21, ... (15 total) |
| 19  | `contracts/token_restrictions`   | Regulatory compliance, transfer limits, lockup schedules, and address blacklists         | 1, 2, 3, 11, 12, 23, ... (14 total) |
| 20  | `contracts/types`                | Shared cross-contract data types and interface serialization bindings                    | 1, 2, 3, 11, 12, 41, 200            |

---

## Client SDK & Backend Error Handling

### In `packages/sdk`

The SDK provides automatic translation from Soroban transaction error codes to typed SDK errors:

```typescript
import { BrainStormError, ErrorCode } from '@brain-storm/sdk';

try {
  await client.certificates.mintCertificate({ ... });
} catch (error) {
  if (error instanceof BrainStormError) {
    console.error(`Contract Error ${error.code}: ${error.message}`);
    // Example: Error code 12 -> AdminOnly
    if (error.code === 12) {
      // Prompt user to switch to admin wallet
    }
  }
}
```

### In `apps/backend`

The NestJS backend intercepts Soroban contract invocation failures and translates them into appropriate HTTP status codes via standard exception filters:

| Contract Error Code Range                  | HTTP Status                                     | Exception Type                                 |
| ------------------------------------------ | ----------------------------------------------- | ---------------------------------------------- |
| 1, 2, 3 (Initialization / State)           | 400 Bad Request / 409 Conflict                  | `BadRequestException` / `ConflictException`    |
| 11, 12, 13, 14 (Authorization / RBAC)      | 401 Unauthorized / 403 Forbidden                | `UnauthorizedException` / `ForbiddenException` |
| 21 - 40 (Validation)                       | 422 Unprocessable Entity                        | `UnprocessableEntityException`                 |
| 41 (NotFound)                              | 404 Not Found                                   | `NotFoundException`                            |
| 42 (AlreadyExists)                         | 409 Conflict                                    | `ConflictException`                            |
| 43, 44, 61, 62, 63 (Paused / Safety Guard) | 503 Service Unavailable / 429 Too Many Requests | `ServiceUnavailableException`                  |
| 71 - 90 (Governance / Proposals)           | 400 Bad Request / 410 Gone                      | `BadRequestException`                          |
| 91 - 110 (Limits / Blacklist / Whitelist)  | 403 Forbidden / 429 Too Many Requests           | `ForbiddenException`                           |
| 111 - 150 (Credentials / NFT Linkage)      | 400 Bad Request / 422 Unprocessable             | `BadRequestException`                          |
| 200 (OperationFailed)                      | 500 Internal Server Error                       | `InternalServerErrorException`                 |
