//! Credential metadata validation module
//! Centralizes common validation logic used across credential operations

use soroban_sdk::{Address, Env};
use crate::DataKey;

/// Validates that the caller is the contract admin
/// Returns the stored admin address for efficiency
pub fn validate_admin(env: &Env, caller: &Address) -> Address {
    let stored_admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .expect("Admin not set");
    assert!(*caller == stored_admin, "Only admin can perform this action");
    stored_admin
}

/// Checks if a credential metadata record exists
pub fn metadata_exists(env: &Env, credential_id: u64) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Metadata(credential_id))
}

/// Gets metadata if it exists, returns None otherwise
pub fn get_metadata_checked(env: &Env, credential_id: u64) -> Option<crate::MetadataRecord> {
    env.storage()
        .persistent()
        .get(&DataKey::Metadata(credential_id))
}

/// Gets metadata, panics if not found
pub fn get_metadata_or_panic(env: &Env, credential_id: u64) -> crate::MetadataRecord {
    env.storage()
        .persistent()
        .get(&DataKey::Metadata(credential_id))
        .expect("Credential metadata not found")
}

/// Validates that a credential is eligible for renewal based on grace period
pub fn is_renewable(env: &Env, credential_id: u64, grace_period: u64) -> bool {
    match get_metadata_checked(env, credential_id) {
        Some(record) => {
            let current_time = env.ledger().timestamp();
            current_time <= record.expiry_timestamp + grace_period
        }
        None => false,
    }
}

/// Validates timestamp is in the future
pub fn validate_future_timestamp(env: &Env, timestamp: u64) {
    let current_time = env.ledger().timestamp();
    assert!(
        timestamp > current_time,
        "Timestamp must be in the future"
    );
}
