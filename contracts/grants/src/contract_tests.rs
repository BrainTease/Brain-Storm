//! Contract test suite for `grants`.
//!
//! Split out of `lib.rs` (issue #1324).

use super::*;
use soroban_sdk::testutils::Address as _;

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

#[test]
fn test_initialize() {
    let (_, client, admin, _) = setup();
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn test_apply_for_grant() {
    let (env, client, _, _) = setup();
    let applicant = Address::generate(&env);
    let title = String::from_str(&env, "Blockchain Education");
    let desc = String::from_str(&env, "Course development");

    let id = client.apply_for_grant(&applicant, &title, &desc, &1000, &2);
    assert_eq!(id, 1);

    let grant = client.get_grant(&id).unwrap();
    assert_eq!(grant.applicant, applicant);
    assert_eq!(grant.total_amount, 1000);
    assert_eq!(grant.milestone_count, 2);
}

#[test]
fn test_approve_grant() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "Test");

    let id = client.apply_for_grant(&applicant, &title, &desc, &1000, &1);
    client.approve_grant(&admin, &id);

    let grant = client.get_grant(&id).unwrap();
    assert_eq!(grant.status, symbol_short!("approved"));
}

#[test]
fn test_reject_grant() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "Test");

    let id = client.apply_for_grant(&applicant, &title, &desc, &1000, &1);
    client.reject_grant(&admin, &id);

    let grant = client.get_grant(&id).unwrap();
    assert_eq!(grant.status, symbol_short!("rejected"));
}

#[test]
fn test_set_milestone() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "Test");

    let grant_id = client.apply_for_grant(&applicant, &title, &desc, &1000, &2);
    client.approve_grant(&admin, &grant_id);

    let milestone_desc = String::from_str(&env, "Phase 1");
    client.set_milestone(&admin, &grant_id, &0, &milestone_desc, &500);

    let milestone = client.get_milestone(&grant_id, &0).unwrap();
    assert_eq!(milestone.amount, 500);
    assert!(!milestone.released);
}

#[test]
fn test_submit_report() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "Test");

    let grant_id = client.apply_for_grant(&applicant, &title, &desc, &1000, &1);
    client.approve_grant(&admin, &grant_id);

    let report = String::from_str(&env, "Progress update");
    client.submit_report(&applicant, &grant_id, &report);

    let reports = client.get_grant_reports(&grant_id);
    assert_eq!(reports.len(), 1);
}

#[test]
fn test_get_applicant_grants() {
    let (env, client, admin, _) = setup();
    let applicant = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "Test");

    let id1 = client.apply_for_grant(&applicant, &title, &desc, &1000, &1);
    let id2 = client.apply_for_grant(&applicant, &title, &desc, &2000, &1);

    let grants = client.get_applicant_grants(&applicant);
    assert_eq!(grants.len(), 2);
    assert_eq!(grants.get(0).unwrap(), id1);
    assert_eq!(grants.get(1).unwrap(), id2);
}
