# Smart Contract Security Audit Preparation

## Overview

This document serves as the audit-readiness package for the Brain-Storm smart contract suite. It covers documented invariants per contract, known-risk register, reentrancy/auth/arithmetic review, and evidence of testing ahead of mainnet deployment.

**Date:** 2026-06-29  
**Scope:** All 17 contracts under `contracts/`  
**Prepared for:** External audit handoff

---

## 1. Invariants Per Contract

### Token (`contracts/token/`)

| Invariant | Description | Severity |
|-----------|-------------|----------|
| I-TOK-01 | Total supply must never exceed 10,000,000,000,000,000 base units (10 quadrillion) | Critical |
| I-TOK-02 | `balanceOf(a) + balanceOf(b) + ... = totalSupply` must hold at all times | Critical |
| I-TOK-03 | Minting is admin-only; `totalSupply` increases exactly by the minted amount | Critical |
| I-TOK-04 | Burning decreases `totalSupply` exactly by the burned amount; `BurnStats` are updated atomically | High |
| I-TOK-05 | Allowances cannot be set above `u128::MAX`; `approve` overwrites, `transfer_from` respects allowance | High |
| I-TOK-06 | Vesting schedules enforce `cliff >= start` and `end > cliff`; `claimed <= total_amount` always | High |
| I-TOK-07 | Reentrancy guard prevents concurrent state mutation in `transfer` / `transfer_from` | Critical |
| I-TOK-08 | Staking rewards are calculated only on staked balance; unstaking reduces staked amount atomically | Medium |

### Badges (`contracts/badges/`)

| Invariant | Description | Severity |
|-----------|-------------|----------|
| I-BAD-01 | Each badge has exactly one owner at any time | High |
| I-BAD-02 | `badge_type_record.total_minted` is monotonically non-decreasing and never overflows | High |
| I-BAD-03 | Only admin can define new badge types | High |
| I-BAD-04 | Burned badges cannot be transferred or unburned | Medium |

### Certificate (`contracts/certificate/`)

| Invariant | Description | Severity |
|-----------|-------------|----------|
| I-CER-01 | Each certificate ID is unique and monotonically increasing | Critical |
| I-CER-02 | Certificates are soulbound by default — transfer is rejected unless opt-in | High |
| I-CER-03 | Only authorized issuer can mint certificates | Critical |
| I-CER-04 | Revocation is irreversible; revoked certificates are marked and cannot be un-revoked | High |

### Market (`contracts/market/`)

| Invariant | Description | Severity |
|-----------|-------------|----------|
| I-MAR-01 | Escrow `amount` is locked on creation and released only on settlement or refund | Critical |
| I-MAR-02 | `Paused` flag prevents all state-mutating operations when set | High |
| I-MAR-03 | Fee basis points (`FeeBps`) cannot exceed 10,000 (100%) | High |
| I-MAR-04 | Treasury balance equals sum of fees collected minus fees withdrawn | Medium |

### Reputation (`contracts/reputation/`)

| Invariant | Description | Severity |
|-----------|-------------|----------|
| I-REP-01 | Score updates use `checked_add` / `checked_sub` and never overflow | High |
| I-REP-02 | Leaderboard reflects total scores; ties are allowed | Low |
| I-REP-03 | Decay configuration is admin-set and affects future scores only | Medium |

### Governance (`contracts/governance/`)

| Invariant | Description | Severity |
|-----------|-------------|----------|
| I-GOV-01 | Each proposal has a unique, monotonically increasing ID | Critical |
| I-GOV-02 | Voting weight is computed from token balance at snapshot; weight cannot change mid-vote | Critical |
| I-GOV-03 | Proposals have a fixed voting end ledger; votes cast after expiry are rejected | High |
| I-GOV-04 | `execute_proposal` can only be called once per proposal | High |
| I-GOV-05 | Vote delegation is transitive only one level (no delegation chains) | Medium |

### Liquidity Pool (`contracts/liquidity_pool/`)

| Invariant | Description | Severity |
|-----------|-------------|----------|
| I-LIQ-01 | `reserve_a * reserve_b` is constant (k) within a single swap operation | Critical |
| I-LIQ-02 | LP tokens minted/burned reflect proportional share of the pool | High |
| I-LIQ-03 | Emergency drain is admin-only and irreversibly empties reserves | High |

### Scholarship Fund (`contracts/scholarship_fund/`)

| Invariant | Description | Severity |
|-----------|-------------|----------|
| I-SCH-01 | Scholarship application counter is monotonically increasing | Medium |
| I-SCH-02 | Donor totals track cumulative contributions; cannot be decreased by non-admin | High |
| I-SCH-03 | Application status transitions are linear: pending → approved/rejected → distributed | Medium |

### Dispute (`contracts/dispute/`)

| Invariant | Description | Severity |
|-----------|-------------|----------|
| I-DIS-01 | Dispute lifecycle is strictly: Open → Evidence → Decision → Settled | High |
| I-DIS-02 | Only the assigned arbiter can transition dispute states | Critical |
| I-DIS-03 | Once settled, a dispute cannot be re-opened | High |

### NFT (`contracts/nft/`)

| Invariant | Description | Severity |
|-----------|-------------|----------|
| I-NFT-01 | Each NFT ID is unique and tied to exactly one course | Critical |
| I-NFT-02 | Only the owner can transfer or burn their NFT | High |
| I-NFT-03 | Course linkage is immutable after minting | Medium |

### Remaining Contracts

| Contract | Core Invariant | Severity |
|----------|---------------|----------|
| **Buyback** | Buyback reserve cannot be overdrawn; DEX interactions are stubbed until mainnet | High |
| **Credential Metadata** | Version history is append-only; each new version increases the counter | Medium |
| **Grants** | Grant milestones are sequential; funds released only after milestone completion | High |
| **Registry** | Verification levels and skills are admin/curator-gated | High |
| **Royalty Distribution** | Percentages must sum to exactly 100%; recipients must be unique | High |
| **Token Restrictions** | Whitelist/blacklist is mutually exclusive; transfer limits are per-address | Medium |

---

## 2. Authorization, Reentrancy & Arithmetic Safety Review

### Authorization Review

| Contract | Admin Auth | User Auth | Notes |
|----------|-----------|-----------|-------|
| token | ✅ `admin.require_auth()` on mint, burn, set_admin | ✅ `from.require_auth()` on transfer; `owner.require_auth()` on approve | Auth verified in all state-mutating functions |
| market | ✅ `admin.require_auth()` on fee set, pause, treasury withdraw | ✅ `payer.require_auth()` on escrow fund | `initialize` checks `!has(Admin)` — safe |
| governance | ✅ `admin.require_auth()` on config | ✅ `proposer.require_auth()` on create; voter auth on cast | Weighted voting reduces sybil risk |
| badges | ✅ admin-only minting, type definitions | N/A | Badges are soulbound; transfer rejected |
| certificate | ✅ admin/issuer-only minting | N/A | Soulbound by default |
| reputation | ✅ admin-only decay config, authorized callers | ✅ `user.require_auth()` on claim | `update_reputation` uses authorized caller pattern |
| dispute | ✅ arbiter gating | ✅ parties auth on submission | Lifecycle state machine enforced |
| liquidity_pool | ✅ admin only for drain | ✅ LP provider auth for add/remove | Swap is permissionless |
| remaining | ✅ Admin auth on all admin functions | ✅ User auth on user-scoped functions | Consistent pattern across all contracts |

### Reentrancy Review

| Contract | Reentrancy Guard | Risk Level | Notes |
|----------|-----------------|------------|-------|
| token | ✅ Custom lock in `transfer`, `transfer_from` | Low | Guard uses storage boolean; released on exit |
| market | ✅ State updates before cross-contract calls | Low | Escrow status set before external calls |
| governance | ❌ Not applicable | None | Soroban execution model prevents reentrant calls |
| others | ❌ Not needed | None | Soroban host-level reentrancy protection |

**Soroban Reentrancy Context:** The Soroban host runtime does not allow reentrant contract calls by default. However, the `token` contract implements an additional mutex for defense-in-depth.

### Arithmetic Safety Review

| Pattern | Usage | Status |
|---------|-------|--------|
| `checked_add` | Token amounts, vesting, reputation scores, badge counters | ✅ Used throughout |
| `checked_sub` | Balance deductions, allowance decrements | ✅ Used throughout |
| `checked_mul` | Fee calculations, reward computations | ✅ In critical paths |
| `saturating_add` | Analytics counters, non-critical stats | ✅ In analytics |
| Raw `+`/`-` | Only on verified-bounds loops and constants | ✅ All occurrences reviewed and deemed safe |
| `overflow-checks = true` | Enabled in release profile (Cargo.toml) | ✅ Panics on overflow in debug/release |

---

## 3. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|----|------|-----------|--------|------------|--------|
| R-01 | Admin key compromise | Low | Critical | Multi-sig admin (see `contracts/shared/src/multisig.rs`); timelock on upgrades | Implemented |
| R-02 | Reentrancy in token transfers | Low | High | Reentrancy guard lock in `transfer`/`transfer_from` | Implemented |
| R-03 | Integer overflow in amounts | Low | High | `checked_add`/`checked_sub` on all user-supplied amounts; overflow-checks in compiler | Implemented |
| R-04 | Unauthorized minting | Low | Critical | Admin-only mint with `require_auth()` | Implemented |
| R-05 | Governance proposal spam | Medium | Low | Minimum token weight to propose; gas costs | Implemented |
| R-06 | Oracle manipulation (buyback) | Low | High | DEX adapter not yet wired — flagged as LOW-03 in security-audit.md | Accepted |
| R-07 | Scholarship application DOS | Low | Low | u64 counter — practically inexhaustible for learning platform | Accepted |
| R-08 | Upgrade timelock bypass | Low | Critical | Admin auth + ledger-sequence timelock enforced in `upgrade.rs` | Implemented |
| R-09 | Cross-contract call spoofing | Low | Medium | Authorized caller whitelist in shared contract | Implemented |
| R-10 | Front-running of vesting claims | Low | Low | Claim is identity-gated; no economic incentive to front-run | Accepted |
| R-11 | Insufficient fee coverage for Soroban ops | Medium | Medium | All contracts use TTL extension for persistent storage | Implemented |
| R-12 | Incorrect royalty split calculation | Low | Medium | `require_percentages_sum_100()` enforced; percentages are u32 | Implemented |

---

## 4. Audit-Readiness Package

### 4.1 Source Code & Reproducible Build

- **Repository:** All contracts in `contracts/` directory
- **Compiler:** `rustc` via `rust-toolchain.toml` (pinned)
- **Build:** `cargo build --release` with `overflow-checks = true`, `panic = "abort"`
- **Reproducibility:** Cargo.lock committed; `cargo fetch --locked` for deterministic dependency resolution

### 4.2 Test Evidence

| Test Category | Location | Coverage |
|--------------|----------|----------|
| Unit tests | Each contract's `src/` + `#[cfg(test)] mod tests` | All public functions |
| Auth tests | `access_control_tests` in CI (contract-security-testing.yml) | Admin/user auth for all state-mutating fn |
| Reentrancy tests | token fuzz tests, shared reentrancy tests | Lock acquire/release cycles |
| Overflow tests | `overflow_underflow_tests` in CI | Boundary values for amounts, counters |
| Fuzz tests | `token/src/fuzz_tests.rs`, `certificate/src/fuzz_tests.rs` | Property-based with proptest |
| Integration tests | `contract-integration-testing.md` | Cross-contract scenarios |

### 4.3 CI/CD Security Gates

| Gate | File | Purpose |
|------|------|---------|
| SAST | `security-scanning.yml` (SonarQube) | Static analysis, code quality |
| Dependency scanning | `security-scan.yml`, `dependency-vulnerability-scanning.yml` | npm audit, cargo audit, Trivy, Grype, Snyk |
| Secret scanning | `security-scan.yml` (gitleaks) | Prevent committed secrets |
| DAST | `dast.yml`, `security-scanning.yml` (ZAP) | Dynamic API security testing |
| Contract security | `contract-security-testing.yml` | Reentrancy, overflow, auth tests |
| Supply chain | `deny.toml` | License compliance, CVE advisories |
| SBOM | `security-scan.yml` (Syft) | CycloneDX + SPDX SBOM generation |

### 4.4 Documentation Package

| Document | Location | Contents |
|----------|----------|----------|
| Security audit report | `docs/security-audit.md` | Full findings, methodology, tools |
| Contract invariants | `docs/CONTRACT_SECURITY.md` (this file) | Invariants per contract, risk register, auth review |
| Security best practices | `docs/security-best-practices.md` | Coding guidelines, patterns |
| Contract interfaces | `docs/contract-interfaces.md` | Public function signatures |
| Contract upgrades | `docs/contract-upgrades.md` | Upgrade mechanism, timelock |
| Fuzzing guide | `docs/contract-fuzzing-guide.md` | Property-based testing approach |
| Integration testing | `docs/contract-integration-testing.md` | Cross-contract test scenarios |

### 4.5 Pre-Mainnet Checklist

- [x] All critical/high findings from internal audit resolved
- [x] Reentrancy guards in place (token contract)
- [x] Overflow protection enabled (compiler + checked math)
- [x] Admin auth enforced on all privileged functions
- [x] `cargo clippy -- -D warnings` passes
- [x] `cargo deny check` passes
- [x] Fuzz tests run with 10,000+ iterations per property
- [x] Upgrade mechanism tested with timelock
- [ ] External audit engaged
- [ ] Bug bounty program launched
- [ ] Mainnet deployment script tested on testnet
- [ ] Emergency pause/drain tested in staging
