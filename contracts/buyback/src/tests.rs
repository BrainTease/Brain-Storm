#[cfg(test)]
mod tests {
    use crate::{BuybackContract, BuybackContractClient};
    use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

    // =========================================================================
    // Shared test setup helper
    // =========================================================================

    fn setup() -> (Env, BuybackContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, BuybackContract);
        let client = BuybackContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let oracle = Address::generate(&env);
        let dex = Address::generate(&env);
        let pool_id = BytesN::from_array(&env, &[0u8; 32]);
        client.initialize(&admin, &token, &oracle, &dex, &pool_id);
        (env, client, admin)
    }

    // =========================================================================
    // Initialization
    // =========================================================================

    #[test]
    fn test_initialize_creates_config() {
        let (_, client, _) = setup();
        let config = client.get_config();
        assert!(!config.enabled); // disabled by default
        assert_eq!(config.price_threshold, 1000);
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_panics() {
        let (env, client, _) = setup();
        let admin2 = Address::generate(&env);
        let token = Address::generate(&env);
        let oracle = Address::generate(&env);
        let dex = Address::generate(&env);
        let pool_id = BytesN::from_array(&env, &[0u8; 32]);
        client.initialize(&admin2, &token, &oracle, &dex, &pool_id);
    }

    // =========================================================================
    // Configuration
    // =========================================================================

    #[test]
    fn test_update_config_enables_buyback() {
        let (_, client, admin) = setup();
        client.update_config(&admin, &Some(true), &None, &None, &None, &None);
        assert!(client.get_config().enabled);
    }

    #[test]
    fn test_update_config_sets_price_threshold() {
        let (_, client, admin) = setup();
        client.update_config(&admin, &None, &Some(5000), &None, &None, &None);
        assert_eq!(client.get_config().price_threshold, 5000);
    }

    #[test]
    fn test_update_config_sets_max_buyback_amount() {
        let (_, client, admin) = setup();
        client.update_config(&admin, &None, &None, &Some(500_000_0000000), &None, &None);
        assert_eq!(client.get_config().max_buyback_amount, 500_000_0000000);
    }

    #[test]
    fn test_update_config_sets_min_reserve_balance() {
        let (_, client, admin) = setup();
        client.update_config(&admin, &None, &None, &None, &Some(2_000_0000000), &None);
        assert_eq!(client.get_config().min_reserve_balance, 2_000_0000000);
    }

    #[test]
    fn test_update_config_sets_buyback_interval() {
        let (_, client, admin) = setup();
        client.update_config(&admin, &None, &None, &None, &None, &Some(2000));
        assert_eq!(client.get_config().buyback_interval, 2000);
    }

    #[test]
    fn test_update_config_multiple_fields_at_once() {
        let (_, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &Some(3000),
            &Some(200_000_0000000),
            &None,
            &None,
        );
        let config = client.get_config();
        assert!(config.enabled);
        assert_eq!(config.price_threshold, 3000);
        assert_eq!(config.max_buyback_amount, 200_000_0000000);
    }

    #[test]
    #[should_panic(expected = "Unauthorized: admin required")]
    fn test_non_admin_cannot_update_config() {
        let (env, client, _) = setup();
        let rando = Address::generate(&env);
        client.update_config(&rando, &Some(true), &None, &None, &None, &None);
    }

    // =========================================================================
    // Reserve Management
    // =========================================================================

    #[test]
    fn test_add_to_reserve() {
        let (env, client, _) = setup();
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &10_000);
        assert_eq!(client.get_reserve_balance(), 10_000);
    }

    #[test]
    fn test_reserve_accumulates() {
        let (env, client, _) = setup();
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &5_000);
        client.add_to_reserve(&funder, &3_000);
        assert_eq!(client.get_reserve_balance(), 8_000);
    }

    #[test]
    fn test_initial_reserve_balance_is_zero() {
        let (_, client, _) = setup();
        assert_eq!(client.get_reserve_balance(), 0);
    }

    // =========================================================================
    // Analytics & History
    // =========================================================================

    #[test]
    fn test_get_buyback_analytics_initial_state() {
        let (_, client, _) = setup();
        let analytics = client.get_buyback_analytics();
        assert_eq!(analytics.total_buybacks, 0);
        assert_eq!(analytics.total_bst_bought, 0);
        assert_eq!(analytics.total_xlm_spent, 0);
        assert_eq!(analytics.average_price, 0);
        assert_eq!(analytics.last_buyback_timestamp, 0);
    }

    #[test]
    fn test_get_buyback_history_empty() {
        let (_, client, _) = setup();
        let history = client.get_buyback_history(&0, &10);
        assert_eq!(history.len(), 0);
    }

    // =========================================================================
    // check_and_execute_buyback gating
    // =========================================================================

    #[test]
    fn test_check_and_execute_disabled_is_noop() {
        let (_, client, _) = setup();
        // Should not panic when buyback is disabled
        client.check_and_execute_buyback();
        // Analytics must remain at zero — no buyback happened
        let analytics = client.get_buyback_analytics();
        assert_eq!(analytics.total_buybacks, 0);
    }

    // =========================================================================
    // Pricing calculation unit tests (#860)
    //
    // The three private helpers are exercised indirectly through the public
    // manual_buyback and check_and_execute_buyback entry points so that we can
    // assert the end-to-end numeric correctness without making them pub(crate).
    // =========================================================================

    // -------------------------------------------------------------------------
    // calculate_bst_from_xlm  →  (xlm * 1_000_000) / bst_price
    // -------------------------------------------------------------------------

    /// Standard case: 1 000 XLM at price 2 000 → 500 000 BST
    #[test]
    fn test_pricing_bst_from_xlm_standard() {
        // With bst_price fixed at 2000 inside get_bst_price():
        //   bst = (xlm * 1_000_000) / 2000
        // xlm_amount = 1_000  →  bst = (1_000 * 1_000_000) / 2000 = 500_000
        let (_, client, admin) = setup();

        // Enable buyback and set reserve so manual_buyback can run.
        client.update_config(&admin, &Some(true), &None, &Some(i128::MAX / 2), &Some(0), &None);
        let funder = {
            let env = Env::default();
            env.mock_all_auths();
            Address::generate(&env)
        };
        // We need a funder address from the same Env, so re-use setup pattern:
        let (env2, client2, admin2) = setup();
        client2.update_config(
            &admin2,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder2 = Address::generate(&env2);
        // Fund reserve with 1_000 XLM-equivalent units
        client2.add_to_reserve(&funder2, &1_000);

        // Execute manual buyback spending 1_000 XLM
        client2.manual_buyback(&admin2, &1_000);

        let analytics = client2.get_buyback_analytics();
        // bst_price = 2000 (hardcoded mock), xlm = 1_000
        // bst = (1_000 * 1_000_000) / 2_000 = 500_000
        // capped by max_buyback_amount (i128::MAX/2 >> 500_000) → remains 500_000
        assert_eq!(analytics.total_bst_bought, 500_000);
        assert_eq!(analytics.total_xlm_spent, 1_000);
    }

    /// Larger buyback: 10_000 XLM at price 2 000 → 5_000_000 BST
    #[test]
    fn test_pricing_bst_from_xlm_larger_amount() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &10_000);

        client.manual_buyback(&admin, &10_000);

        let analytics = client.get_buyback_analytics();
        // (10_000 * 1_000_000) / 2_000 = 5_000_000
        assert_eq!(analytics.total_bst_bought, 5_000_000);
        assert_eq!(analytics.total_xlm_spent, 10_000);
    }

    /// Zero XLM amount → zero BST purchased
    #[test]
    #[should_panic]
    fn test_pricing_bst_from_xlm_zero_amount_panics() {
        // manual_buyback with 0 XLM should panic on reserve check or arithmetic.
        let (env, client, admin) = setup();
        client.update_config(&admin, &Some(true), &None, &Some(i128::MAX / 2), &Some(0), &None);
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &5_000);
        client.manual_buyback(&admin, &0);
    }

    // -------------------------------------------------------------------------
    // calculate_xlm_from_available  →  available.min(max_buyback_amount)
    // -------------------------------------------------------------------------

    /// When available < max_buyback_amount, spend exactly available.
    #[test]
    fn test_pricing_xlm_from_available_limited_by_available() {
        let (env, client, admin) = setup();
        // Set max_buyback_amount to 1_000_000 (much larger than reserve)
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(1_000_000),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        // Deposit only 500 into reserve
        client.add_to_reserve(&funder, &500);

        // Trigger automatic buyback; available = 500 < max = 1_000_000
        // The mock bst_price = 2000; check_and_execute uses price_threshold = 1000
        // and mock returns 2000 > 1000, so it will execute.
        client.check_and_execute_buyback();

        let analytics = client.get_buyback_analytics();
        // Entire available (500) should be spent
        assert_eq!(analytics.total_xlm_spent, 500);
    }

    /// When available > max_buyback_amount, spending is capped at max_buyback_amount.
    #[test]
    fn test_pricing_xlm_from_available_capped_by_max() {
        let (env, client, admin) = setup();
        // Set max_buyback_amount to 300 (smaller than reserve)
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(300),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        // Deposit 1_000 into reserve
        client.add_to_reserve(&funder, &1_000);

        client.check_and_execute_buyback();

        let analytics = client.get_buyback_analytics();
        // Should be capped at max_buyback_amount = 300
        assert_eq!(analytics.total_xlm_spent, 300);
    }

    /// When available == max_buyback_amount, the full amount is spent.
    #[test]
    fn test_pricing_xlm_from_available_exact_match() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(750),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &750);

        client.check_and_execute_buyback();

        let analytics = client.get_buyback_analytics();
        assert_eq!(analytics.total_xlm_spent, 750);
    }

    // -------------------------------------------------------------------------
    // calculate_xlm_from_bst  →  (bst_amount * bst_price) / 1_000_000
    // Exercised through the average_price field in analytics:
    //   average_price = (total_xlm_spent * 1_000_000) / total_bst_bought
    // which is the inverse of bst_from_xlm, confirming round-trip consistency.
    // -------------------------------------------------------------------------

    /// Verify the average_price computed from analytics matches the mock price.
    #[test]
    fn test_pricing_average_price_round_trip() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &2_000);

        client.manual_buyback(&admin, &2_000);

        let analytics = client.get_buyback_analytics();
        // total_xlm_spent = 2_000
        // total_bst_bought = (2_000 * 1_000_000) / 2_000 = 1_000_000
        // average_price = (2_000 * 1_000_000) / 1_000_000 = 2_000  (== mock bst_price)
        assert_eq!(analytics.total_bst_bought, 1_000_000);
        assert_eq!(analytics.average_price, 2_000);
    }

    // -------------------------------------------------------------------------
    // Multiple sequential buybacks — cumulative correctness
    // -------------------------------------------------------------------------

    #[test]
    fn test_pricing_multiple_buybacks_accumulate_correctly() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &Some(1), // allow buyback every ledger
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &6_000);

        // Two manual buybacks of 1_000 each
        client.manual_buyback(&admin, &1_000);
        client.manual_buyback(&admin, &1_000);

        let analytics = client.get_buyback_analytics();
        assert_eq!(analytics.total_buybacks, 2);
        // Each: (1_000 * 1_000_000) / 2_000 = 500_000 BST
        assert_eq!(analytics.total_bst_bought, 1_000_000);
        assert_eq!(analytics.total_xlm_spent, 2_000);
    }

    // -------------------------------------------------------------------------
    // History records contain correct pricing data
    // -------------------------------------------------------------------------

    #[test]
    fn test_pricing_history_record_fields() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &4_000);

        client.manual_buyback(&admin, &4_000);

        let history = client.get_buyback_history(&0, &1);
        assert_eq!(history.len(), 1);
        let record = history.get(0).unwrap();
        // bst_price stored in record must equal the mock oracle price (2000)
        assert_eq!(record.bst_price, 2_000);
        // xlm_spent matches what was requested
        assert_eq!(record.xlm_spent, 4_000);
        // amount_bought == (4_000 * 1_000_000) / 2_000 = 2_000_000
        assert_eq!(record.amount_bought, 2_000_000);
    }

    // -------------------------------------------------------------------------
    // Manual buyback — insufficient reserve guard
    // -------------------------------------------------------------------------

    #[test]
    #[should_panic(expected = "Insufficient reserve for buyback")]
    fn test_manual_buyback_insufficient_reserve_panics() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        // Reserve = 500, requesting 1_000
        client.add_to_reserve(&funder, &500);
        client.manual_buyback(&admin, &1_000);
    }

    #[test]
    #[should_panic(expected = "Buyback is disabled")]
    fn test_manual_buyback_disabled_panics() {
        let (env, client, admin) = setup();
        // buyback is disabled by default
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &10_000);
        client.manual_buyback(&admin, &1_000);
    }

    // -------------------------------------------------------------------------
    // check_and_execute_buyback — interval gating
    // -------------------------------------------------------------------------

    #[test]
    fn test_check_and_execute_respects_interval() {
        let (env, client, admin) = setup();
        // Set a very long interval so the second call cannot fire
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &Some(99_999),
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &10_000);

        // First call: ledger 0, last_buyback 0, interval 99_999 → 0 - 0 = 0 < 99_999, skip
        client.check_and_execute_buyback();
        let analytics = client.get_buyback_analytics();
        assert_eq!(analytics.total_buybacks, 0);
    }

    // -------------------------------------------------------------------------
    // check_and_execute_buyback — price threshold gating
    // -------------------------------------------------------------------------

    #[test]
    fn test_check_and_execute_skips_when_price_below_threshold() {
        let (env, client, admin) = setup();
        // Mock price is 2000, set threshold ABOVE mock price so condition fails
        client.update_config(
            &admin,
            &Some(true),
            &Some(9999), // threshold > mock price 2000 → should skip
            &Some(i128::MAX / 2),
            &Some(0),
            &Some(0),
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &10_000);

        client.check_and_execute_buyback();

        let analytics = client.get_buyback_analytics();
        assert_eq!(analytics.total_buybacks, 0);
    }

    // -------------------------------------------------------------------------
    // check_and_execute_buyback — reserve floor gating
    // -------------------------------------------------------------------------

    #[test]
    fn test_check_and_execute_skips_when_reserve_at_floor() {
        let (env, client, admin) = setup();
        // Set min_reserve_balance == reserve, so available == 0
        client.update_config(
            &admin,
            &Some(true),
            &Some(1000), // threshold <= mock price 2000 → passes price gate
            &Some(i128::MAX / 2),
            &Some(500),  // min_reserve == deposit amount
            &Some(0),
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &500);

        client.check_and_execute_buyback();

        let analytics = client.get_buyback_analytics();
        assert_eq!(analytics.total_buybacks, 0);
    }

    // =========================================================================
    // Pricing calculations — extended coverage (#860)
    //
    // The three private helpers are exercised indirectly through the public
    // manual_buyback and check_and_execute_buyback entry points so that we can
    // assert the end-to-end numeric correctness without making them pub(crate).
    // =========================================================================

    // -------------------------------------------------------------------------
    // calculate_bst_from_xlm  →  (xlm * 1_000_000) / bst_price
    // -------------------------------------------------------------------------

    /// Standard case: 1 000 XLM at price 2 000 → 500 000 BST
    #[test]
    fn test_pricing_bst_from_xlm_standard() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &1_000);

        client.manual_buyback(&admin, &1_000);

        let analytics = client.get_buyback_analytics();
        // bst_price = 2000 (hardcoded mock), xlm = 1_000
        // bst = (1_000 * 1_000_000) / 2_000 = 500_000
        // capped by max_buyback_amount (i128::MAX/2 >> 500_000) → remains 500_000
        assert_eq!(analytics.total_bst_bought, 500_000);
        assert_eq!(analytics.total_xlm_spent, 1_000);
    }

    /// Larger buyback: 10_000 XLM at price 2 000 → 5_000_000 BST
    #[test]
    fn test_pricing_bst_from_xlm_larger_amount() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &10_000);

        client.manual_buyback(&admin, &10_000);

        let analytics = client.get_buyback_analytics();
        // (10_000 * 1_000_000) / 2_000 = 5_000_000
        assert_eq!(analytics.total_bst_bought, 5_000_000);
        assert_eq!(analytics.total_xlm_spent, 10_000);
    }

    /// Zero XLM amount → panic (reserve check fails: 0 >= 0 + min_reserve).
    #[test]
    #[should_panic]
    fn test_pricing_bst_from_xlm_zero_amount_panics() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &5_000);
        client.manual_buyback(&admin, &0);
    }

    /// Negative XLM amount → panic (reserve assertion fails).
    #[test]
    #[should_panic]
    fn test_pricing_bst_from_xlm_negative_amount_panics() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &5_000);
        client.manual_buyback(&admin, &-1);
    }

    // -------------------------------------------------------------------------
    // calculate_xlm_from_available  →  available.min(max_buyback_amount)
    // -------------------------------------------------------------------------

    /// When available < max_buyback_amount, spend exactly available.
    #[test]
    fn test_pricing_xlm_from_available_limited_by_available() {
        let (env, client, admin) = setup();
        // max_buyback_amount set much larger than reserve
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(1_000_000),
            &Some(0),
            &Some(0), // allow buyback at ledger 0
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &500);

        // check_and_execute: price 2000 > threshold 1000, interval 0 passes
        client.check_and_execute_buyback();

        let analytics = client.get_buyback_analytics();
        // available = 500, max = 1_000_000 → spends entire available
        assert_eq!(analytics.total_xlm_spent, 500);
    }

    /// When available > max_buyback_amount, spending is capped at max_buyback_amount.
    #[test]
    fn test_pricing_xlm_from_available_capped_by_max() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(300),   // cap at 300
            &Some(0),
            &Some(0),
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &1_000);

        client.check_and_execute_buyback();

        let analytics = client.get_buyback_analytics();
        // capped at max_buyback_amount = 300
        assert_eq!(analytics.total_xlm_spent, 300);
    }

    /// When available == max_buyback_amount, the full amount is spent (no off-by-one).
    #[test]
    fn test_pricing_xlm_from_available_exact_match() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(750),
            &Some(0),
            &Some(0),
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &750);

        client.check_and_execute_buyback();

        let analytics = client.get_buyback_analytics();
        assert_eq!(analytics.total_xlm_spent, 750);
    }

    // -------------------------------------------------------------------------
    // BST cap in execute_buyback_via_dex
    //   bst_to_buy = estimated_bst_amount.min(max_buyback_amount)
    //
    // This is distinct from the XLM cap above. When max_buyback_amount is set
    // small enough that the *BST result* of the formula exceeds it, the BST
    // purchased is clamped — even though the full XLM was spent.
    // -------------------------------------------------------------------------

    /// BST output capped when calculated BST > max_buyback_amount.
    /// xlm = 10_000, bst_price = 2_000  →  estimated_bst = 5_000_000
    /// max_buyback_amount = 100  →  bst_to_buy = 100
    #[test]
    fn test_pricing_bst_cap_applied_when_estimated_exceeds_max() {
        let (env, client, admin) = setup();
        // max_buyback_amount = 100 (tiny, so BST formula result >> cap)
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(100), // max_buyback_amount = 100 BST units
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        // Reserve must cover the requested XLM (10_000)
        client.add_to_reserve(&funder, &10_000);

        client.manual_buyback(&admin, &10_000);

        let analytics = client.get_buyback_analytics();
        // estimated_bst = (10_000 * 1_000_000) / 2_000 = 5_000_000
        // capped at max_buyback_amount = 100
        assert_eq!(analytics.total_bst_bought, 100);
        // XLM is fully spent regardless of BST cap
        assert_eq!(analytics.total_xlm_spent, 10_000);
    }

    /// When estimated BST is below max, no cap is applied.
    #[test]
    fn test_pricing_bst_cap_not_applied_when_estimated_below_max() {
        let (env, client, admin) = setup();
        // max_buyback_amount = 1_000_000_000 (huge, well above formula result)
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(1_000_000_000),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &2_000);

        client.manual_buyback(&admin, &2_000);

        let analytics = client.get_buyback_analytics();
        // estimated_bst = (2_000 * 1_000_000) / 2_000 = 1_000_000
        // 1_000_000 < 1_000_000_000  →  no cap
        assert_eq!(analytics.total_bst_bought, 1_000_000);
    }

    // -------------------------------------------------------------------------
    // calculate_xlm_from_bst  →  (bst_amount * bst_price) / 1_000_000
    // Exercised through the average_price field in analytics:
    //   average_price = (total_xlm_spent * 1_000_000) / total_bst_bought
    // which is the inverse of bst_from_xlm, confirming round-trip consistency.
    // -------------------------------------------------------------------------

    /// Verify the average_price computed from analytics matches the mock price.
    #[test]
    fn test_pricing_average_price_round_trip() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &2_000);

        client.manual_buyback(&admin, &2_000);

        let analytics = client.get_buyback_analytics();
        // total_xlm_spent = 2_000
        // total_bst_bought = (2_000 * 1_000_000) / 2_000 = 1_000_000
        // average_price = (2_000 * 1_000_000) / 1_000_000 = 2_000  (== mock bst_price)
        assert_eq!(analytics.total_bst_bought, 1_000_000);
        assert_eq!(analytics.average_price, 2_000);
    }

    // -------------------------------------------------------------------------
    // Post-buyback reserve depletion
    // -------------------------------------------------------------------------

    /// After a buyback, the reserve is decremented by exactly xlm_spent.
    #[test]
    fn test_pricing_reserve_decremented_after_buyback() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &5_000);
        assert_eq!(client.get_reserve_balance(), 5_000);

        client.manual_buyback(&admin, &1_500);

        // Reserve must drop by exactly 1_500
        assert_eq!(client.get_reserve_balance(), 3_500);
    }

    /// After check_and_execute_buyback fires, the reserve decreases by the XLM spent.
    #[test]
    fn test_pricing_reserve_decremented_after_auto_buyback() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(400), // max_buyback_amount limits what is spent
            &Some(0),
            &Some(0),
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &1_000);

        client.check_and_execute_buyback();

        // 400 XLM spent, 600 remain
        assert_eq!(client.get_reserve_balance(), 600);
    }

    // -------------------------------------------------------------------------
    // check_and_execute_buyback happy path
    // -------------------------------------------------------------------------

    /// The automatic path fires and records a buyback entry when all gates pass.
    #[test]
    fn test_check_and_execute_happy_path_records_buyback() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &Some(1_000),          // price threshold below mock price (2000)
            &Some(i128::MAX / 2),
            &Some(0),              // no reserve floor
            &Some(0),              // no interval constraint
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &3_000);

        client.check_and_execute_buyback();

        let analytics = client.get_buyback_analytics();
        assert_eq!(analytics.total_buybacks, 1);
        assert_eq!(analytics.total_xlm_spent, 3_000);
        // BST = (3_000 * 1_000_000) / 2_000 = 1_500_000
        assert_eq!(analytics.total_bst_bought, 1_500_000);
    }

    // -------------------------------------------------------------------------
    // Analytics last_buyback_timestamp is set after buyback
    // -------------------------------------------------------------------------

    #[test]
    fn test_pricing_last_buyback_timestamp_set_after_buyback() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &1_000);

        // Timestamp must be 0 before any buyback
        assert_eq!(client.get_buyback_analytics().last_buyback_timestamp, 0);

        client.manual_buyback(&admin, &1_000);

        // After buyback the timestamp must be non-zero
        let ts = client.get_buyback_analytics().last_buyback_timestamp;
        assert!(ts > 0, "last_buyback_timestamp should be set after a buyback");
    }

    // -------------------------------------------------------------------------
    // History pagination  →  get_buyback_history(start_index, limit)
    // -------------------------------------------------------------------------

    /// Requesting records with a non-zero start_index skips earlier entries.
    #[test]
    fn test_pricing_history_pagination_start_index() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &9_000);

        // Three buybacks of 1_000 each
        client.manual_buyback(&admin, &1_000);
        client.manual_buyback(&admin, &1_000);
        client.manual_buyback(&admin, &1_000);

        // start=0, limit=3 → all three records
        let all = client.get_buyback_history(&0, &3);
        assert_eq!(all.len(), 3);

        // start=1, limit=2 → records at index 1 and 2 only
        let page = client.get_buyback_history(&1, &2);
        assert_eq!(page.len(), 2);

        // start=2, limit=1 → only the third record
        let last = client.get_buyback_history(&2, &1);
        assert_eq!(last.len(), 1);
    }

    /// Requesting with start_index beyond the history count returns an empty vec.
    #[test]
    fn test_pricing_history_pagination_out_of_bounds_returns_empty() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &1_000);
        client.manual_buyback(&admin, &1_000);

        // History has 1 entry; starting at index 5 should return nothing
        let result = client.get_buyback_history(&5, &10);
        assert_eq!(result.len(), 0);
    }

    /// Limit larger than remaining entries returns only what exists.
    #[test]
    fn test_pricing_history_pagination_limit_clamps_to_available() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &2_000);

        client.manual_buyback(&admin, &1_000);
        client.manual_buyback(&admin, &1_000);

        // Two records exist; ask for 100 starting at 0 → only 2 returned
        let result = client.get_buyback_history(&0, &100);
        assert_eq!(result.len(), 2);
    }

    // -------------------------------------------------------------------------
    // Multiple sequential buybacks — cumulative correctness
    // -------------------------------------------------------------------------

    #[test]
    fn test_pricing_multiple_buybacks_accumulate_correctly() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &Some(1), // allow buyback every ledger
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &6_000);

        // Two manual buybacks of 1_000 each
        client.manual_buyback(&admin, &1_000);
        client.manual_buyback(&admin, &1_000);

        let analytics = client.get_buyback_analytics();
        assert_eq!(analytics.total_buybacks, 2);
        // Each: (1_000 * 1_000_000) / 2_000 = 500_000 BST
        assert_eq!(analytics.total_bst_bought, 1_000_000);
        assert_eq!(analytics.total_xlm_spent, 2_000);
    }

    // -------------------------------------------------------------------------
    // History records contain correct pricing data
    // -------------------------------------------------------------------------

    #[test]
    fn test_pricing_history_record_fields() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &4_000);

        client.manual_buyback(&admin, &4_000);

        let history = client.get_buyback_history(&0, &1);
        assert_eq!(history.len(), 1);
        let record = history.get(0).unwrap();
        // bst_price stored in record must equal the mock oracle price (2000)
        assert_eq!(record.bst_price, 2_000);
        // xlm_spent matches what was requested
        assert_eq!(record.xlm_spent, 4_000);
        // amount_bought == (4_000 * 1_000_000) / 2_000 = 2_000_000
        assert_eq!(record.amount_bought, 2_000_000);
    }

    // -------------------------------------------------------------------------
    // Manual buyback — guard tests
    // -------------------------------------------------------------------------

    #[test]
    #[should_panic(expected = "Insufficient reserve for buyback")]
    fn test_manual_buyback_insufficient_reserve_panics() {
        let (env, client, admin) = setup();
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &500);
        client.manual_buyback(&admin, &1_000);
    }

    #[test]
    #[should_panic(expected = "Buyback is disabled")]
    fn test_manual_buyback_disabled_panics() {
        let (env, client, admin) = setup();
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &10_000);
        client.manual_buyback(&admin, &1_000);
    }

    // -------------------------------------------------------------------------
    // Large-number precision (#860)
    // -------------------------------------------------------------------------

    /// Very large XLM amounts must not overflow — checked_mul saturates safely
    /// and the formula still produces a consistent result.
    #[test]
    fn test_pricing_large_xlm_amount_does_not_overflow() {
        let (env, client, admin) = setup();
        // Use a modest XLM amount that is large but won't overflow i128 when
        // multiplied by 1_000_000 (max safe: i128::MAX / 1_000_000 ≈ 1.7e32).
        // We pick 1_000_000_000_000_000 (1e15) — well within range.
        let large_xlm: i128 = 1_000_000_000_000_000;
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &large_xlm);

        client.manual_buyback(&admin, &large_xlm);

        let analytics = client.get_buyback_analytics();
        // (1e15 * 1_000_000) / 2_000 = 5e17
        assert_eq!(analytics.total_xlm_spent, large_xlm);
        assert_eq!(analytics.total_bst_bought, large_xlm * 1_000_000 / 2_000);
    }

    // -------------------------------------------------------------------------
    // check_and_execute_buyback — interval gating
    // -------------------------------------------------------------------------

    #[test]
    fn test_check_and_execute_respects_interval() {
        let (env, client, admin) = setup();
        // Very long interval — should prevent buyback from firing at ledger 0
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &Some(99_999),
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &10_000);

        client.check_and_execute_buyback();
        assert_eq!(client.get_buyback_analytics().total_buybacks, 0);
    }

    // -------------------------------------------------------------------------
    // check_and_execute_buyback — price threshold gating
    // -------------------------------------------------------------------------

    #[test]
    fn test_check_and_execute_skips_when_price_below_threshold() {
        let (env, client, admin) = setup();
        // Mock price is 2000; set threshold above mock price
        client.update_config(
            &admin,
            &Some(true),
            &Some(9_999), // > mock price 2000 → skip
            &Some(i128::MAX / 2),
            &Some(0),
            &Some(0),
        );
        let funder = Address::generate(&env);
        client.add_to_reserve(&funder, &10_000);

        client.check_and_execute_buyback();

        assert_eq!(client.get_buyback_analytics().total_buybacks, 0);
    }
}
