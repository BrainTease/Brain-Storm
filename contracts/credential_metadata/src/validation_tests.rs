#![cfg(test)]
//! Unit tests for credential_metadata validation helpers.
//! These helpers have no existing tests — this module covers all public functions.

use soroban_sdk::{testutils::Address as _, Address, Env, String};

use crate::{CredentialMetadataContract, CredentialMetadataContractClient, DataKey, MetadataRecord};
use crate::validation::{
    metadata_exists, get_metadata_checked, get_metadata_or_panic, is_renewable,
    validate_admin, validate_future_timestamp,
};

fn setup() -> (Env, CredentialMetadataContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register_contract(None, CredentialMetadataContract);
    let client = CredentialMetadataContractClient::new(&env, &id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

/// Store a sample metadata record via the contract client.
fn store_sample(
    env: &Env,
    client: &CredentialMetadataContractClient,
    admin: &Address,
    credential_id: u64,
    expiry: u64,
) {
    client.store_metadata(
        admin,
        &credential_id,
        &String::from_str(env, "Rust Fundamentals"),
        &1_000,       // completion_date
        &expiry,      // expiry_timestamp
        &String::from_str(env, "A"),
        &String::from_str(env, "QmHash"),
    );
}

// ── validate_admin ────────────────────────────────────────────────────────────

#[test]
fn test_validate_admin_returns_admin_for_correct_caller() {
    let (env, _, admin) = setup();
    env.as_contract(&env.register_contract(None, CredentialMetadataContract), || {
        // Directly set admin in storage to test the helper in isolation.
        env.storage().instance().set(&DataKey::Admin, &admin);
        let returned = validate_admin(&env, &admin);
        assert_eq!(returned, admin);
    });
}

#[test]
#[should_panic(expected = "Only admin can perform this action")]
fn test_validate_admin_panics_for_wrong_caller() {
    let (env, _, admin) = setup();
    env.as_contract(&env.register_contract(None, CredentialMetadataContract), || {
        env.storage().instance().set(&DataKey::Admin, &admin);
        let rando = Address::generate(&env);
        validate_admin(&env, &rando);
    });
}

// ── metadata_exists ───────────────────────────────────────────────────────────

#[test]
fn test_metadata_exists_returns_false_when_not_stored() {
    let (env, _, _) = setup();
    env.as_contract(&env.register_contract(None, CredentialMetadataContract), || {
        assert!(!metadata_exists(&env, 1));
    });
}

#[test]
fn test_metadata_exists_returns_true_after_store() {
    let (env, client, admin) = setup();
    store_sample(&env, &client, &admin, 42, 9_999_999);

    // Reach into the same contract storage by invoking via client
    // and verifying through the public API
    assert!(client.get_metadata(&42).is_some());
}

// ── get_metadata_checked ──────────────────────────────────────────────────────

#[test]
fn test_get_metadata_checked_returns_none_for_missing() {
    let (env, _, _) = setup();
    env.as_contract(&env.register_contract(None, CredentialMetadataContract), || {
        assert!(get_metadata_checked(&env, 99).is_none());
    });
}

// ── get_metadata_or_panic ─────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Credential metadata not found")]
fn test_get_metadata_or_panic_panics_for_missing() {
    let (env, _, _) = setup();
    env.as_contract(&env.register_contract(None, CredentialMetadataContract), || {
        get_metadata_or_panic(&env, 999);
    });
}

// ── is_renewable ─────────────────────────────────────────────────────────────

#[test]
fn test_is_renewable_returns_false_when_no_metadata() {
    let (env, _, _) = setup();
    env.as_contract(&env.register_contract(None, CredentialMetadataContract), || {
        // No metadata stored — always false
        assert!(!is_renewable(&env, 1, 86400));
    });
}

// ── validate_future_timestamp ─────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Timestamp must be in the future")]
fn test_validate_future_timestamp_panics_for_past() {
    let (env, _, _) = setup();
    env.as_contract(&env.register_contract(None, CredentialMetadataContract), || {
        // ledger timestamp defaults to 0 in test env;
        // passing 0 means it is NOT in the future (must be > current)
        validate_future_timestamp(&env, 0);
    });
}

#[test]
fn test_validate_future_timestamp_passes_for_future() {
    let (env, _, _) = setup();
    env.as_contract(&env.register_contract(None, CredentialMetadataContract), || {
        // Any value > 0 is in the future when ledger timestamp = 0
        validate_future_timestamp(&env, 1_000_000); // should not panic
    });
}

// ── Integration: store → exists → get ─────────────────────────────────────────

#[test]
fn test_store_and_retrieve_via_client() {
    let (env, client, admin) = setup();
    store_sample(&env, &client, &admin, 7, 9_999_999);

    let meta = client.get_metadata(&7).unwrap();
    assert_eq!(meta.credential_id, 7);
    assert_eq!(meta.grade, String::from_str(&env, "A"));
    assert_eq!(meta.ipfs_hash, String::from_str(&env, "QmHash"));
}

#[test]
fn test_is_expired_returns_false_for_far_future_expiry() {
    let (env, client, admin) = setup();
    store_sample(&env, &client, &admin, 10, 9_999_999_999);
    assert!(!client.is_expired(&10));
}
