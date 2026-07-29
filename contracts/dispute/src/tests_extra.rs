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
