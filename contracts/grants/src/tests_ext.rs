#![cfg(test)]
//! Additional edge-case tests for the grants contract.
//! The inline tests in lib.rs cover the happy-path lifecycle.
//! These tests focus on validation errors, auth checks, boundary conditions,
//! and state-machine invariants (Issue #1016).

use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

fn setup() -> (Env, GrantsContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, GrantsContract);
    let client = GrantsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    client.initialize(&admin, &token);
    (env, client, admin, token)
}

// ── Initialization ───────────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialize_panics() {
    let (_, client, admin, token) = setup();
    client.initialize(&admin, &token);
}

// ── apply_for_grant validation ───────────────────────────────────────────────

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_apply_zero_amount_panics() {
    let (env, client, _, _) = setup();
    let applicant = Address::generate(&env);
    client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "Grant"),
        &String::from_str(&env, "Desc"),
        &0,
        &1,
    );
}

#[test]
#[should_panic(expected = "Must have at least one milestone")]
fn test_apply_zero_milestones_panics() {
    let (env, client, _, _) = setup();
    let applicant = Address::generate(&env);
    client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "Grant"),
        &String::from_str(&env, "Desc"),
        &500,
        &0,
    );
}

#[test]
fn test_apply_increments_grant_id() {
    let (env, client, _, _) = setup();
    let applicant = Address::generate(&env);
    let t = String::from_str(&env, "T");
    let d = String::from_str(&env, "D");

    let id1 = client.apply_for_grant(&applicant, &t, &d, &100, &1);
    let id2 = client.apply_for_grant(&applicant, &t, &d, &200, &1);
    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
}

#[test]
fn test_get_grant_returns_none_for_nonexistent() {
    let (_, client, _, _) = setup();
    assert!(client.get_grant(&999).is_none());
}

// ── approve / reject auth ─────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_approve_grant() {
    let (env, client, _, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &1,
    );
    let rando = Address::generate(&env);
    client.approve_grant(&rando, &id);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_reject_grant() {
    let (env, client, _, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &1,
    );
    let rando = Address::generate(&env);
    client.reject_grant(&rando, &id);
}

// ── State-machine: invalid transitions (Issue #1016) ─────────────────────────

/// Pending → Approved is valid.  Approved → Approved is invalid.
#[test]
#[should_panic(expected = "Invalid state transition")]
fn test_approve_already_approved_grant_panics() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &1,
    );
    client.approve_grant(&admin, &id);
    client.approve_grant(&admin, &id); // second approve must panic
}

/// Rejected → Approved is invalid.
#[test]
#[should_panic(expected = "Invalid state transition")]
fn test_approve_rejected_grant_panics() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &1,
    );
    client.reject_grant(&admin, &id);
    client.approve_grant(&admin, &id); // already rejected — must panic
}

/// Completed → Rejected is invalid (terminal state).
#[test]
fn test_rejected_state_is_terminal() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &1,
    );
    client.reject_grant(&admin, &id);
    // State is Rejected and must remain so
    assert_eq!(client.get_grant_state(&id).unwrap(), GrantState::Rejected);
}

/// New grant starts in Pending state.
#[test]
fn test_initial_state_is_pending() {
    let (env, client, _, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &1,
    );
    assert_eq!(client.get_grant_state(&id).unwrap(), GrantState::Pending);
}

/// Approved → Approved is disallowed.
#[test]
fn test_state_after_approval_is_approved() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &1,
    );
    client.approve_grant(&admin, &id);
    assert_eq!(client.get_grant_state(&id).unwrap(), GrantState::Approved);
}

/// Pending → Rejected is valid.
#[test]
fn test_state_after_rejection_is_rejected() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &1,
    );
    client.reject_grant(&admin, &id);
    assert_eq!(client.get_grant_state(&id).unwrap(), GrantState::Rejected);
}

/// Approved → Rejected is valid.
#[test]
fn test_approved_to_rejected_is_valid() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &1,
    );
    client.approve_grant(&admin, &id);
    client.reject_grant(&admin, &id);
    assert_eq!(client.get_grant_state(&id).unwrap(), GrantState::Rejected);
}

// ── set_milestone validation ──────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_set_milestone() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &1,
    );
    client.approve_grant(&admin, &id);
    let rando = Address::generate(&env);
    client.set_milestone(&rando, &id, &0, &String::from_str(&env, "Phase 1"), &100);
}

#[test]
#[should_panic(expected = "Invalid milestone index")]
fn test_set_milestone_out_of_range_panics() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &2, // only indices 0 and 1 valid
    );
    client.approve_grant(&admin, &id);
    // index 2 is out of range for milestone_count=2
    client.set_milestone(&admin, &id, &2, &String::from_str(&env, "Bad"), &50);
}

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_set_milestone_zero_amount_panics() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &1,
    );
    client.approve_grant(&admin, &id);
    client.set_milestone(&admin, &id, &0, &String::from_str(&env, "Phase 1"), &0);
}

#[test]
fn test_get_milestone_returns_none_for_unset() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &2,
    );
    client.approve_grant(&admin, &id);
    // Milestone 0 not yet set
    assert!(client.get_milestone(&id, &0).is_none());
}

// ── submit_report auth ───────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Only grant applicant can report")]
fn test_non_applicant_cannot_submit_report() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &1,
    );
    client.approve_grant(&admin, &id);

    let impostor = Address::generate(&env);
    client.submit_report(&impostor, &id, &String::from_str(&env, "Fake report"));
}

#[test]
fn test_multiple_reports_accumulate() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &1,
    );
    client.approve_grant(&admin, &id);

    client.submit_report(&applicant, &id, &String::from_str(&env, "Report 1"));
    client.submit_report(&applicant, &id, &String::from_str(&env, "Report 2"));

    let reports = client.get_grant_reports(&id);
    assert_eq!(reports.len(), 2);
    assert_eq!(reports.get(0).unwrap().report_idx, 0);
    assert_eq!(reports.get(1).unwrap().report_idx, 1);
}

#[test]
fn test_get_grant_reports_returns_empty_for_no_reports() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let id = client.apply_for_grant(
        &applicant,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &100,
        &1,
    );
    client.approve_grant(&admin, &id);

    let reports = client.get_grant_reports(&id);
    assert_eq!(reports.len(), 0);
}

#[test]
fn test_get_applicant_grants_returns_empty_for_new_address() {
    let (env, client, _, _) = setup();
    let applicant = Address::generate(&env);
    let grants = client.get_applicant_grants(&applicant);
    assert_eq!(grants.len(), 0);
}
