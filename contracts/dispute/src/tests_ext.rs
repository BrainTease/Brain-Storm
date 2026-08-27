#![cfg(test)]
//! Additional tests for the dispute contract covering:
//! - set_arbiter: admin-only, updates arbiter
//! - get_dispute: returns correct record, None for missing
//! - open_dispute: zero/negative amount panics, id increments
//! - settle: before decision panics, double-settle panics
//! - submit_evidence: only parties can submit, settled dispute panics

use super::*;
use soroban_sdk::{testutils::Address as _, BytesN, Env};

fn setup() -> (Env, DisputeContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register_contract(None, DisputeContract);
    let client = DisputeContractClient::new(&env, &id);
    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);
    client.initialize(&admin, &arbiter);
    (env, client, admin, arbiter)
}

fn open_and_decide(
    env: &Env,
    client: &DisputeContractClient,
    arbiter: &Address,
    outcome: Outcome,
) -> u64 {
    let claimant = Address::generate(env);
    let respondent = Address::generate(env);
    let id = client.open_dispute(&claimant, &respondent, &1_000);
    client.record_decision(arbiter, &id, &outcome);
    id
}

// ── set_arbiter ───────────────────────────────────────────────────────────────

#[test]
fn test_set_arbiter_updates_arbiter() {
    let (env, client, admin, _) = setup();
    let new_arbiter = Address::generate(&env);
    client.set_arbiter(&admin, &new_arbiter);
    assert_eq!(client.get_arbiter(), new_arbiter);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_set_arbiter() {
    let (env, client, _, _) = setup();
    let rando = Address::generate(&env);
    let new_arbiter = Address::generate(&env);
    client.set_arbiter(&rando, &new_arbiter);
}

// ── get_dispute ───────────────────────────────────────────────────────────────

#[test]
fn test_get_dispute_returns_none_for_missing() {
    let (_, client, _, _) = setup();
    assert!(client.get_dispute(&999).is_none());
}

#[test]
fn test_get_dispute_returns_correct_record() {
    let (env, client, _, _) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);

    let id = client.open_dispute(&claimant, &respondent, &500);
    let dispute = client.get_dispute(&id).unwrap();

    assert_eq!(dispute.id, id);
    assert_eq!(dispute.claimant, claimant);
    assert_eq!(dispute.respondent, respondent);
    assert_eq!(dispute.amount, 500);
    assert_eq!(dispute.status, DisputeStatus::Open);
}

// ── open_dispute validation ───────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_open_dispute_zero_amount_panics() {
    let (env, client, _, _) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    client.open_dispute(&claimant, &respondent, &0);
}

#[test]
fn test_open_dispute_increments_id() {
    let (env, client, _, _) = setup();
    let c = Address::generate(&env);
    let r = Address::generate(&env);
    let id1 = client.open_dispute(&c, &r, &100);
    let id2 = client.open_dispute(&c, &r, &200);
    assert_eq!(id2, id1 + 1);
}

// ── settle ────────────────────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Must be in Decision status")]
fn test_settle_before_decision_panics() {
    let (env, client, _, arbiter) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    let id = client.open_dispute(&claimant, &respondent, &1_000);
    // Skip record_decision — settle should panic
    client.settle(&arbiter, &id);
}

#[test]
#[should_panic(expected = "Must be in Decision status")]
fn test_double_settle_panics() {
    let (env, client, _, arbiter) = setup();
    let id = open_and_decide(&env, &client, &arbiter, Outcome::FavourClaimant);
    client.settle(&arbiter, &id); // first settle ok
    client.settle(&arbiter, &id); // second should panic — already Settled
}

#[test]
#[should_panic(expected = "Unauthorized: authority required")]
fn test_non_arbiter_cannot_settle() {
    let (env, client, _, arbiter) = setup();
    let id = open_and_decide(&env, &client, &arbiter, Outcome::FavourClaimant);
    let rando = Address::generate(&env);
    client.settle(&rando, &id);
}

#[test]
fn test_settle_favour_claimant_pays_full_amount() {
    let (env, client, _, arbiter) = setup();
    let id = open_and_decide(&env, &client, &arbiter, Outcome::FavourClaimant);
    let (c, r) = client.settle(&arbiter, &id);
    assert_eq!(c, 1_000);
    assert_eq!(r, 0);
}

#[test]
fn test_settle_favour_respondent_pays_nothing_to_claimant() {
    let (env, client, _, arbiter) = setup();
    let id = open_and_decide(&env, &client, &arbiter, Outcome::FavourRespondent);
    let (c, r) = client.settle(&arbiter, &id);
    assert_eq!(c, 0);
    assert_eq!(r, 1_000);
}

#[test]
fn test_settle_marks_dispute_as_settled() {
    let (env, client, _, arbiter) = setup();
    let id = open_and_decide(&env, &client, &arbiter, Outcome::Split);
    client.settle(&arbiter, &id);
    let dispute = client.get_dispute(&id).unwrap();
    assert_eq!(dispute.status, DisputeStatus::Settled);
}

// ── submit_evidence (additional auth check) ───────────────────────────────────

#[test]
#[should_panic(expected = "Only parties may submit evidence")]
fn test_third_party_cannot_submit_evidence_on_new_dispute() {
    let (env, client, _, _) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    let id = client.open_dispute(&claimant, &respondent, &100);
    let outsider = Address::generate(&env);
    let hash = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_evidence(&outsider, &id, &hash);
}

#[test]
#[should_panic]
fn test_submit_evidence_on_settled_dispute_panics() {
    let (env, client, _, arbiter) = setup();
    let id = open_and_decide(&env, &client, &arbiter, Outcome::FavourClaimant);
    client.settle(&arbiter, &id);
    // Now try to submit evidence to an already-settled dispute
    let claimant = client.get_dispute(&id).unwrap().claimant;
    let hash = BytesN::from_array(&env, &[2u8; 32]);
    client.submit_evidence(&claimant, &id, &hash);
}
