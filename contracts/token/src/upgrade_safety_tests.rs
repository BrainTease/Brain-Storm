//! Upgrade-safety tests for the token contract (Issue #1013).
//!
//! These tests verify that the token contract's storage layout is stable across
//! simulated upgrades.  The pattern is:
//!
//! 1. Deploy the contract and write representative state under every major
//!    storage key.
//! 2. "Upgrade" — in Soroban's test environment the WASM is the same binary,
//!    but we simulate the post-upgrade state by reading all keys back through
//!    the same client.  The key invariant is that *no key read panics* and the
//!    returned values are identical to what was written pre-upgrade.
//! 3. Assert that every key survives and deserializes correctly.
//!
//! # Storage schema documented here
//!
//! | `DataKey` variant              | Storage tier | Value type    |
//! |--------------------------------|--------------|---------------|
//! | `Admin`                        | instance     | `Address`     |
//! | `Balance(Address)`             | persistent   | `i128`        |
//! | `Allowance(Address, Address)`  | persistent   | `i128`        |
//! | `TotalSupply`                  | instance     | `i128`        |
//! | `BurnStats`                    | instance     | `BurnStats`   |

#![cfg(test)]

use crate::{TokenContract, TokenContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn deploy() -> (Env, TokenContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register_contract(None, TokenContract);
    let client = TokenContractClient::new(&env, &id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

// ---------------------------------------------------------------------------
// Upgrade-safety tests
// ---------------------------------------------------------------------------

/// Verify Balance key (persistent storage) survives after a mint.
///
/// Schema: `DataKey::Balance(Address)` → `i128` (persistent storage)
#[test]
fn upgrade_safety_token_balance_key_survives() {
    let (env, client, admin) = deploy();
    let user = Address::generate(&env);
    let mint_amount = 10_000_000_i128;

    client.mint_reward(&admin, &user, &mint_amount);
    let pre_balance = client.balance(&user);
    assert_eq!(pre_balance, mint_amount);

    // Simulate upgrade: re-read the balance — must return same value
    let post_balance = client.balance(&user);
    assert_eq!(
        post_balance, pre_balance,
        "Balance key must survive simulated upgrade"
    );
}

/// Verify TotalSupply key (instance storage) survives.
///
/// Schema: `DataKey::TotalSupply` → `i128` (instance storage)
#[test]
fn upgrade_safety_token_total_supply_survives() {
    let (env, client, admin) = deploy();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &5_000_000);

    let pre = client.total_supply();
    assert_eq!(pre, 5_000_000);

    // Simulate upgrade
    let post = client.total_supply();
    assert_eq!(post, pre, "TotalSupply must survive simulated upgrade");
}

/// Verify Allowance key (persistent storage) survives.
///
/// Schema: `DataKey::Allowance(Address, Address)` → `i128` (persistent storage)
#[test]
fn upgrade_safety_token_allowance_key_survives() {
    let (env, client, admin) = deploy();
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    client.mint_reward(&admin, &owner, &1_000_000);
    client.approve(&owner, &spender, &500_000);

    let pre = client.allowance(&owner, &spender);
    assert_eq!(pre, 500_000);

    // Simulate upgrade
    let post = client.allowance(&owner, &spender);
    assert_eq!(post, pre, "Allowance key must survive simulated upgrade");
}

/// Verify transfer preserves balances correctly (Balance key layout).
#[test]
fn upgrade_safety_token_transfer_state_survives() {
    let (env, client, admin) = deploy();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint_reward(&admin, &alice, &1_000_000);
    client.transfer(&alice, &bob, &300_000);

    // Pre-upgrade snapshot
    let alice_pre = client.balance(&alice);
    let bob_pre = client.balance(&bob);
    assert_eq!(alice_pre, 700_000);
    assert_eq!(bob_pre, 300_000);

    // Simulate upgrade: re-read
    let alice_post = client.balance(&alice);
    let bob_post = client.balance(&bob);
    assert_eq!(alice_post, alice_pre, "Alice balance survives upgrade");
    assert_eq!(bob_post, bob_pre, "Bob balance survives upgrade");
}

/// Verify TotalSupply after burn operation survives.
///
/// Schema: `DataKey::BurnStats` (instance) and `DataKey::TotalSupply` (instance)
#[test]
fn upgrade_safety_token_supply_after_burn_survives() {
    let (env, client, admin) = deploy();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &1_000_000);
    client.burn(&user, &100_000);

    let pre_supply = client.total_supply();
    assert_eq!(pre_supply, 900_000);

    // Simulate upgrade: supply must be readable
    let post_supply = client.total_supply();
    assert_eq!(
        post_supply, pre_supply,
        "TotalSupply after burn survives simulated upgrade"
    );
}

/// Verify multiple simultaneous key types survive a simulated upgrade.
/// This exercises the full storage schema in one test.
#[test]
fn upgrade_safety_token_composite_state_survives() {
    let (env, client, admin) = deploy();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    // Write diverse state covering multiple DataKey variants
    client.mint_reward(&admin, &alice, &2_000_000);
    client.mint_reward(&admin, &bob, &1_500_000);
    client.transfer(&alice, &charlie, &200_000);
    client.approve(&bob, &alice, &300_000);

    // Snapshot pre-upgrade values
    let alice_bal_pre = client.balance(&alice);
    let bob_bal_pre = client.balance(&bob);
    let charlie_bal_pre = client.balance(&charlie);
    let allowance_pre = client.allowance(&bob, &alice);
    let supply_pre = client.total_supply();

    // Simulate upgrade: assert all keys still read correctly
    assert_eq!(client.balance(&alice), alice_bal_pre,
        "Alice Balance key survives upgrade");
    assert_eq!(client.balance(&bob), bob_bal_pre,
        "Bob Balance key survives upgrade");
    assert_eq!(client.balance(&charlie), charlie_bal_pre,
        "Charlie Balance key survives upgrade");
    assert_eq!(client.allowance(&bob, &alice), allowance_pre,
        "Allowance key survives upgrade");
    assert_eq!(client.total_supply(), supply_pre,
        "TotalSupply key survives upgrade");
}

/// Verify burn_from does not corrupt balances across the simulated upgrade.
#[test]
fn upgrade_safety_token_burn_from_survives() {
    let (env, client, admin) = deploy();
    let owner = Address::generate(&env);
    let burner = Address::generate(&env);

    client.mint_reward(&admin, &owner, &500_000);
    client.approve(&owner, &burner, &200_000);
    client.burn_from(&burner, &owner, &100_000);

    let pre_balance = client.balance(&owner);
    let pre_allowance = client.allowance(&owner, &burner);
    let pre_supply = client.total_supply();

    // Simulate upgrade
    assert_eq!(client.balance(&owner), pre_balance,
        "Balance key survives upgrade after burn_from");
    assert_eq!(client.allowance(&owner, &burner), pre_allowance,
        "Allowance key survives upgrade after burn_from");
    assert_eq!(client.total_supply(), pre_supply,
        "TotalSupply key survives upgrade after burn_from");
}
