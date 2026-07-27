#![allow(unused)]
use soroban_sdk::{contracttype, symbol_short, Address, BytesN, Env, Symbol};

// =============================================================================
// Storage keys
// =============================================================================

#[contracttype]
pub enum UpgradeKey {
    PendingUpgrade,
    UpgradeHistory(u32),
    UpgradeHistoryCount,
}

// =============================================================================
// Types
// =============================================================================

#[contracttype]
#[derive(Clone)]
pub struct ScheduledUpgrade {
    pub new_wasm_hash: BytesN<32>,
    pub scheduled_at: u32,
    pub execute_after: u32,
    pub proposed_by: Address,
}

#[contracttype]
#[derive(Clone)]
pub struct UpgradeRecord {
    pub wasm_hash: BytesN<32>,
    pub upgraded_at: u32,
    pub upgraded_by: Address,
}

// =============================================================================
// Events
// =============================================================================

const UPGRADE_SCHEDULED: Symbol = symbol_short!("upg_schd");
const UPGRADE_EXECUTED: Symbol = symbol_short!("upg_exec");
const UPGRADE_CANCELLED: Symbol = symbol_short!("upg_cxl");

// =============================================================================
// Upgrade functions
// =============================================================================

/// Schedule a WASM upgrade with a timelock. Only callable by admin.
/// The upgrade will execute once `timelock_ledgers` ledgers have passed.
pub fn schedule_upgrade(
    env: &Env,
    admin: &Address,
    new_wasm_hash: BytesN<32>,
    timelock_ledgers: u32,
) {
    let current_ledger = env.ledger().sequence();
    let pending = ScheduledUpgrade {
        new_wasm_hash: new_wasm_hash.clone(),
        scheduled_at: current_ledger,
        execute_after: current_ledger
            .checked_add(timelock_ledgers)
            .expect("ledger overflow"),
        proposed_by: admin.clone(),
    };
    env.storage()
        .instance()
        .set(&UpgradeKey::PendingUpgrade, &pending);
    env.events().publish(
        (UPGRADE_SCHEDULED, symbol_short!("hash")),
        (admin, new_wasm_hash, current_ledger + timelock_ledgers),
    );
}

/// Execute a scheduled upgrade once the timelock has expired.
/// Stores the upgrade in history, then performs the WASM swap.
pub fn execute_upgrade(env: &Env, executor: &Address) {
    let pending: ScheduledUpgrade = env
        .storage()
        .instance()
        .get(&UpgradeKey::PendingUpgrade)
        .expect("No pending upgrade");

    assert!(
        env.ledger().sequence() >= pending.execute_after,
        "Timelock not expired"
    );

    let count: u32 = env
        .storage()
        .instance()
        .get(&UpgradeKey::UpgradeHistoryCount)
        .unwrap_or(0);

    let record = UpgradeRecord {
        wasm_hash: pending.new_wasm_hash.clone(),
        upgraded_at: env.ledger().sequence(),
        upgraded_by: executor.clone(),
    };
    env.storage()
        .instance()
        .set(&UpgradeKey::UpgradeHistory(count), &record);
    env.storage()
        .instance()
        .set(&UpgradeKey::UpgradeHistoryCount, &(count + 1));

    env.storage()
        .instance()
        .remove(&UpgradeKey::PendingUpgrade);

    env.events().publish(
        (UPGRADE_EXECUTED, symbol_short!("hash")),
        (executor, pending.new_wasm_hash.clone()),
    );

    // Perform the WASM upgrade — replaces this contract's code atomically.
    env.deployer()
        .update_current_contract_wasm(pending.new_wasm_hash);
}

/// Cancel a pending upgrade before it executes. Only callable by admin.
pub fn cancel_upgrade(env: &Env, admin: &Address) {
    assert!(
        env.storage()
            .instance()
            .has(&UpgradeKey::PendingUpgrade),
        "No pending upgrade to cancel"
    );
    env.storage()
        .instance()
        .remove(&UpgradeKey::PendingUpgrade);
    env.events().publish(
        (UPGRADE_CANCELLED, symbol_short!("admin")),
        admin,
    );
}

/// Returns the pending upgrade, if any.
pub fn get_pending_upgrade(env: &Env) -> Option<ScheduledUpgrade> {
    env.storage().instance().get(&UpgradeKey::PendingUpgrade)
}

/// Returns the number of completed upgrades.
pub fn get_upgrade_count(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&UpgradeKey::UpgradeHistoryCount)
        .unwrap_or(0)
}

/// Returns a specific upgrade history entry.
pub fn get_upgrade_record(env: &Env, index: u32) -> Option<UpgradeRecord> {
    env.storage()
        .instance()
        .get(&UpgradeKey::UpgradeHistory(index))
}
