//! Credential metadata validation module
//! Centralizes common validation logic used across credential operations

use soroban_sdk::{Env, String};

use brain_storm_shared::ttl as shared_ttl;
use brain_storm_shared::validation as shared;

use crate::DataKey;

/// Checks if a credential metadata record exists
pub fn metadata_exists(env: &Env, credential_id: u64) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Metadata(credential_id))
}

/// Gets metadata if it exists, returns None otherwise.
///
/// Reads go through the shared TTL helpers (issue #79) so a live record's
/// time-to-live is extended on access, keeping frequently read metadata from
/// expiring out of persistent storage.
pub fn get_metadata_checked(env: &Env, credential_id: u64) -> Option<crate::MetadataRecord> {
    let key = DataKey::Metadata(credential_id);
    let record: Option<crate::MetadataRecord> = env.storage().persistent().get(&key);
    if record.is_some() {
        shared_ttl::bump_persistent(env, &key);
    }
    record
}

/// Gets metadata, panics if not found
pub fn get_metadata_or_panic(env: &Env, credential_id: u64) -> crate::MetadataRecord {
    get_metadata_checked(env, credential_id).expect("Credential metadata not found")
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

/// Non-panicking validity check for a stored credential (issue #1170).
///
/// Returns `false` when no record exists for `credential_id` (never panics on
/// a nonexistent credential), and otherwise validates every field of the
/// record the contract actually stores:
///
/// * `course_name` / `grade` — the same shared rules the write paths enforce,
/// * `ipfs_hash` — must be present (it is the record's only content pointer),
/// * `completion_date` / `expiry_timestamp` — a credential must not expire
///   before it was completed.
///
/// The rules come from `brain_storm_shared::validation`, so the report and the
/// rejection messages can never diverge.
pub fn is_metadata_valid(env: &Env, credential_id: u64) -> bool {
    match get_metadata_checked(env, credential_id) {
        Some(record) => {
            shared::is_valid_course_name(&record.course_name)
                && shared::is_valid_grade(&record.grade)
                && shared::is_non_empty_string(&record.ipfs_hash)
                && shared::is_valid_timestamp_order(
                    record.completion_date,
                    record.expiry_timestamp,
                )
        }
        None => false,
    }
}

/// Rejects invalid metadata fields on every write path (issue #1170).
///
/// Delegates to the shared rules so `credential_metadata` and `nft` validate
/// course names identically, and adds the content pointer check that applies
/// to every record this contract stores.
pub fn validate_metadata_fields(course_name: &String, grade: &String, ipfs_hash: &String) {
    shared::require_valid_course_name(course_name);
    shared::require_valid_grade(grade);
    shared::require_non_empty_string(ipfs_hash);
}

/// Rejects a completion/expiry pair where the credential expires before it
/// was completed (issue #78).
///
/// Delegates to the shared ordering rule so the write paths and
/// [`is_metadata_valid`] can never disagree.
pub fn validate_timestamp_order(completion_date: u64, expiry_timestamp: u64) {
    shared::require_valid_timestamp_order(completion_date, expiry_timestamp);
}

/// Validates timestamp is in the future
///
/// Thin wrapper over the shared rule (issue #1170): one implementation of
/// "must be in the future" for the whole workspace.
pub fn validate_future_timestamp(env: &Env, timestamp: u64) {
    shared::require_future_timestamp(env, timestamp);
}
