#[cfg(test)]
mod tests {
    use crate::{LiquidityPoolContract, LiquidityPoolContractClient};
    use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

    fn setup() -> (Env, LiquidityPoolContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, LiquidityPoolContract);
        let client = LiquidityPoolContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        let bst_token = Address::generate(&env);
        let fee_collector = Address::generate(&env);
        client.initialize(&admin, &bst_token, &fee_collector);
        (env, client, admin)
    }

    #[test]
    fn test_initialize_succeeds() {
        let (_, client, _) = setup();
        let stats = client.get_pool_stats();
        assert_eq!(stats.reserve_a, 0);
        assert_eq!(stats.reserve_b, 0);
        assert_eq!(stats.total_liquidity, 0);
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_panics() {
        let (env, client, _) = setup();
        let admin2 = Address::generate(&env);
        let bst = Address::generate(&env);
        let fee = Address::generate(&env);
        client.initialize(&admin2, &bst, &fee);
    }

    #[test]
    fn test_add_first_liquidity_returns_positive() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        let minted = client.add_liquidity(&provider, &10_000, &10_000, &0, &0);
        assert!(minted > 0);
    }

    #[test]
    fn test_pool_stats_reflect_added_liquidity() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        client.add_liquidity(&provider, &10_000, &10_000, &0, &0);
        let stats = client.get_pool_stats();
        assert_eq!(stats.reserve_a, 10_000);
        assert_eq!(stats.reserve_b, 10_000);
    }

    #[test]
    fn test_user_liquidity_matches_minted() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        let minted = client.add_liquidity(&provider, &10_000, &10_000, &0, &0);
        assert_eq!(client.get_user_liquidity(&provider), minted);
    }

    #[test]
    fn test_remove_liquidity_returns_amounts() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        let minted = client.add_liquidity(&provider, &10_000, &10_000, &0, &0);
        assert!(minted > 0);
        let (amount_a, amount_b) = client.remove_liquidity(&provider, &(minted / 2));
        assert!(amount_a > 0);
        assert!(amount_b > 0);
    }

    #[test]
    #[should_panic(expected = "Insufficient liquidity")]
    fn test_remove_more_than_owned_panics() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        client.add_liquidity(&provider, &10_000, &10_000, &0, &0);
        client.remove_liquidity(&provider, &999_999);
    }

    #[test]
    fn test_swap_bst_for_xlm() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        client.add_liquidity(&provider, &100_000, &100_000, &0, &0);

        let user = Address::generate(&env);
        let out = client.swap(&user, &symbol_short!("bst"), &1_000, &0);
        assert!(out > 0);
        assert!(out < 1_000); // fee reduces output
    }

    #[test]
    fn test_swap_xlm_for_bst() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        client.add_liquidity(&provider, &100_000, &100_000, &0, &0);

        let user = Address::generate(&env);
        let out = client.swap(&user, &symbol_short!("xlm"), &1_000, &0);
        assert!(out > 0);
    }

    #[test]
    fn test_swap_records_history() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        client.add_liquidity(&provider, &100_000, &100_000, &0, &0);

        let user = Address::generate(&env);
        client.swap(&user, &symbol_short!("bst"), &1_000, &0);
        let history = client.get_swap_history(&0, &10);
        assert_eq!(history.len(), 1);
    }

    #[test]
    #[should_panic(expected = "Amount in must be positive")]
    fn test_swap_zero_amount_panics() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        client.add_liquidity(&provider, &100_000, &100_000, &0, &0);
        let user = Address::generate(&env);
        client.swap(&user, &symbol_short!("bst"), &0, &0);
    }

    #[test]
    fn test_get_swap_history_empty() {
        let (_, client, _) = setup();
        let history = client.get_swap_history(&0, &10);
        assert_eq!(history.len(), 0);
    }

    // Security: zero-liquidity pool cannot be swapped against
    #[test]
    #[should_panic(expected = "Insufficient liquidity")]
    fn test_swap_against_empty_pool_panics() {
        let (env, client, _) = setup();
        let user = Address::generate(&env);
        client.swap(&user, &symbol_short!("bst"), &1_000, &0);
    }

    // ── Arithmetic safety (#823) ──────────────────────────────────────────────

    #[test]
    #[should_panic(expected = "Desired amounts must be positive")]
    fn test_add_liquidity_rejects_zero_amount() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        client.add_liquidity(&provider, &0, &10_000, &0, &0);
    }

    #[test]
    #[should_panic(expected = "Desired amounts must be positive")]
    fn test_add_liquidity_rejects_negative_amount() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        client.add_liquidity(&provider, &10_000, &-1, &0, &0);
    }

    #[test]
    #[should_panic(expected = "Initial liquidity below minimum")]
    fn test_first_provision_below_minimum_liquidity_panics() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        // sqrt(10 * 10) == 10, which is under MINIMUM_LIQUIDITY (1000).
        client.add_liquidity(&provider, &10, &10, &0, &0);
    }

    #[test]
    #[should_panic(expected = "math: i128 multiplication overflow")]
    fn test_add_liquidity_overflow_is_reported_not_wrapped() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        // amount_a * amount_b overflows i128 before sqrt() ever sees it.
        client.add_liquidity(&provider, &i128::MAX, &i128::MAX, &0, &0);
    }

    #[test]
    #[should_panic(expected = "Liquidity must be positive")]
    fn test_remove_zero_liquidity_panics() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        client.add_liquidity(&provider, &10_000, &10_000, &0, &0);
        client.remove_liquidity(&provider, &0);
    }

    #[test]
    #[should_panic(expected = "math: i128 multiplication overflow")]
    fn test_swap_overflow_is_reported_not_wrapped() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        client.add_liquidity(&provider, &100_000, &100_000, &0, &0);

        let user = Address::generate(&env);
        // amount_in * (fee_denominator - fee_numerator) overflows i128.
        client.swap(&user, &symbol_short!("bst"), &i128::MAX, &0);
    }

    #[test]
    fn test_remove_liquidity_is_proportional() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        // sqrt(10_000 * 10_000) - MINIMUM_LIQUIDITY == 10_000 - 1_000 == 9_000
        let minted = client.add_liquidity(&provider, &10_000, &10_000, &0, &0);
        assert_eq!(minted, 9_000);

        let (amount_a, amount_b) = client.remove_liquidity(&provider, &4_500);
        // 4_500 * 10_000 / 9_000 == 5_000
        assert_eq!(amount_a, 5_000);
        assert_eq!(amount_b, 5_000);

        let stats = client.get_pool_stats();
        assert_eq!(stats.reserve_a, 5_000);
        assert_eq!(stats.total_liquidity, 4_500);
    }

    #[test]
    fn test_swap_history_pagination_does_not_overflow() {
        let (env, client, _) = setup();
        let provider = Address::generate(&env);
        client.add_liquidity(&provider, &100_000, &100_000, &0, &0);
        let user = Address::generate(&env);
        client.swap(&user, &symbol_short!("bst"), &1_000, &0);

        // start_index + limit would wrap u32; the view saturates instead.
        let history = client.get_swap_history(&u32::MAX, &10);
        assert_eq!(history.len(), 0);
    }
}
