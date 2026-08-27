#![cfg(test)]
use soroban_sdk::{testutils::Address as _, Address, Env};

use crate::{TokenContract, TokenContractClient};

#[cfg(test)]
mod fuzz_tests {
    use proptest::prelude::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};
    use crate::{TokenContract, TokenContractClient};

    fn setup() -> (Env, Address, TokenContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, admin, client)
    }

    proptest! {
        #[test]
        fn fuzz_mint_positive_amounts(amount in 1i128..=i128::MAX) {
            let (env, admin, client) = setup();
            let user = Address::generate(&env);
            
            client.mint_reward(&admin, &user, &amount);
            prop_assert_eq!(client.balance(&user), amount);
            prop_assert_eq!(client.total_supply(), amount);
        }

        #[test]
        fn fuzz_mint_zero_or_negative_panics(amount in i128::MIN..=0i128) {
            let (env, admin, client) = setup();
            let user = Address::generate(&env);
            
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                client.mint_reward(&admin, &user, &amount);
            }));
            prop_assert!(result.is_err());
        }

        #[test]
        fn fuzz_transfer_never_negative_balance(
            mint_amount in 1i128..=1_000_000i128,
            transfer_amount in 1i128..=1_000_000i128
        ) {
            let (env, admin, client) = setup();
            let from = Address::generate(&env);
            let to = Address::generate(&env);
            
            client.mint_reward(&admin, &from, &mint_amount);
            
            if transfer_amount <= mint_amount {
                client.transfer(&from, &to, &transfer_amount);
                let from_balance = client.balance(&from);
                prop_assert!(from_balance >= 0);
                prop_assert_eq!(from_balance, mint_amount - transfer_amount);
            }
        }
    }
}

fn setup() -> (Env, Address, TokenContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, TokenContract);
    let client = TokenContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, admin, client)
}

#[test]
fn test_mint_and_balance() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &500);
    assert_eq!(client.balance(&user), 500);
    assert_eq!(client.total_supply(), 500);
}

#[test]
fn test_burn_reduces_balance_and_supply() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &300);
    client.burn(&user, &100);
    assert_eq!(client.balance(&user), 200);
    assert_eq!(client.total_supply(), 200);
}

#[test]
#[should_panic(expected = "Insufficient balance")]
fn test_burn_more_than_balance_panics() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &50);
    client.burn(&user, &100);
}

#[test]
fn test_burn_from_with_allowance() {
    let (env, admin, client) = setup();
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    client.mint_reward(&admin, &owner, &200);
    client.approve(&owner, &spender, &150);
    client.burn_from(&spender, &owner, &100);
    assert_eq!(client.balance(&owner), 100);
    assert_eq!(client.allowance(&owner, &spender), 50);
    assert_eq!(client.total_supply(), 100);
}

#[test]
#[should_panic(expected = "Insufficient allowance")]
fn test_burn_from_exceeds_allowance_panics() {
    let (env, admin, client) = setup();
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    client.mint_reward(&admin, &owner, &200);
    client.approve(&owner, &spender, &50);
    client.burn_from(&spender, &owner, &100);
}

#[test]
#[should_panic(expected = "reentrant call")]
fn test_reentrancy_guard_on_mint() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    use soroban_sdk::IntoVal;
    use crate::DataKey;
    env.as_contract(&client.address, || {
        env.storage().instance().set(&DataKey::Locked, &true);
    });
    client.mint_reward(&admin, &user, &100);
}

// =============================================================================
// #696 — Auth, boundary, and TTL / vesting tests
// =============================================================================

// ── initialize guard ──────────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialize_rejected() {
    let (env, admin, client) = setup();
    client.initialize(&admin);
}

// ── mint: auth failures ───────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_mint_reward_rejected() {
    let (env, _admin, client) = setup();
    let rando = Address::generate(&env);
    let target = Address::generate(&env);
    client.mint_reward(&rando, &target, &100);
}

// ── mint: boundary amounts ────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_mint_zero_amount_panics() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &0);
}

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_mint_negative_amount_panics() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &-1);
}

#[test]
#[should_panic(expected = "Max supply exceeded")]
fn test_mint_exceeds_max_supply_panics() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    // MAX_SUPPLY = 10_000_000_000_000_000; mint it then try one more
    client.mint_reward(&admin, &user, &10_000_000_000_000_000_i128);
    client.mint_reward(&admin, &user, &1);
}

// ── burn: auth failures ───────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Insufficient balance")]
fn test_burn_more_than_balance_panics() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &10);
    client.burn(&user, &11);
}

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_burn_zero_panics() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &100);
    client.burn(&user, &0);
}

// ── transfer: boundary ────────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Insufficient balance")]
fn test_transfer_more_than_balance_panics() {
    let (env, admin, client) = setup();
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    client.mint_reward(&admin, &a, &50);
    client.transfer(&a, &b, &51);
}

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_transfer_zero_panics() {
    let (env, admin, client) = setup();
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    client.mint_reward(&admin, &a, &50);
    client.transfer(&a, &b, &0);
}

// ── approve / allowance ───────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Insufficient allowance")]
fn test_burn_from_exceeds_allowance() {
    let (env, admin, client) = setup();
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    client.mint_reward(&admin, &owner, &200);
    client.approve(&owner, &spender, &50);
    client.burn_from(&spender, &owner, &51);
}

#[test]
fn test_approve_then_transfer_from_drains_allowance() {
    let (env, admin, client) = setup();
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let dest = Address::generate(&env);
    client.mint_reward(&admin, &owner, &200);
    client.approve(&owner, &spender, &100);
    client.transfer_from(&spender, &owner, &dest, &60);
    assert_eq!(client.allowance(&owner, &spender), 40);
    assert_eq!(client.balance(&dest), 60);
}

// ── vesting: TTL / cliff ──────────────────────────────────────────────────────

#[test]
fn test_vesting_cliff_not_reached_yields_nothing() {
    let (env, admin, client) = setup();
    let beneficiary = Address::generate(&env);
    let start = env.ledger().sequence();
    // cliff is 100 ledgers ahead; current sequence == start
    client.create_vesting(&admin, &beneficiary, &1_000, &(start + 100), &(start + 200));
    // Nothing vested before cliff
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.claim_vesting(&beneficiary);
    }));
    assert!(result.is_err(), "should panic — nothing claimable before cliff");
}

#[test]
fn test_vesting_claim_after_cliff() {
    let (env, admin, client) = setup();
    let beneficiary = Address::generate(&env);
    let start = env.ledger().sequence();
    let cliff = start + 10;
    let end = start + 100;
    client.create_vesting(&admin, &beneficiary, &1_000, &cliff, &end);
    env.ledger().with_mut(|l| l.sequence_number = cliff + 1);
    client.claim_vesting(&beneficiary);
    assert!(client.balance(&beneficiary) > 0);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_create_vesting() {
    let (env, _admin, client) = setup();
    let rando = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let start = env.ledger().sequence();
    client.create_vesting(&rando, &beneficiary, &1_000, &(start + 10), &(start + 100));
}
