// Additional unit tests for the dispute contract focusing on edge case state transitions
#![cfg(test)]

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

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_open_dispute_negative_amount_panics() {
    let (env, client, _, _) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    client.open_dispute(&claimant, &respondent, -100);
}

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_open_dispute_zero_amount_panics() {
    let (env, client, _, _) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    client.open_dispute(&claimant, &respondent, 0);
}

#[test]
#[should_panic(expected = "Must be in Open status")]
fn test_submit_evidence_twice_panics() {
    let (env, client, _, _) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    let id = client.open_dispute(&claimant, &respondent, 500);
    let hash1 = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_evidence(&claimant, &id, &hash1);
    let hash2 = BytesN::from_array(&env, &[2u8; 32]);
    client.submit_evidence(&claimant, &id, &hash2);
}

#[test]
#[should_panic(expected = "Unauthorized: authority required")]
fn test_non_arbiter_cannot_record_decision() {
    let (env, client, _, _) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    let id = client.open_dispute(&claimant, &respondent, 300);
    let rando = Address::generate(&env);
    client.record_decision(&rando, &id, &Outcome::FavourClaimant);
}

#[test]
#[should_panic(expected = "Must be in Decision status")]
fn test_settle_without_decision_panics() {
    let (env, client, _, arbiter) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    let id = client.open_dispute(&claimant, &respondent, 400);
    client.settle(&arbiter, &id);
}

#[test]
fn test_set_arbiter_affects_authorization() {
    let (env, client, admin, _) = setup();
    let new_arbiter = Address::generate(&env);
    client.set_arbiter(&admin, &new_arbiter);
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    let id = client.open_dispute(&claimant, &respondent, 250);
    client.record_decision(&new_arbiter, &id, &Outcome::FavourRespondent);
    let (c, r) = client.settle(&new_arbiter, &id);
    assert_eq!(c, 0);
    assert_eq!(r, 250);
}

#[test]
#[should_panic(expected = "Dispute already settled")]
fn test_settle_already_settled_panics() {
    let (env, client, _, arbiter) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    let id = client.open_dispute(&claimant, &respondent, 100);
    let hash = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_evidence(&claimant, &id, &hash);
    client.record_decision(&arbiter, &id, &Outcome::FavourClaimant);
    client.settle(&arbiter, &id);
    client.settle(&arbiter, &id);
}

#[test]
#[should_panic(expected = "Dispute already settled")]
fn test_submit_evidence_after_settled_panics() {
    let (env, client, _, arbiter) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    let id = client.open_dispute(&claimant, &respondent, 100);
    let hash1 = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_evidence(&claimant, &id, &hash1);
    client.record_decision(&arbiter, &id, &Outcome::FavourClaimant);
    client.settle(&arbiter, &id);
    let hash2 = BytesN::from_array(&env, &[2u8; 32]);
    client.submit_evidence(&respondent, &id, &hash2);
}

#[test]
#[should_panic(expected = "Dispute already settled")]
fn test_record_decision_after_settled_panics() {
    let (env, client, _, arbiter) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    let id = client.open_dispute(&claimant, &respondent, 100);
    let hash = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_evidence(&claimant, &id, &hash);
    client.record_decision(&arbiter, &id, &Outcome::FavourClaimant);
    client.settle(&arbiter, &id);
    client.record_decision(&arbiter, &id, &Outcome::FavourRespondent);
}

#[test]
#[should_panic(expected = "Invalid outcome")]
fn test_record_decision_none_outcome_panics() {
    let (env, client, _, arbiter) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    let id = client.open_dispute(&claimant, &respondent, 100);
    client.record_decision(&arbiter, &id, &Outcome::None);
}

#[test]
fn test_get_arbiter_returns_current_arbiter() {
    let (env, client, admin, arbiter) = setup();
    let fetched = client.get_arbiter();
    assert_eq!(fetched, arbiter);

    let new_arbiter = Address::generate(&env);
    client.set_arbiter(&admin, &new_arbiter);
    let fetched = client.get_arbiter();
    assert_eq!(fetched, new_arbiter);
}

#[test]
fn test_respondent_can_submit_evidence() {
    let (env, client, _, arbiter) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    let id = client.open_dispute(&claimant, &respondent, 100);
    let hash = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_evidence(&respondent, &id, &hash);
    let d = client.get_dispute(&id).unwrap();
    assert_eq!(d.status, DisputeStatus::Evidence);
    assert_eq!(d.evidence_hash, hash);
}

#[test]
fn test_favour_respondent_outcome() {
    let (env, client, _, arbiter) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    let id = client.open_dispute(&claimant, &respondent, 500);
    client.record_decision(&arbiter, &id, &Outcome::FavourRespondent);
    let (c, r) = client.settle(&arbiter, &id);
    assert_eq!(c, 0);
    assert_eq!(r, 500);
}

#[test]
fn test_split_odd_amount() {
    let (env, client, _, arbiter) = setup();
    let claimant = Address::generate(&env);
    let respondent = Address::generate(&env);
    let id = client.open_dispute(&claimant, &respondent, 999);
    client.record_decision(&arbiter, &id, &Outcome::Split);
    let (c, r) = client.settle(&arbiter, &id);
    assert_eq!(c, 499);
    assert_eq!(r, 500);
}

#[test]
fn test_multiple_independent_disputes() {
    let (env, client, _, arbiter) = setup();
    let claimant1 = Address::generate(&env);
    let respondent1 = Address::generate(&env);
    let id1 = client.open_dispute(&claimant1, &respondent1, 100);

    let claimant2 = Address::generate(&env);
    let respondent2 = Address::generate(&env);
    let id2 = client.open_dispute(&claimant2, &respondent2, 200);

    assert_ne!(id1, id2);

    let hash1 = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_evidence(&claimant1, &id1, &hash1);

    let hash2 = BytesN::from_array(&env, &[2u8; 32]);
    client.submit_evidence(&claimant2, &id2, &hash2);

    client.record_decision(&arbiter, &id1, &Outcome::FavourClaimant);
    client.record_decision(&arbiter, &id2, &Outcome::FavourRespondent);

    let (c1, r1) = client.settle(&arbiter, &id1);
    assert_eq!(c1, 100);
    assert_eq!(r1, 0);

    let (c2, r2) = client.settle(&arbiter, &id2);
    assert_eq!(c2, 0);
    assert_eq!(r2, 200);
}
