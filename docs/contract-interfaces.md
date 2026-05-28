# Brain-Storm Smart Contract Reference

Complete interface documentation for all Soroban smart contracts on the Stellar network.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Analytics Contract](#analytics-contract)
3. [Token Contract (BST)](#token-contract-bst)
4. [Certificate Contract](#certificate-contract)
5. [Badge Contract](#badge-contract)
6. [Governance Contract](#governance-contract)
7. [Reputation Contract](#reputation-contract)
8. [Scholarship Fund Contract](#scholarship-fund-contract)
9. [Liquidity Pool Contract](#liquidity-pool-contract)
10. [Shared / RBAC Contract](#shared--rbac-contract)
11. [Security Considerations](#security-considerations)
12. [Upgrade Guide](#upgrade-guide)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Brain-Storm Contracts                     │
│                                                             │
│  ┌───────────┐   ┌──────────┐   ┌──────────────────────┐   │
│  │ Analytics │   │  Token   │   │     Certificate      │   │
│  │  (progress│   │  (BST)   │   │   (soulbound NFT)    │   │
│  │   & stats)│   │          │   │                      │   │
│  └─────┬─────┘   └────┬─────┘   └──────────────────────┘   │
│        │              │                                     │
│  ┌─────▼─────┐   ┌────▼──────┐   ┌──────────────────────┐  │
│  │   Badge   │   │Governance │   │      Reputation      │  │
│  │           │   │           │   │                      │  │
│  └───────────┘   └───────────┘   └──────────────────────┘  │
│                                                             │
│  ┌──────────────────┐   ┌────────────────────────────────┐  │
│  │  Scholarship Fund│   │       Liquidity Pool           │  │
│  └──────────────────┘   └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

All contracts follow the same initialization pattern:
- `initialize(admin)` — one-time setup, panics if called again
- `get_admin()` / `set_admin(new_admin)` — admin key rotation

---

## Analytics Contract

Tracks per-student course progress and emits Soroban events for off-chain indexers.

### Functions

| Function | Auth | Description |
|---|---|---|
| `initialize(admin)` | none | One-time setup |
| `set_admin(new_admin)` | admin | Transfer admin role |
| `get_admin()` | — | Read current admin |
| `record_progress(caller, student, course_id, progress_pct)` | caller | Record/update progress (0–100) |
| `reset_progress(admin, student, course_id)` | admin | Reset a student's progress |
| `get_progress(student, course_id)` | — | Read a progress record |
| `get_all_progress(student)` | — | All progress records for a student |
| `get_completed_courses(student)` | — | Completed courses list |
| `get_in_progress_courses(student)` | — | In-progress courses list |
| `get_progress_paginated(student, start, limit)` | — | Paginated progress records |
| `get_progress_above_threshold(student, threshold)` | — | Records above a progress % |
| `count_completed_courses(student)` | — | Count of completions |
| `get_average_progress(student)` | — | Average progress across all courses |
| `get_milestone(student, course_id, milestone_pct)` | — | Read a milestone record |
| `get_achieved_milestones(student, course_id)` | — | All achieved milestones |
| `get_total_students()` | — | Total students tracked |
| `get_total_courses()` | — | Total courses tracked |
| `get_completion_stats()` | — | Aggregate completion statistics |
| `get_daily_stats(day)` | — | Stats for a specific day |
| `get_weekly_stats(week)` | — | Stats for a specific week |
| `get_monthly_stats(month)` | — | Stats for a specific month |
| `get_top_performers(limit)` | — | Top students by completion count |
| `update_aggregates(admin)` | admin | Recalculate aggregate stats |

### Events

| Topics | Data | Condition |
|--------|------|-----------|
| `("analytics", "prog_upd")` | `(student, course_id, progress_pct)` | every `record_progress` call |
| `("analytics", "completed")` | `(student, course_id)` | when `progress_pct == 100` |
| `("analytics", "milestone")` | `(student, course_id, milestone_pct)` | when a milestone is first achieved |

### Usage Example

```bash
stellar contract invoke \
  --id $ANALYTICS_CONTRACT_ID \
  --source backend-keypair \
  --network testnet \
  -- record_progress \
  --caller $STUDENT_ADDRESS \
  --student $STUDENT_ADDRESS \
  --course_id RUST101 \
  --progress_pct 75
```

---

## Token Contract (BST)

ERC-20-compatible fungible token with vesting, staking, airdrop, and burn mechanics.

### Functions

| Function | Auth | Description |
|---|---|---|
| `initialize(admin, name, symbol, decimals, initial_supply)` | none | Deploy and mint initial supply to admin |
| `mint(admin, to, amount)` | admin | Mint new tokens |
| `burn(from, amount)` | from | Burn tokens (updates burn stats) |
| `transfer(from, to, amount)` | from | Transfer tokens |
| `approve(owner, spender, amount, expiry)` | owner | Set allowance |
| `transfer_from(spender, from, to, amount)` | spender | Transfer using allowance |
| `balance(account)` | — | Read balance |
| `allowance(owner, spender)` | — | Read allowance |
| `total_supply()` | — | Read total supply |
| `get_burn_stats()` | — | Cumulative burn data |
| `create_vesting(admin, beneficiary, amount, start, cliff, end)` | admin | Create vesting schedule |
| `claim_vesting(beneficiary, schedule_id)` | beneficiary | Claim vested tokens |
| `get_vesting(beneficiary, schedule_id)` | — | Read vesting schedule |

### Staking (via `staking` module)

| Function | Auth | Description |
|---|---|---|
| `stake(user, amount, lock_period)` | user | Stake BST tokens |
| `unstake(user)` | user | Unstake after lock period |
| `claim_staking_rewards(user)` | user | Claim accrued rewards |
| `get_stake(user)` | — | Read stake record |

### Airdrop (via `airdrop` module)

| Function | Auth | Description |
|---|---|---|
| `create_airdrop(admin, total, per_claim, merkle_root, expiry)` | admin | Set up airdrop |
| `claim_airdrop(claimer, proof)` | claimer | Claim from airdrop with Merkle proof |

---

## Certificate Contract

Issues soulbound (non-transferable) NFT certificates upon course completion.

### Functions

| Function | Auth | Description |
|---|---|---|
| `initialize(admin)` | none | One-time setup |
| `set_admin(new_admin)` | admin | Transfer admin role |
| `get_admin()` | — | Read admin |
| `mint_certificate(admin, recipient, course_id, metadata_url)` | admin | Issue certificate; returns `cert_id` |
| `get_certificate(id)` | — | Read a certificate by ID |
| `get_certificates_by_owner(owner)` | — | All certificates for an address |
| `revoke_certificate(admin, cert_id, reason)` | admin | Revoke a certificate |
| `is_revoked(cert_id)` | — | Check revocation status |
| `get_revocation(cert_id)` | — | Read revocation details |
| `transfer(...)` | — | Always panics — certificates are soulbound |

### Events

| Topics | Data | Condition |
|--------|------|-----------|
| `("cert", "mint")` | `(id, recipient, course_id)` | on mint |
| `("cert", "revoke")` | `(id, reason)` | on revocation |

### Usage Example

```bash
# Mint a certificate
stellar contract invoke \
  --id $CERTIFICATE_CONTRACT_ID \
  --source admin \
  --network testnet \
  -- mint_certificate \
  --admin $ADMIN_ADDRESS \
  --recipient $STUDENT_ADDRESS \
  --course_id RUST101 \
  --metadata_url "https://api.brain-storm.com/v1/certs/1"
```

---

## Badge Contract

Issues achievement badges (non-transferable) tied to badge type definitions.

### Functions

| Function | Auth | Description |
|---|---|---|
| `initialize(admin)` | none | One-time setup |
| `get_admin()` | — | Read admin |
| `create_badge_type(admin, badge_type, name, description, criteria)` | admin | Define a new badge type |
| `get_badge_type(badge_type)` | — | Read badge type definition |
| `mint_badge(admin, recipient, badge_type)` | admin | Issue badge; returns `badge_id` |
| `get_badge(id)` | — | Read badge by ID |
| `get_badges_by_owner(owner)` | — | All badges for an address |
| `verify_badge(owner, badge_type)` | — | Check if owner holds a badge type |
| `transfer(...)` | — | Always panics — badges are soulbound |

---

## Governance Contract

On-chain proposal voting and contract upgrade governance.

### Functions

| Function | Auth | Description |
|---|---|---|
| `initialize(admin, token_contract)` | none | One-time setup; links BST token for voting weight |
| `get_admin()` | — | Read admin |
| `create_proposal(proposer, title, description, voting_end)` | proposer | Submit a proposal |
| `vote(voter, proposal_id, support)` | voter | Cast vote (true = for, false = against) |
| `execute_proposal(proposal_id)` | — | Execute a passed proposal after voting ends |
| `get_proposal(proposal_id)` | — | Read proposal details |
| `has_voted(proposal_id, voter)` | — | Check if address voted |
| `propose_upgrade(proposer, new_wasm_hash, description)` | proposer | Propose contract upgrade |
| `vote_upgrade(voter, upgrade_id, support)` | voter | Vote on upgrade proposal |
| `approve_upgrade(upgrade_id)` | admin | Admin approval gate |
| `execute_upgrade(upgrade_id)` | — | Execute approved upgrade |
| `get_upgrade_proposal(upgrade_id)` | — | Read upgrade proposal |

---

## Reputation Contract

Tracks on-chain reputation scores with decay mechanics and threshold gating.

### Functions

| Function | Auth | Description |
|---|---|---|
| `initialize(admin)` | none | One-time setup |
| `get_admin()` | — | Read admin |
| `update_reputation(admin, user, delta, reason)` | admin | Add or subtract reputation points |
| `get_reputation(user)` | — | Read current score |
| `get_reputation_record(user)` | — | Full record with metadata |
| `get_reputation_level(user)` | — | Level (0–5) derived from score |
| `apply_decay(admin, user)` | admin | Apply time-based decay to a user |
| `set_decay_config(admin, rate, period)` | admin | Configure decay parameters |
| `get_decay_config()` | — | Read current decay config |
| `claim_reputation_reward(user)` | user | Claim token reward for reputation milestone |
| `verify_reputation_threshold(user, min_score)` | — | Boolean gate check |
| `verify_reputation_level(user, min_level)` | — | Boolean gate check |
| `get_reputation_history(user, start, limit)` | — | Paginated update history |
| `get_total_reputation()` | — | Sum of all reputation scores |

---

## Scholarship Fund Contract

Community-funded scholarships with application and approval workflow.

### Functions

| Function | Auth | Description |
|---|---|---|
| `initialize(admin)` | none | One-time setup |
| `donate(donor, amount)` | donor | Donate BST tokens to the fund |
| `apply_for_scholarship(applicant, course_id, amount, reason)` | applicant | Submit application |
| `approve_application(admin, app_id)` | admin | Approve and disburse tokens |
| `reject_application(admin, app_id)` | admin | Reject application |

---

## Liquidity Pool Contract

AMM-style BST/XLM liquidity pool with LP mining rewards.

### Functions

| Function | Auth | Description |
|---|---|---|
| `initialize(admin, token_a, token_b, fee_bps)` | none | One-time setup |
| `add_liquidity(user, amount_a, amount_b, min_lp)` | user | Provide liquidity; receive LP tokens |
| `remove_liquidity(user, lp_amount, min_a, min_b)` | user | Redeem LP tokens for underlying |
| `swap(user, token_in, amount_in, min_amount_out)` | user | Swap tokens via constant-product formula |
| `claim_mining_rewards(user)` | user | Claim accrued LP mining rewards |
| `get_pool_stats()` | — | Reserves, fee rate, total LP |
| `get_user_liquidity(user)` | — | User's LP token balance |
| `get_swap_history(start_index, limit)` | — | Paginated swap records |

---

## Shared / RBAC Contract

Role-based access control library used by other contracts for cross-contract authorization checks.

---

## Security Considerations

### Admin Key Management

- Admin addresses are stored in persistent contract storage.
- Use a hardware wallet or multi-sig Stellar account for the admin key.
- Rotate the admin key periodically via `set_admin`.

### Soulbound Tokens

Certificate and Badge contracts disable `transfer` by always panicking. This prevents secondary-market circumvention of credentials.

### Reentrancy Protection

The Token contract uses a `Locked` storage key as a reentrancy guard around state-mutating operations.

### Integer Overflow

All arithmetic uses Soroban SDK types with `overflow-checks = true` in the release profile (see `Cargo.toml`).

### Storage TTL

Persistent storage entries use `TTL_THRESHOLD` / `TTL_EXTEND_TO` ledger constants. Callers must ensure entry TTLs are extended for long-lived data (e.g., via `extend_ttl`).

### Event Integrity

Events are emitted by the contract address. Off-chain indexers should verify the emitting contract ID against the known deployed address before trusting event data.

---

## Upgrade Guide

Brain-Storm contracts use Soroban's built-in `update_current_contract_wasm` mechanism gated through the Governance contract.

### Process

1. **Build new WASM** — run `./scripts/build.sh` and note the new hash.
2. **Submit upgrade proposal** — call `propose_upgrade(proposer, new_wasm_hash, description)` on the Governance contract.
3. **Community voting** — token holders call `vote_upgrade(voter, upgrade_id, support)` during the voting window.
4. **Admin approval** — admin calls `approve_upgrade(upgrade_id)` if quorum is reached.
5. **Execute upgrade** — anyone calls `execute_upgrade(upgrade_id)`; the on-chain WASM is atomically replaced.
6. **Verify** — run `stellar contract info --id <CONTRACT_ID> --network testnet` to confirm the new hash.

### Storage Migration

If the new WASM introduces new storage keys, initialize them in the contract's first invocation after upgrade. Existing keys remain untouched.

### Rollback

Soroban does not natively support rollback. Keep the previous WASM hash and re-submit a new upgrade proposal pointing to it if a critical bug is discovered.

See also: [Smart Contract Upgrade Guide](./smart-contract-upgrade-guide.md)
