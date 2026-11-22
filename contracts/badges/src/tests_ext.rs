#![cfg(test)]
//! Additional tests for the badges contract covering:
//! - burn_badge: happy path, non-admin panics, and not-found panics
//! - transfer: always panics (soulbound)
//! - get_badge_type: returns None for missing type
//! - get_badge: returns None for nonexistent id
//! - verify_badge: false after burn

use super::*;
use crate::shared::{
    bump_instance_ttl, validate_badge_type_name, validate_description, BadgeError,
};
use soroban_sdk::{testutils::Address as _, symbol_short, Env, String};

fn setup() -> (Env, BadgesContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register_contract(None, BadgesContract);
    let client = BadgesContractClient::new(&env, &id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

fn create_type_and_mint(
    env: &Env,
    client: &BadgesContractClient,
    admin: &Address,
) -> (Address, u64) {
    let badge_type = symbol_short!("FIRST");
    let desc = String::from_str(env, "First completion");
    client.create_badge_type(admin, &badge_type, &desc);
    let owner = Address::generate(env);
    let id = client.mint_badge(admin, &owner, &badge_type);
    (owner, id)
}

// ── get_badge_type ────────────────────────────────────────────────────────────

#[test]
fn test_get_badge_type_returns_none_for_missing() {
    let (env, client, _) = setup();
    assert!(client.get_badge_type(&symbol_short!("NOPE")).is_none());
}

#[test]
fn test_get_badge_type_returns_record_after_creation() {
    let (env, client, admin) = setup();
    let badge_type = symbol_short!("FIRST");
    let desc = String::from_str(&env, "First completion");
    client.create_badge_type(&admin, &badge_type, &desc);

    let record = client.get_badge_type(&badge_type).unwrap();
    assert_eq!(record.name, badge_type);
    assert_eq!(record.total_minted, 0);
}

#[test]
fn test_get_badge_type_increments_total_minted_after_mint() {
    let (env, client, admin) = setup();
    let badge_type = symbol_short!("FIRST");
    let desc = String::from_str(&env, "First completion");
    client.create_badge_type(&admin, &badge_type, &desc);
    let owner = Address::generate(&env);
    client.mint_badge(&admin, &owner, &badge_type);

    let record = client.get_badge_type(&badge_type).unwrap();
    assert_eq!(record.total_minted, 1);
}

// ── get_badge ─────────────────────────────────────────────────────────────────

#[test]
fn test_get_badge_returns_none_for_nonexistent_id() {
    let (_, client, _) = setup();
    assert!(client.get_badge(&999).is_none());
}

#[test]
fn test_get_badge_returns_record_after_mint() {
    let (env, client, admin) = setup();
    let (owner, id) = create_type_and_mint(&env, &client, &admin);

    let badge = client.get_badge(&id).unwrap();
    assert_eq!(badge.owner, owner);
    assert_eq!(badge.id, id);
}

// ── transfer (soulbound) ──────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "soulbound")]
fn test_transfer_always_panics() {
    let (env, client, admin) = setup();
    let (owner, id) = create_type_and_mint(&env, &client, &admin);
    let recipient = Address::generate(&env);
    client.transfer(&owner, &recipient, &id);
}

// ── burn_badge ────────────────────────────────────────────────────────────────

#[test]
fn test_burn_badge_removes_badge_from_owner_list() {
    let (env, client, admin) = setup();
    let (owner, id) = create_type_and_mint(&env, &client, &admin);

    assert_eq!(client.get_badges_by_owner(&owner).len(), 1);

    client.burn_badge(&admin, &id);

    assert_eq!(client.get_badges_by_owner(&owner).len(), 0);
}

#[test]
fn test_verify_badge_returns_false_after_burn() {
    let (env, client, admin) = setup();
    let badge_type = symbol_short!("FIRST");
    let desc = String::from_str(&env, "First completion");
    client.create_badge_type(&admin, &badge_type, &desc);
    let owner = Address::generate(&env);
    let id = client.mint_badge(&admin, &owner, &badge_type);

    assert!(client.verify_badge(&owner, &badge_type));
    client.burn_badge(&admin, &id);
    assert!(!client.verify_badge(&owner, &badge_type));
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_burn_badge() {
    let (env, client, admin) = setup();
    let (_, id) = create_type_and_mint(&env, &client, &admin);
    let rando = Address::generate(&env);
    client.burn_badge(&rando, &id);
}

#[test]
#[should_panic(expected = "Badge not found")]
fn test_burn_nonexistent_badge_panics() {
    let (_, client, admin) = setup();
    client.burn_badge(&admin, &999);
}

#[test]
#[should_panic(expected = "Badge not found")]
fn test_burn_same_badge_twice_panics() {
    let (env, client, admin) = setup();
    let (_, id) = create_type_and_mint(&env, &client, &admin);
    client.burn_badge(&admin, &id);
    client.burn_badge(&admin, &id);
}

// ── shared validation helpers ─────────────────────────────────────────────────

#[test]
fn test_validate_badge_type_name_accepts_valid_symbol() {
    let env = Env::default();
    assert!(validate_badge_type_name(&env, &symbol_short!("FIRST")).is_ok());
}

#[test]
fn test_validate_badge_type_name_rejects_empty() {
    let env = Env::default();
    let err = validate_badge_type_name(&env, &symbol_short!("")).unwrap_err();
    assert_eq!(err, BadgeError::InvalidBadgeType);
}

#[test]
fn test_validate_description_accepts_valid_string() {
    let env = Env::default();
    let desc = String::from_str(&env, "First completion");
    assert!(validate_description(&env, &desc).is_ok());
}

#[test]
fn test_validate_description_rejects_empty() {
    let env = Env::default();
    let desc = String::from_str(&env, "");
    let err = validate_description(&env, &desc).unwrap_err();
    assert_eq!(err, BadgeError::InvalidDescription);
}

#[test]
fn test_create_badge_type_rejects_empty_description() {
    let (env, client, admin) = setup();
    let badge_type = symbol_short!("FIRST");
    let desc = String::from_str(&env, "");
    let result = client.try_create_badge_type(&admin, &badge_type, &desc);
    assert!(result.is_err());
}

// ── TTL bump behavior ─────────────────────────────────────────────────────────

#[test]
fn test_bump_instance_ttl_extends_liveness() {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register_contract(None, BadgesContract);
    let client = BadgesContractClient::new(&env, &id);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    // Exercise the helper directly against the contract instance entry.
    env.as_contract(&id, || {
        bump_instance_ttl(&env);
    });

    // Contract remains usable after the TTL bump.
    assert!(client.get_badge_type(&symbol_short!("NOPE")).is_none());
}

#[test]
fn test_mint_and_burn_bump_instance_ttl() {
    let (env, client, admin) = setup();
    let (_, id) = create_type_and_mint(&env, &client, &admin);
    client.burn_badge(&admin, &id);
    // After mint/burn the instance entry must still be live enough to read.
    assert!(client.get_badge(&id).is_none());
}

// ── gas budget regression ─────────────────────────────────────────────────────

/// Regression guard for the documented gas budgets in `gas-metrics.md`.
/// `mint_badge` and `burn_badge` must stay within their instruction budgets.
#[test]
fn test_mint_badge_within_gas_budget() {
    let (env, client, admin) = setup();
    let badge_type = symbol_short!("FIRST");
    let desc = String::from_str(&env, "First completion");
    client.create_badge_type(&admin, &badge_type, &desc);
    let owner = Address::generate(&env);

    let before = env.budget().cpu_instruction_cost();
    client.mint_badge(&admin, &owner, &badge_type);
    let used = env.budget().cpu_instruction_cost() - before;

    assert!(
        used <= MINT_BADGE_GAS_BUDGET,
        "mint_badge exceeded gas budget: used {used}, budget {MINT_BADGE_GAS_BUDGET}"
    );
}

#[test]
fn test_burn_badge_within_gas_budget() {
    let (env, client, admin) = setup();
    let (_, id) = create_type_and_mint(&env, &client, &admin);

    let before = env.budget().cpu_instruction_cost();
    client.burn_badge(&admin, &id);
    let used = env.budget().cpu_instruction_cost() - before;

    assert!(
        used <= BURN_BADGE_GAS_BUDGET,
        "burn_badge exceeded gas budget: used {used}, budget {BURN_BADGE_GAS_BUDGET}"
    );
}
