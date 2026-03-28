#![cfg(test)]
use soroban_sdk::{symbol_short, testutils::{Address as _, Ledger, LedgerInfo}, Address, Env, FromVal, Symbol};

use crate::{AnalyticsContract, AnalyticsContractClient, DataKey};

fn setup() -> (Env, AnalyticsContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let student = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin, student)
}

fn set_ledger(env: &Env, sequence: u32) {
    env.ledger().set(LedgerInfo {
        sequence_number: sequence,
        timestamp: sequence as u64 * 5,
        protocol_version: 21,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 1000,
        min_persistent_entry_ttl: 1000,
        max_entry_ttl: 100_000,
    });
}

fn has_event(env: &Env, topic1: &str, topic2: &str) -> bool {
    let t1 = Symbol::new(env, topic1);
    let t2 = Symbol::new(env, topic2);
    env.events().all().iter().any(|e| {
        let topics = e.1;
        if topics.len() < 2 {
            return false;
        }
        let s0 = Symbol::from_val(env, &topics.get(0).unwrap());
        let s1 = Symbol::from_val(env, &topics.get(1).unwrap());
        s0 == t1 && s1 == t2
    })
}

// ============================================================================
// Initialize & Admin Tests
// ============================================================================

#[test]
fn test_initialize_sets_admin() {
    let (_, client, admin, _) = setup();
    assert_eq!(client.get_admin(), admin);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialize_panics() {
    let (_, client, admin, _) = setup();
    client.initialize(&admin);
}

#[test]
fn test_set_admin() {
    let (env, client, old_admin, _) = setup();
    let new_admin = Address::generate(&env);
    client.set_admin(&new_admin);
    assert_eq!(client.get_admin(), new_admin);
    assert_ne!(client.get_admin(), old_admin);
}

// ============================================================================
// Record Progress Tests (Happy Path)
// ============================================================================

#[test]
fn test_record_progress_0_percent() {
    let (_, client, _, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &0);
    let rec = client.get_progress(&student, &course).unwrap();
    assert_eq!(rec.progress_pct, 0);
    assert!(!rec.completed);
}

#[test]
fn test_record_progress_50_percent() {
    let (_, client, _, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &50);
    let rec = client.get_progress(&student, &course).unwrap();
    assert_eq!(rec.progress_pct, 50);
    assert!(!rec.completed);
}

#[test]
fn test_record_progress_100_percent() {
    let (_, client, _, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &100);
    let rec = client.get_progress(&student, &course).unwrap();
    assert_eq!(rec.progress_pct, 100);
    assert!(rec.completed);
}

// ============================================================================
// Progress Validation Tests
// ============================================================================

#[test]
#[should_panic(expected = "Progress must be 0-100")]
fn test_progress_over_100_panics() {
    let (_, client, _, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &101);
}

#[test]
#[should_panic(expected = "Progress must be 0-100")]
fn test_progress_way_over_100_panics() {
    let (_, client, _, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &200);
}

// ============================================================================
// Get Progress Tests
// ============================================================================

#[test]
fn test_get_progress_returns_none_for_unknown_student() {
    let (env, client, _, _) = setup();
    let unknown = Address::generate(&env);
    let course = symbol_short!("RUST101");
    assert!(client.get_progress(&unknown, &course).is_none());
}

#[test]
fn test_get_progress_returns_none_for_unknown_course() {
    let (_, client, _, student) = setup();
    let course = symbol_short!("UNKNOWN");
    assert!(client.get_progress(&student, &course).is_none());
}

#[test]
fn test_get_progress_returns_recorded_data() {
    let (_, client, _, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &75);
    let rec = client.get_progress(&student, &course).unwrap();
    assert_eq!(rec.student, student);
    assert_eq!(rec.course_id, course);
    assert_eq!(rec.progress_pct, 75);
}

// ============================================================================
// Completion Event Tests
// ============================================================================

#[test]
fn test_completion_event_emitted_at_100() {
    let (env, client, _, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &100);
    assert!(has_event(&env, "analytics", "completed"));
}

#[test]
fn test_completion_event_not_emitted_below_100() {
    let (env, client, _, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &99);
    assert!(!has_event(&env, "analytics", "completed"));
}

#[test]
fn test_progress_updated_event_always_emitted() {
    let (env, client, _, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &50);
    assert!(has_event(&env, "analytics", "prog_upd"));
}

#[test]
fn test_both_events_emitted_at_100() {
    let (env, client, _, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &100);
    assert!(has_event(&env, "analytics", "prog_upd"));
    assert!(has_event(&env, "analytics", "completed"));
}

// ============================================================================
// Authorization Tests
// ============================================================================

#[test]
fn test_student_can_record_own_progress() {
    let (_, client, _, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &75);
    let rec = client.get_progress(&student, &course).unwrap();
    assert_eq!(rec.progress_pct, 75);
}

#[test]
fn test_admin_can_record_student_progress() {
    let (_, client, admin, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&admin, &student, &course, &100);
    let rec = client.get_progress(&student, &course).unwrap();
    assert_eq!(rec.progress_pct, 100);
}

#[test]
#[should_panic(expected = "Unauthorized: must be student or admin")]
fn test_unauthorized_caller_rejected() {
    let (env, client, _, student) = setup();
    let rando = Address::generate(&env);
    let course = symbol_short!("RUST101");
    client.record_progress(&rando, &student, &course, &50);
}

#[test]
#[should_panic(expected = "Unauthorized: must be student or admin")]
fn test_third_party_cannot_record_for_other_student() {
    let (env, client, _, student) = setup();
    let other_student = Address::generate(&env);
    let rando = Address::generate(&env);
    let course = symbol_short!("RUST101");
    // rando is neither student nor admin
    client.record_progress(&rando, &other_student, &course, &50);
}

// ============================================================================
// Persistent Storage & TTL Tests
// ============================================================================

#[test]
fn test_record_survives_ledger_advance() {
    let (env, client, _, student) = setup();
    let course = symbol_short!("RUST101");
    set_ledger(&env, 1);
    client.record_progress(&student, &student, &course, &60);
    set_ledger(&env, 400);
    let rec = client.get_progress(&student, &course).unwrap();
    assert_eq!(rec.progress_pct, 60);
}

// ============================================================================
// Secondary Index Tests (get_all_progress)
// ============================================================================

#[test]
fn test_get_all_progress_empty() {
    let (_, client, _, student) = setup();
    let all = client.get_all_progress(&student);
    assert_eq!(all.len(), 0);
}

#[test]
fn test_get_all_progress_single_course() {
    let (_, client, _, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &80);
    let all = client.get_all_progress(&student);
    assert_eq!(all.len(), 1);
    assert_eq!(all.get(0).unwrap().progress_pct, 80);
}

#[test]
fn test_get_all_progress_multiple_courses() {
    let (_, client, _, student) = setup();
    let c1 = symbol_short!("RUST101");
    let c2 = symbol_short!("SOL201");
    let c3 = symbol_short!("WEB301");
    client.record_progress(&student, &student, &c1, &100);
    client.record_progress(&student, &student, &c2, &50);
    client.record_progress(&student, &student, &c3, &25);
    let all = client.get_all_progress(&student);
    assert_eq!(all.len(), 3);
}

#[test]
fn test_get_all_progress_no_duplicates_on_update() {
    let (_, client, _, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &50);
    client.record_progress(&student, &student, &course, &75);
    let all = client.get_all_progress(&student);
    assert_eq!(all.len(), 1);
    assert_eq!(all.get(0).unwrap().progress_pct, 75);
}

#[test]
fn test_get_all_progress_isolated_per_student() {
    let (env, client, _, student) = setup();
    let other = Address::generate(&env);
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &100);
    let all = client.get_all_progress(&other);
    assert_eq!(all.len(), 0);
}

// ============================================================================
// Reset Progress Tests
// ============================================================================

#[test]
fn test_admin_can_reset_progress() {
    let (_, client, admin, student) = setup();
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &80);
    client.reset_progress(&admin, &student, &course);
    assert!(client.get_progress(&student, &course).is_none());
}

#[test]
fn test_reset_removes_from_secondary_index() {
    let (_, client, admin, student) = setup();
    let c1 = symbol_short!("RUST101");
    let c2 = symbol_short!("SOL201");
    client.record_progress(&student, &student, &c1, &100);
    client.record_progress(&student, &student, &c2, &50);
    client.reset_progress(&admin, &student, &c1);
    let all = client.get_all_progress(&student);
    assert_eq!(all.len(), 1);
    assert_eq!(all.get(0).unwrap().course_id, c2);
}

#[test]
#[should_panic(expected = "Only admin can reset progress")]
fn test_non_admin_cannot_reset_progress() {
    let (env, client, _, student) = setup();
    let rando = Address::generate(&env);
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &student, &course, &80);
    client.reset_progress(&rando, &student, &course);
}
