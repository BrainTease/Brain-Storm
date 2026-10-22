//! #103: Property-based fuzz tests for liquidity-pool deposit and swap math.
//!
//! The strategies below keep every input inside the range where the pool math
//! is mathematically representable in `i128`, so a failing case means a real
//! invariant was broken rather than an expected overflow guard firing.

#![cfg(test)]

use crate::{LiquidityPoolContract, LiquidityPoolContractClient};
use brain_storm_shared::test_helpers::{generate_address, TestContext};
use proptest::prelude::*;
use soroban_sdk::{symbol_short, Env};

fn setup() -> (Env, LiquidityPoolContractClient<'static>) {
    let TestContext { env, admin } = TestContext::new();
    let id = env.register_contract(None, LiquidityPoolContract);
    let client = LiquidityPoolContractClient::new(&env, &id);
    let bst_token = generate_address(&env);
    let fee_collector = generate_address(&env);
    client.initialize(&admin, &bst_token, &fee_collector);
    (env, client)
}

fn initialize_pool(env: &Env, client: &LiquidityPoolContractClient<'_>, liquidity: i128) {
    let provider = generate_address(env);
    client.add_liquidity(&provider, &liquidity, &liquidity, &0, &0);
}

fn integer_sqrt(value: i128) -> i128 {
    if value < 2 {
        return value;
    }
    let mut z = (value + 1) / 2;
    let mut y = value;
    while z < y {
        y = z;
        z = (z + value / z) / 2;
    }
    y
}

fn arb_liquidity() -> impl Strategy<Value = i128> {
    1_000i128..=1_000_000_000i128
}

fn arb_trade() -> impl Strategy<Value = (bool, i128)> {
    (any::<bool>(), 1i128..=100_000i128)
}

proptest! {
    /// First deposit mints `sqrt(a * b) - MINIMUM_LIQUIDITY` and never panics.
    #[test]
    fn prop_first_deposit_mints_expected_liquidity(
        amount_a in arb_liquidity(),
        amount_b in arb_liquidity(),
    ) {
        let (env, client) = setup();
        let provider = generate_address(&env);

        let minted = client.add_liquidity(&provider, &amount_a, &amount_b, &0, &0);
        let expected = integer_sqrt(amount_a * amount_b) - 1_000;

        prop_assert!(minted > 0);
        prop_assert_eq!(minted, expected);
        prop_assert_eq!(client.get_user_liquidity(&provider), minted);
    }

    /// A subsequent 1:1 deposit always mints a positive, proportional amount.
    #[test]
    fn prop_second_deposit_is_proportional(amount in 1_000i128..=100_000i128) {
        let (env, client) = setup();
        initialize_pool(&env, &client, 1_000_000);
        let provider = generate_address(&env);

        let minted = client.add_liquidity(&provider, &amount, &amount, &0, &0);
        let stats = client.get_pool_stats();

        prop_assert!(minted > 0);
        prop_assert!(minted <= amount);
        prop_assert_eq!(stats.reserve_a, 1_000_000 + amount);
        prop_assert_eq!(stats.reserve_b, 1_000_000 + amount);
    }

    /// Swaps in either direction always return a positive amount below the
    /// output reserve and never reduce the constant-product invariant.
    #[test]
    fn prop_swap_preserves_constant_product((bst_in, amount_in) in arb_trade()) {
        let (env, client) = setup();
        initialize_pool(&env, &client, 1_000_000);
        let user = generate_address(&env);
        let token = if bst_in { symbol_short!("bst") } else { symbol_short!("xlm") };

        let before = client.get_pool_stats();
        let amount_out = client.swap(&user, &token, &amount_in, &0);
        let after = client.get_pool_stats();

        prop_assert!(amount_out > 0);
        prop_assert!(amount_out <= before.reserve_b.max(before.reserve_a));
        prop_assert!(after.reserve_a > 0);
        prop_assert!(after.reserve_b > 0);
        prop_assert!(after.reserve_a * after.reserve_b >= before.reserve_a * before.reserve_b);
    }

    /// Removing exactly the minted liquidity never returns more than the
    /// reserves and leaves the pool accounting consistent.
    #[test]
    fn prop_deposit_then_full_withdraw_returns_at_most_reserves(amount in arb_liquidity()) {
        let (env, client) = setup();
        let provider = generate_address(&env);
        let minted = client.add_liquidity(&provider, &amount, &amount, &0, &0);

        let (out_a, out_b) = client.remove_liquidity(&provider, &minted);
        let stats = client.get_pool_stats();

        prop_assert!(out_a > 0 && out_a <= amount);
        prop_assert!(out_b > 0 && out_b <= amount);
        prop_assert_eq!(stats.reserve_a, amount - out_a);
        prop_assert_eq!(stats.reserve_b, amount - out_b);
    }
}
