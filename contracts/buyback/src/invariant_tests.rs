/// Invariant / property-based tests for the BuybackContract (#1011).
///
/// # Documented Invariants
///
/// The following accounting invariants must hold for every sequence of
/// buyback operations, regardless of the order or number of operations:
///
/// ## INV-1  Treasury conservation
/// ```text
/// reserve_before == xlm_spent + reserve_after
/// ```
/// Every XLM that leaves the reserve is recorded in `total_xlm_spent`; no XLM
/// can be silently created or destroyed.
///
/// ## INV-2  Token accounting
/// ```text
/// total_bst_bought == Σ record.amount_bought  (over all history entries)
/// ```
/// The cumulative `total_bst_bought` field equals the sum of every individual
/// `BuybackRecord.amount_bought`.  These tokens are "burned" from circulating
/// supply conceptually (the DEX call would burn them in production).
///
/// ## INV-3  History count integrity
/// ```text
/// history_count == number_of_buyback_records
/// ```
/// Every execution produces exactly one history entry.
///
/// ## INV-4  Reserve floor
/// ```text
/// reserve_after >= 0
/// ```
/// A buyback can never drive the reserve below zero.
///
/// ## INV-5  BST formula monotonicity
/// ```text
/// xlm_1 <= xlm_2  ⟹  bst_1 <= bst_2  (for same bst_price)
/// ```
/// Buying with more XLM never yields fewer BST tokens.
///
/// ## INV-6  Analytics consistency
/// ```text
/// analytics.total_buybacks == history_count
/// analytics.total_bst_bought == Σ record.amount_bought
/// analytics.total_xlm_spent == Σ record.xlm_spent
/// ```
#[cfg(test)]
mod invariant_tests {
    use crate::{BuybackContract, BuybackContractClient, BuybackRecord};
    use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, Vec};

    // =========================================================================
    // Shared fixture helpers
    // =========================================================================

    fn make_client(env: &Env) -> (BuybackContractClient<'static>, Address, Address) {
        let id = env.register_contract(None, BuybackContract);
        let client = BuybackContractClient::new(env, &id);
        let admin = Address::generate(env);
        let token = Address::generate(env);
        let oracle = Address::generate(env);
        let dex = Address::generate(env);
        let pool_id = BytesN::from_array(env, &[0u8; 32]);
        client.initialize(&admin, &token, &oracle, &dex, &pool_id);
        // Enable: no BST cap, no reserve floor
        client.update_config(
            &admin,
            &Some(true),
            &None,
            &Some(i128::MAX / 2),
            &Some(0),
            &None,
        );
        let funder = Address::generate(env);
        (client, admin, funder)
    }

    /// Sum `amount_bought` across all history records.
    fn sum_bst(history: &Vec<BuybackRecord>) -> i128 {
        let mut total = 0_i128;
        for r in history.iter() {
            total += r.amount_bought;
        }
        total
    }

    /// Sum `xlm_spent` across all history records.
    fn sum_xlm(history: &Vec<BuybackRecord>) -> i128 {
        let mut total = 0_i128;
        for r in history.iter() {
            total += r.xlm_spent;
        }
        total
    }

    // =========================================================================
    // INV-1: Treasury conservation
    //   reserve_before == xlm_spent + reserve_after
    // =========================================================================

    #[test]
    fn inv1_treasury_conservation_single_buyback() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, funder) = make_client(&env);

        let initial_reserve: i128 = 10_000;
        client.add_to_reserve(&funder, &initial_reserve);

        let xlm_to_spend: i128 = 3_000;
        client.manual_buyback(&admin, &xlm_to_spend);

        let reserve_after = client.get_reserve_balance();
        let analytics = client.get_buyback_analytics();

        assert_eq!(
            initial_reserve,
            analytics.total_xlm_spent + reserve_after,
            "INV-1 violated: reserve_before != xlm_spent + reserve_after"
        );
    }

    #[test]
    fn inv1_treasury_conservation_multiple_buybacks() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, funder) = make_client(&env);

        let initial_reserve: i128 = 30_000;
        client.add_to_reserve(&funder, &initial_reserve);

        for xlm in [1_000_i128, 5_000, 2_500] {
            client.manual_buyback(&admin, &xlm);
        }

        let reserve_after = client.get_reserve_balance();
        let analytics = client.get_buyback_analytics();

        assert_eq!(
            initial_reserve,
            analytics.total_xlm_spent + reserve_after,
            "INV-1 violated after multiple buybacks"
        );
    }

    #[test]
    fn inv1_treasury_conservation_after_check_and_execute() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, funder) = make_client(&env);

        // Set a known max to make the XLM-spent predictable
        client.update_config(
            &admin,
            &Some(true),
            &Some(1_000), // price threshold below mock price 2000
            &Some(4_000), // max_buyback_amount = 4_000 XLM
            &Some(0),
            &Some(0), // interval 0 so it fires immediately
        );
        let initial_reserve: i128 = 10_000;
        client.add_to_reserve(&funder, &initial_reserve);

        client.check_and_execute_buyback();

        let reserve_after = client.get_reserve_balance();
        let analytics = client.get_buyback_analytics();

        assert_eq!(
            initial_reserve,
            analytics.total_xlm_spent + reserve_after,
            "INV-1 violated after auto buyback"
        );
    }

    // =========================================================================
    // INV-2: Token accounting
    //   total_bst_bought == Σ record.amount_bought
    // =========================================================================

    #[test]
    fn inv2_token_accounting_single_record() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, funder) = make_client(&env);

        client.add_to_reserve(&funder, &5_000);
        client.manual_buyback(&admin, &5_000);

        let analytics = client.get_buyback_analytics();
        let history = client.get_buyback_history(&0, &100);

        assert_eq!(
            analytics.total_bst_bought,
            sum_bst(&history),
            "INV-2 violated: total_bst_bought != Σ record.amount_bought"
        );
    }

    #[test]
    fn inv2_token_accounting_multiple_records() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, funder) = make_client(&env);

        client.add_to_reserve(&funder, &20_000);

        for xlm in [1_000_i128, 2_000, 3_000, 4_000] {
            client.manual_buyback(&admin, &xlm);
        }

        let analytics = client.get_buyback_analytics();
        let history = client.get_buyback_history(&0, &100);

        assert_eq!(
            analytics.total_bst_bought,
            sum_bst(&history),
            "INV-2 violated after multiple records"
        );
    }

    // =========================================================================
    // INV-3: History count integrity
    //   history_count == number of buyback records returned
    // =========================================================================

    #[test]
    fn inv3_history_count_matches_records_zero() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _) = make_client(&env);

        let analytics = client.get_buyback_analytics();
        let history = client.get_buyback_history(&0, &1_000);
        assert_eq!(
            analytics.total_buybacks,
            history.len(),
            "INV-3 violated: total_buybacks != len(history)"
        );
    }

    #[test]
    fn inv3_history_count_matches_records_after_five_ops() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, funder) = make_client(&env);

        client.add_to_reserve(&funder, &50_000);
        for _ in 0..5 {
            client.manual_buyback(&admin, &1_000);
        }

        let analytics = client.get_buyback_analytics();
        let history = client.get_buyback_history(&0, &1_000);
        assert_eq!(
            analytics.total_buybacks,
            history.len(),
            "INV-3 violated after 5 operations"
        );
        assert_eq!(analytics.total_buybacks, 5);
    }

    // =========================================================================
    // INV-4: Reserve floor — reserve never goes negative
    // =========================================================================

    #[test]
    fn inv4_reserve_never_negative_after_buyback() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, funder) = make_client(&env);

        client.add_to_reserve(&funder, &1_000);
        client.manual_buyback(&admin, &1_000); // spend entire reserve

        let reserve = client.get_reserve_balance();
        assert!(reserve >= 0, "INV-4 violated: reserve went negative");
        assert_eq!(reserve, 0);
    }

    #[test]
    fn inv4_reserve_never_negative_successive_buybacks() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, funder) = make_client(&env);

        client.add_to_reserve(&funder, &9_000);
        for _ in 0..3 {
            client.manual_buyback(&admin, &3_000);
            let reserve = client.get_reserve_balance();
            assert!(reserve >= 0, "INV-4 violated mid-loop: reserve < 0");
        }

        assert_eq!(client.get_reserve_balance(), 0);
    }

    // =========================================================================
    // INV-5: BST formula monotonicity
    //   Buying with more XLM (at the same price) must yield at least as many
    //   BST tokens.
    // =========================================================================

    #[test]
    fn inv5_bst_monotone_in_xlm() {
        // Two separate contract instances so their analytics are independent
        let env1 = Env::default();
        env1.mock_all_auths();
        let (client1, admin1, funder1) = make_client(&env1);
        client1.add_to_reserve(&funder1, &1_000);
        client1.manual_buyback(&admin1, &1_000);
        let bst_small = client1.get_buyback_analytics().total_bst_bought;

        let env2 = Env::default();
        env2.mock_all_auths();
        let (client2, admin2, funder2) = make_client(&env2);
        client2.add_to_reserve(&funder2, &2_000);
        client2.manual_buyback(&admin2, &2_000);
        let bst_large = client2.get_buyback_analytics().total_bst_bought;

        assert!(
            bst_small <= bst_large,
            "INV-5 violated: smaller xlm ({bst_small}) gave more BST than larger xlm ({bst_large})"
        );
    }

    #[test]
    fn inv5_double_xlm_doubles_bst() {
        // bst = (xlm * 1_000_000) / 2_000 → strictly proportional
        let env1 = Env::default();
        env1.mock_all_auths();
        let (client1, admin1, funder1) = make_client(&env1);
        client1.add_to_reserve(&funder1, &1_000);
        client1.manual_buyback(&admin1, &1_000);
        let bst_1k = client1.get_buyback_analytics().total_bst_bought;

        let env2 = Env::default();
        env2.mock_all_auths();
        let (client2, admin2, funder2) = make_client(&env2);
        client2.add_to_reserve(&funder2, &2_000);
        client2.manual_buyback(&admin2, &2_000);
        let bst_2k = client2.get_buyback_analytics().total_bst_bought;

        assert_eq!(bst_2k, bst_1k * 2, "INV-5: doubling XLM should double BST");
    }

    // =========================================================================
    // INV-6: Analytics consistency
    //   analytics.total_buybacks == history_count
    //   analytics.total_bst_bought == Σ record.amount_bought
    //   analytics.total_xlm_spent == Σ record.xlm_spent
    // =========================================================================

    #[test]
    fn inv6_analytics_consistent_with_history() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, funder) = make_client(&env);

        client.add_to_reserve(&funder, &15_000);

        for xlm in [1_500_i128, 3_000, 4_500] {
            client.manual_buyback(&admin, &xlm);
        }

        let analytics = client.get_buyback_analytics();
        let history = client.get_buyback_history(&0, &100);

        // INV-6a: count matches
        assert_eq!(
            analytics.total_buybacks,
            history.len(),
            "INV-6a violated: total_buybacks != len(history)"
        );

        // INV-6b: BST sum matches
        assert_eq!(
            analytics.total_bst_bought,
            sum_bst(&history),
            "INV-6b violated: total_bst_bought != Σ amount_bought"
        );

        // INV-6c: XLM sum matches
        assert_eq!(
            analytics.total_xlm_spent,
            sum_xlm(&history),
            "INV-6c violated: total_xlm_spent != Σ xlm_spent"
        );

        // Cross-check: sum of XLM in history equals exactly what we spent
        let expected_xlm: i128 = 1_500 + 3_000 + 4_500;
        assert_eq!(
            sum_xlm(&history),
            expected_xlm,
            "INV-6 cross-check: history XLM sum doesn't match deposited amounts"
        );
    }

    // =========================================================================
    // Compound: all six invariants hold simultaneously after a sequence of
    // 10 deterministic buybacks.
    // =========================================================================

    #[test]
    fn all_invariants_hold_after_sequence_of_buybacks() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, funder) = make_client(&env);

        let ops: [i128; 10] = [500, 1_000, 750, 2_000, 300, 1_500, 400, 600, 900, 1_200];
        let total_xlm: i128 = ops.iter().copied().fold(0, |a, b| a + b); // 9_150

        client.add_to_reserve(&funder, &total_xlm);
        let initial_reserve = client.get_reserve_balance();

        for &xlm in &ops {
            client.manual_buyback(&admin, &xlm);
        }

        let analytics = client.get_buyback_analytics();
        let history = client.get_buyback_history(&0, &100);
        let reserve_after = client.get_reserve_balance();

        // INV-1
        assert_eq!(
            initial_reserve,
            analytics.total_xlm_spent + reserve_after,
            "INV-1 failed in compound test"
        );

        // INV-2
        assert_eq!(
            analytics.total_bst_bought,
            sum_bst(&history),
            "INV-2 failed in compound test"
        );

        // INV-3
        assert_eq!(
            analytics.total_buybacks,
            history.len(),
            "INV-3 failed in compound test"
        );
        assert_eq!(
            analytics.total_buybacks as usize,
            ops.len(),
            "INV-3 count mismatch"
        );

        // INV-4
        assert!(
            reserve_after >= 0,
            "INV-4 failed in compound test: reserve < 0"
        );

        // INV-6
        assert_eq!(
            analytics.total_xlm_spent,
            sum_xlm(&history),
            "INV-6c failed in compound test"
        );
    }

    // =========================================================================
    // Edge case: no buybacks → all counters start at zero
    // =========================================================================

    #[test]
    fn invariants_hold_with_zero_operations() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _) = make_client(&env);

        let analytics = client.get_buyback_analytics();
        let history = client.get_buyback_history(&0, &100);
        let reserve = client.get_reserve_balance();

        // INV-1 trivially: 0 == 0 + 0
        assert_eq!(0_i128, analytics.total_xlm_spent + reserve);
        // INV-2: sum of empty history = 0
        assert_eq!(analytics.total_bst_bought, 0);
        // INV-3
        assert_eq!(analytics.total_buybacks as usize, history.len() as usize);
        // INV-4
        assert!(reserve >= 0);
    }
}
