# Smart Contract Upgrade Guide

This guide covers the full lifecycle of upgrading Brain-Storm's Soroban smart contracts: from understanding the upgrade mechanism, through testing and governance approval, to executing the upgrade and rolling back if needed.

---

## Table of Contents

- [How Soroban Upgrades Work](#how-soroban-upgrades-work)
- [Which Contracts Can Be Upgraded](#which-contracts-can-be-upgraded)
- [Storage Preservation & Data Migration](#storage-preservation--data-migration)
- [Testing Requirements Before Upgrade](#testing-requirements-before-upgrade)
- [Governance Approval Process](#governance-approval-process)
- [Upgrade Checklist](#upgrade-checklist)
- [Step-by-Step Upgrade Procedure](#step-by-step-upgrade-procedure)
- [Rollback Plan](#rollback-plan)
- [Security Considerations](#security-considerations)

---

## How Soroban Upgrades Work

Soroban contracts are upgraded **in-place**: the contract ID and all stored state remain unchanged. Only the executable WASM bytecode is replaced.

The `SharedContract` exposes the single upgrade entry point:

```rust
// contracts/shared/src/lib.rs
pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) {
    admin.require_auth();
    let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    assert!(admin == stored_admin, "Only admin can upgrade");

    env.events().publish(
        (symbol_short!("shared"), symbol_short!("upgraded")),
        new_wasm_hash.clone(),
    );

    env.deployer().update_current_contract_wasm(new_wasm_hash);
}
```

Key properties:

- **Admin-gated** — `admin.require_auth()` ensures the transaction must be signed by the address stored as `Admin` during `initialize`. No other address can call this function.
- **Atomic** — the WASM replacement happens in a single transaction. There is no window where the contract is partially upgraded.
- **Auditable** — a `("shared", "upgraded")` event is emitted containing the new WASM hash, creating an on-chain audit trail.
- **Storage-preserving** — all instance and persistent storage entries survive the upgrade unchanged (see [Storage Preservation](#storage-preservation--data-migration)).

---

## Which Contracts Can Be Upgraded

| Contract | Has `upgrade` fn | Upgrade path |
|---|---|---|
| `shared` | ✅ Yes | Call `SharedContract::upgrade` directly |
| `analytics` | ❌ No | Redeploy and re-initialize; migrate data if needed |
| `token` | ❌ No | Redeploy and re-initialize; migrate data if needed |
| `governance` | ❌ No | Redeploy and re-initialize; migrate data if needed |
| `certificate` | ❌ No | Redeploy and re-initialize; migrate data if needed |

> **Note:** Only `SharedContract` supports in-place WASM upgrade. For the other contracts, an upgrade means deploying a new contract instance and updating all references (contract IDs in `.env`, `deployed-contracts.json`, and any cross-contract calls).

---

## Storage Preservation & Data Migration

### In-place upgrade (SharedContract)

Because `update_current_contract_wasm` only replaces the WASM, **all storage is preserved automatically**:

| Storage type | Keys | Survives upgrade? |
|---|---|---|
| Instance | `Admin`, `Role(Address)` | ✅ Yes |
| Persistent | — (SharedContract has none) | ✅ Yes |

No data migration is needed for a SharedContract upgrade as long as the new WASM uses the same `DataKey` enum variants and value types.

**When migration IS needed:** If the new contract version adds, removes, or renames a `DataKey` variant, or changes the type of a stored value, you must write a one-time migration function in the new WASM that reads old keys and writes new ones. Call this migration function in the same transaction as the upgrade, or in the first transaction immediately after.

Example migration pattern (add to new contract before deploying):

```rust
// Run once after upgrade to rename a storage key
pub fn migrate_v1_to_v2(env: Env, admin: Address) {
    admin.require_auth();
    let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    assert!(admin == stored_admin, "Only admin");

    // Read old value under old key, write under new key, delete old
    if let Some(old_val) = env.storage().instance().get::<_, OldType>(&OldDataKey::SomeKey) {
        env.storage().instance().set(&DataKey::NewKey, &NewType::from(old_val));
        env.storage().instance().remove(&OldDataKey::SomeKey);
    }
}
```

### Redeploy (analytics, token, governance, certificate)

A redeploy creates a brand-new contract with a new contract ID. Persistent storage from the old contract is **not** accessible from the new one. Options:

1. **Accept data loss** — acceptable for testnet or non-critical data.
2. **Off-chain snapshot + replay** — read all persistent entries from the old contract via Horizon/RPC before decommissioning, then replay them into the new contract via `initialize` + setter calls.
3. **On-chain migration contract** — deploy a temporary migration contract that reads from the old contract and writes to the new one in a single transaction batch.

---

## Testing Requirements Before Upgrade

All of the following must pass before an upgrade is executed on mainnet.

### 1. Unit tests

```bash
cargo test
```

The upgrade auth guard is covered in `contracts/shared/src/tests.rs`:

```rust
#[test]
#[should_panic(expected = "Only admin can upgrade")]
fn test_non_admin_cannot_upgrade() { ... }
```

Ensure your new WASM passes all existing tests and any new tests covering changed behaviour.

### 2. Local sandbox integration test

Test the full upgrade flow against a local Soroban sandbox before touching testnet:

```bash
# Start a local sandbox
stellar network start local

# Deploy the current (old) contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/brain_storm_shared.wasm \
  --source alice \
  --network local

# Initialize it and record some state
stellar contract invoke --id $CONTRACT_ID --source alice --network local \
  -- initialize --admin $ADMIN_ADDRESS

# Build the new WASM
./scripts/build.sh

# Upload new WASM and capture hash
NEW_HASH=$(stellar contract upload \
  --wasm target/wasm32-unknown-unknown/release/brain_storm_shared.wasm \
  --source alice \
  --network local)

# Execute upgrade
stellar contract invoke --id $CONTRACT_ID --source alice --network local \
  -- upgrade --admin $ADMIN_ADDRESS --new_wasm_hash $NEW_HASH

# Verify state is preserved and new functions work
stellar contract invoke --id $CONTRACT_ID --source alice --network local \
  -- has_role --addr $ADMIN_ADDRESS --role Admin
```

### 3. Testnet dry-run

Repeat the full procedure on testnet using the contract IDs in `scripts/deployed-contracts.json` before touching mainnet.

### 4. Checklist of things to verify

- [ ] All `cargo test` pass on the new WASM
- [ ] `cargo clippy -- -D warnings` produces no warnings
- [ ] `cargo fmt --check` passes
- [ ] `cargo audit` shows no vulnerabilities
- [ ] New WASM hash matches the audited build (verify with `sha256sum`)
- [ ] Storage keys and value types are backward-compatible (or migration function is included)
- [ ] New entry points are tested end-to-end on local sandbox
- [ ] Upgrade tested on testnet and state verified post-upgrade

---

## Governance Approval Process

For **mainnet upgrades**, changes must go through the on-chain governance process using the `GovernanceContract`. BST token holders vote on proposals; a proposal passes when `votes_for > votes_against` after the voting period ends.

### 1. Create a proposal

Any BST holder can create a proposal. The `voting_end_ledger` must be in the future (roughly 1 ledger ≈ 5 seconds; a 7-day vote ≈ 120,960 ledgers).

```bash
# Calculate voting_end_ledger: current_ledger + 120960 (≈ 7 days)
CURRENT_LEDGER=$(stellar ledger current --network mainnet | jq '.sequence')
VOTING_END=$((CURRENT_LEDGER + 120960))

./scripts/invoke.sh mainnet governance create_proposal \
  --proposer $PROPOSER_ADDRESS \
  --title "Upgrade SharedContract to v1.2.0" \
  --description "Adds MFA role support. New WASM hash: $NEW_HASH. Audit report: https://..." \
  --voting_end_ledger $VOTING_END
```

The proposal description should include:
- What changed and why
- The new WASM hash (so voters can verify the build)
- Link to audit report or PR
- Rollback plan

### 2. Community voting

BST holders vote during the voting window. Voting power equals the voter's BST balance at the time of voting.

```bash
# Vote in favour
./scripts/invoke.sh mainnet governance vote \
  --voter $VOTER_ADDRESS \
  --proposal_id $PROPOSAL_ID \
  --support true

# Vote against
./scripts/invoke.sh mainnet governance vote \
  --voter $VOTER_ADDRESS \
  --proposal_id $PROPOSAL_ID \
  --support false
```

Check current vote tallies:

```bash
./scripts/invoke.sh mainnet governance get_proposal \
  --proposal_id $PROPOSAL_ID
# Returns: { votes_for, votes_against, voting_end_ledger, executed, ... }
```

### 3. Execute the proposal

After `voting_end_ledger` is reached, anyone can call `execute_proposal`. This marks the proposal as executed on-chain. The actual contract upgrade is then performed by the admin in a separate transaction.

```bash
./scripts/invoke.sh mainnet governance execute_proposal \
  --proposal_id $PROPOSAL_ID
```

### 4. Perform the upgrade

Only after the proposal is executed on-chain should the admin perform the WASM upgrade:

```bash
./scripts/invoke.sh mainnet shared upgrade \
  --admin $ADMIN_ADDRESS \
  --new_wasm_hash $NEW_HASH
```

> **Testnet upgrades** do not require governance approval. They can be executed directly by the admin for development and testing purposes.

---

## Upgrade Checklist

Use this checklist for every mainnet upgrade.

### Pre-upgrade

- [ ] New contract code reviewed and approved via PR
- [ ] `cargo test`, `cargo clippy`, `cargo fmt --check`, `cargo audit` all pass
- [ ] WASM built with `./scripts/build.sh` and hash recorded
- [ ] WASM hash verified against audited build (`sha256sum`)
- [ ] Storage compatibility confirmed (no breaking key/type changes, or migration function included)
- [ ] Full upgrade flow tested on local sandbox
- [ ] Full upgrade flow tested on testnet
- [ ] Governance proposal created with WASM hash and audit link
- [ ] Voting period completed and `votes_for > votes_against`
- [ ] `execute_proposal` called on-chain
- [ ] Admin key available and confirmed (hardware wallet / multisig ready)
- [ ] Old WASM hash recorded for rollback

### Upgrade execution

- [ ] Upload new WASM: `stellar contract upload ...` → capture `NEW_HASH`
- [ ] Verify `NEW_HASH` matches expected hash
- [ ] Call `upgrade(admin, NEW_HASH)` on the contract
- [ ] Confirm `("shared", "upgraded")` event emitted with correct hash

### Post-upgrade verification

- [ ] Call `has_role` / `has_permission` to confirm existing state is intact
- [ ] Call any new functions introduced in the upgrade
- [ ] Check Horizon event stream for the `upgraded` event
- [ ] Update `scripts/deployed-contracts.json` if contract ID changed (redeploy only)
- [ ] Update `.env` / CI secrets if contract IDs changed
- [ ] Announce upgrade completion to community

---

## Step-by-Step Upgrade Procedure

### SharedContract (in-place upgrade)

```bash
# 1. Build the new WASM
./scripts/build.sh

# 2. Upload the new WASM to the network (does NOT replace the contract yet)
NEW_HASH=$(stellar contract upload \
  --wasm target/wasm32-unknown-unknown/release/brain_storm_shared.wasm \
  --source "$STELLAR_SECRET_KEY" \
  --network mainnet)

echo "New WASM hash: $NEW_HASH"

# 3. Verify the hash matches your audited build
echo "$NEW_HASH  target/wasm32-unknown-unknown/release/brain_storm_shared.wasm" | sha256sum --check

# 4. Read the current contract ID
CONTRACT_ID=$(jq -r '.mainnet.shared' scripts/deployed-contracts.json)

# 5. Execute the upgrade (admin must sign)
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --network mainnet \
  -- upgrade \
  --admin "$ADMIN_ADDRESS" \
  --new_wasm_hash "$NEW_HASH"

# 6. Verify state is intact
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --network mainnet \
  -- has_role \
  --addr "$ADMIN_ADDRESS" \
  --role Admin
```

### Analytics / Token / Governance / Certificate (redeploy)

```bash
# 1. Build
./scripts/build.sh

# 2. Deploy new instance
./scripts/deploy.sh mainnet analytics
# → new CONTRACT_ID written to scripts/deployed-contracts.json

# 3. Initialize the new contract
NEW_CONTRACT_ID=$(jq -r '.mainnet.analytics' scripts/deployed-contracts.json)

stellar contract invoke \
  --id "$NEW_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --network mainnet \
  -- initialize \
  --admin "$ADMIN_ADDRESS"

# 4. Replay any persistent data from the old contract (if required)
# See "Storage Preservation & Data Migration" section above.

# 5. Update ANALYTICS_CONTRACT_ID in .env and CI secrets
# 6. Redeploy the backend to pick up the new contract ID
```

---

## Rollback Plan

### SharedContract rollback

Because the old WASM is still stored on-chain (Stellar never deletes uploaded WASMs), rollback is identical to an upgrade — just use the old WASM hash.

```bash
# Record the current hash BEFORE upgrading (do this as part of pre-upgrade checklist)
OLD_HASH=$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --network mainnet \
  -- get_wasm_hash 2>/dev/null || echo "record manually from Horizon")

# If the upgrade causes issues, roll back by calling upgrade with the old hash
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --network mainnet \
  -- upgrade \
  --admin "$ADMIN_ADDRESS" \
  --new_wasm_hash "$OLD_HASH"
```

> Always record the current WASM hash before upgrading. You can retrieve it from the Horizon API or Stellar Laboratory by inspecting the contract's ledger entry.

### Redeployed contract rollback

If a redeployed contract (analytics, token, etc.) has issues:

1. The old contract instance is still live on-chain — it was never destroyed.
2. Revert `scripts/deployed-contracts.json` to the old contract ID.
3. Revert the `*_CONTRACT_ID` environment variables and redeploy the backend.
4. The old contract resumes serving requests immediately.

---

## Security Considerations

- **Protect the admin key.** The admin key is the sole authority for upgrades. Use a hardware wallet (Ledger) or a multisig account in production. Never store the admin secret key in `.env` files committed to version control.

- **Verify WASM hashes.** Before calling `upgrade`, independently verify that `NEW_HASH` matches the hash of the audited WASM binary. A compromised build pipeline could produce a different binary than the reviewed source.

- **Audit before mainnet.** Every mainnet upgrade should have an external or internal security review. Include the audit report link in the governance proposal.

- **Test on testnet first.** Always run the complete upgrade procedure on testnet before mainnet. Testnet contract IDs are in `scripts/deployed-contracts.json` under the `testnet` key.

- **Time-lock for high-impact upgrades.** Consider adding a time-lock to the admin role for production: submit the upgrade transaction but delay execution by N ledgers, giving the community time to detect and respond to a malicious upgrade.

- **Monitor post-upgrade.** Watch the Horizon event stream for unexpected events after an upgrade. The `("shared", "upgraded")` event should be the only upgrade-related event. Set up alerts via the monitoring stack (`infra/monitoring/`) for anomalous contract activity.
