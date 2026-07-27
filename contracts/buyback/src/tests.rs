#[cfg(test)]
mod tests {
    use crate::{BuybackContract, BuybackContractClient};
    use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

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
    #[should_panic(expected = "Only admin can update config")]
    fn test_non_admin_cannot_update_config() {
        let (env, client, _) = setup();
        let rando = Address::generate(&env);
        client.update_config(&rando, &Some(true), &None, &None, &None, &None);
    }

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

    #[test]
    fn test_get_buyback_analytics_initial_state() {
        let (_, client, _) = setup();
        let analytics = client.get_buyback_analytics();
        assert_eq!(analytics.total_buybacks, 0);
        assert_eq!(analytics.total_bst_bought, 0);
        assert_eq!(analytics.total_xlm_spent, 0);
    }

    #[test]
    fn test_check_and_execute_disabled_is_noop() {
        let (_, client, _) = setup();
        // Should not panic when buyback is disabled
        client.check_and_execute_buyback();
    }

    #[test]
    fn test_get_buyback_history_empty() {
        let (_, client, _) = setup();
        let history = client.get_buyback_history(&0, &10);
        assert_eq!(history.len(), 0);
    }
}
