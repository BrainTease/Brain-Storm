#![cfg(test)]
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

use crate::{AnalyticsContract, AnalyticsContractClient, DataKey};

#[cfg(test)]
mod fuzz_tests {
    use proptest::prelude::*;
    use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};
    use crate::{AnalyticsContract, AnalyticsContractClient};

    fn setup() -> (Env, AnalyticsContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, AnalyticsContract);
        let client = AnalyticsContractClient::new(&env, &contract_id);
        (env, client)
    }

    proptest! {
        #[test]
        fn fuzz_record_progress_valid_range(progress_pct in 0u32..=100u32) {
            let (env, client) = setup();
            let student = Address::generate(&env);
            let course = symbol_short!("TEST");
            
            client.record_progress(&student, &course, &progress_pct);
            let rec = client.get_progress(&student, &course).unwrap();
            prop_assert_eq!(rec.progress_pct, progress_pct);
        }

        #[test]
        fn fuzz_record_progress_invalid_range(progress_pct in 101u32..=u32::MAX) {
            let (env, client) = setup();
            let student = Address::generate(&env);
            let course = symbol_short!("TEST");
            
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                client.record_progress(&student, &course, &progress_pct);
            }));
            prop_assert!(result.is_err());
        }
    }
}

fn setup() -> (Env, AnalyticsContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    (env, client)
}

#[test]
fn test_record_and_get_progress() {
    let (env, client) = setup();
    let student = Address::generate(&env);
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &course, &75);
    let rec = client.get_progress(&student, &course).unwrap();
    assert_eq!(rec.progress_pct, 75);
    assert!(!rec.completed);
}

#[test]
fn test_completed_flag_at_100() {
    let (env, client) = setup();
    let student = Address::generate(&env);
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &course, &100);
    let rec = client.get_progress(&student, &course).unwrap();
    assert!(rec.completed);
}

#[test]
#[should_panic(expected = "Progress must be 0-100")]
fn test_invalid_progress_panics() {
    let (env, client) = setup();
    let student = Address::generate(&env);
    client.record_progress(&student, &symbol_short!("X"), &101);
}

#[test]
#[should_panic(expected = "reentrant call")]
fn test_reentrancy_guard_on_record_progress() {
    let (env, client) = setup();
    env.as_contract(&client.address, || {
        env.storage().instance().set(&DataKey::Locked, &true);
    });
    let student = Address::generate(&env);
    client.record_progress(&student, &symbol_short!("X"), &50);
}

// =============================================================================
// #696 — Auth, boundary, and TTL tests
// =============================================================================

fn setup_with_admin() -> (Env, Address, AnalyticsContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, admin, client)
}

// ── Authorization failures ────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Unauthorized")]
fn test_unauthorized_caller_rejected() {
    let (env, _admin, client) = setup_with_admin();
    let student = Address::generate(&env);
    let attacker = Address::generate(&env);
    let course = symbol_short!("C1");
    // attacker is neither student, admin, nor authorized caller
    client.record_progress(&attacker, &student, &course, &50);
}

#[test]
fn test_student_can_record_own_progress() {
    let (env, _admin, client) = setup_with_admin();
    let student = Address::generate(&env);
    let course = symbol_short!("C2");
    client.record_progress(&student, &student, &course, &42);
    assert_eq!(client.get_progress(&student, &course).unwrap().progress_pct, 42);
}

#[test]
fn test_admin_can_record_any_progress() {
    let (env, admin, client) = setup_with_admin();
    let student = Address::generate(&env);
    let course = symbol_short!("C3");
    client.record_progress(&admin, &student, &course, &90);
    assert_eq!(client.get_progress(&student, &course).unwrap().progress_pct, 90);
}

#[test]
fn test_authorized_caller_can_record_progress() {
    let (env, admin, client) = setup_with_admin();
    let oracle = Address::generate(&env);
    let student = Address::generate(&env);
    let course = symbol_short!("C4");
    client.authorize_caller(&admin, &oracle);
    assert!(client.is_authorized_caller(&oracle));
    client.record_progress(&oracle, &student, &course, &55);
    assert_eq!(client.get_progress(&student, &course).unwrap().progress_pct, 55);
}

#[test]
#[should_panic]
fn test_revoked_caller_is_rejected() {
    let (env, admin, client) = setup_with_admin();
    let oracle = Address::generate(&env);
    let student = Address::generate(&env);
    let course = symbol_short!("C5");
    client.authorize_caller(&admin, &oracle);
    client.revoke_caller(&admin, &oracle);
    // should panic — oracle no longer authorized
    client.record_progress(&oracle, &student, &course, &30);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_authorize_caller() {
    let (env, _admin, client) = setup_with_admin();
    let rando = Address::generate(&env);
    let target = Address::generate(&env);
    client.authorize_caller(&rando, &target);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_revoke_caller() {
    let (env, admin, client) = setup_with_admin();
    let rando = Address::generate(&env);
    let oracle = Address::generate(&env);
    client.authorize_caller(&admin, &oracle);
    client.revoke_caller(&rando, &oracle);
}

#[test]
fn test_set_admin_updates_admin() {
    let (env, admin, client) = setup_with_admin();
    let new_admin = Address::generate(&env);
    client.set_admin(&new_admin);
    assert_eq!(client.get_admin(), new_admin);
    // original admin is no longer admin
    assert_ne!(client.get_admin(), admin);
}

// ── Boundary amounts ──────────────────────────────────────────────────────────

#[test]
fn test_zero_progress_is_valid() {
    let (env, _admin, client) = setup_with_admin();
    let student = Address::generate(&env);
    let course = symbol_short!("B0");
    client.record_progress(&student, &student, &course, &0);
    let rec = client.get_progress(&student, &course).unwrap();
    assert_eq!(rec.progress_pct, 0);
    assert!(!rec.completed);
}

#[test]
fn test_100_progress_marks_completed() {
    let (env, _admin, client) = setup_with_admin();
    let student = Address::generate(&env);
    let course = symbol_short!("B100");
    client.record_progress(&student, &student, &course, &100);
    assert!(client.get_progress(&student, &course).unwrap().completed);
}

#[test]
#[should_panic(expected = "Progress must be 0-100")]
fn test_101_progress_panics() {
    let (env, _admin, client) = setup_with_admin();
    let student = Address::generate(&env);
    client.record_progress(&student, &student, &symbol_short!("OVR"), &101);
}

#[test]
#[should_panic(expected = "Progress must be 0-100")]
fn test_u32_max_progress_panics() {
    let (env, _admin, client) = setup_with_admin();
    let student = Address::generate(&env);
    client.record_progress(&student, &student, &symbol_short!("MAX"), &u32::MAX);
}

// ── Progress decrements are allowed (re-enrollment) ──────────────────────────

#[test]
fn test_progress_can_be_updated_backwards() {
    let (env, _admin, client) = setup_with_admin();
    let student = Address::generate(&env);
    let course = symbol_short!("BWD");
    client.record_progress(&student, &student, &course, &80);
    client.record_progress(&student, &student, &course, &30);
    let rec = client.get_progress(&student, &course).unwrap();
    assert_eq!(rec.progress_pct, 30);
    assert!(!rec.completed);
}

// ── TTL extension ─────────────────────────────────────────────────────────────

#[test]
fn test_progress_record_exists_after_write() {
    // TTL is extended inside record_progress; verifying the record is readable
    // immediately after write (proxy for TTL being non-zero).
    let (env, _admin, client) = setup_with_admin();
    let student = Address::generate(&env);
    let course = symbol_short!("TTL");
    client.record_progress(&student, &student, &course, &60);
    assert!(client.get_progress(&student, &course).is_some());
}
