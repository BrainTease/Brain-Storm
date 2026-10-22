use soroban_sdk::{contracttype, Address, Env, Vec};

use crate::types::{Escrow, LockStatus, Product, Purchase};

#[contracttype]
pub enum DataKey {
    Admin,
    FeeBps,
    Treasury,
    TreasuryBalance,
    Escrow(u64),
    NextEscrowId,
    Paused,
    Product(u32),
    Listing(u32),
    Purchase(u32),
    ProductCounter,
    ReentrancyLock,
}

pub fn assert_admin_addr(env: &Env, caller: &Address) {
    let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    assert!(*caller == admin, "Only admin");
}

pub fn is_paused_internal(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Paused)
        .unwrap_or(false)
}

pub fn require_not_paused(env: &Env) {
    assert!(!is_paused_internal(env), "Contract is paused");
}

pub fn acquire_lock(env: &Env) -> Result<(), crate::types::MarketError> {
    let status: LockStatus = env
        .storage()
        .instance()
        .get(&DataKey::ReentrancyLock)
        .unwrap_or(LockStatus::Unlocked);
    if status == LockStatus::Locked {
        return Err(crate::types::MarketError::ReentrancyLocked);
    }
    env.storage()
        .instance()
        .set(&DataKey::ReentrancyLock, &LockStatus::Locked);
    Ok(())
}

pub fn release_lock(env: &Env) {
    env.storage()
        .instance()
        .set(&DataKey::ReentrancyLock, &LockStatus::Unlocked);
}

pub fn is_locked(env: &Env) -> bool {
    let status: LockStatus = env
        .storage()
        .instance()
        .get(&DataKey::ReentrancyLock)
        .unwrap_or(LockStatus::Unlocked);
    status == LockStatus::Locked
}

// ── Batched reads (#1322) ────────────────────────────────────────────────────
//
// The market views used to call `storage().get` inline for every entry. These
// helpers keep the traversal in one place, so a view performs a single pass
// over the id range and callers can be measured as one batch.

/// Read a contiguous range of products `[start, end)` in one pass.
pub fn read_products_batch(env: &Env, start: u32, end: u32) -> Vec<Product> {
    let mut products = Vec::new(env);
    for id in start..end {
        if let Some(product) = env.storage().persistent().get(&DataKey::Product(id)) {
            products.push_back(product);
        }
    }
    products
}

/// Read a contiguous range of purchases `[start, end)` in one pass.
pub fn read_purchases_batch(env: &Env, start: u32, end: u32) -> Vec<Purchase> {
    let mut purchases = Vec::new(env);
    for id in start..end {
        if let Some(purchase) = env.storage().persistent().get(&DataKey::Purchase(id)) {
            purchases.push_back(purchase);
        }
    }
    purchases
}

/// Read all requested escrows before processing them, returning `None` for any
/// id that does not exist. Batch operations use this so their storage reads are
/// grouped instead of interleaved with writes.
pub fn read_escrows_batch(env: &Env, escrow_ids: &Vec<u64>) -> Vec<Option<Escrow>> {
    let mut escrows = Vec::new(env);
    for id in escrow_ids.iter() {
        escrows.push_back(env.storage().persistent().get(&DataKey::Escrow(id)));
    }
    escrows
}
