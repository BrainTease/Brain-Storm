#[cfg(test)]
mod tests {
    use crate::{RoyaltyDistributionContract, RoyaltyDistributionContractClient};
    use soroban_sdk::{testutils::Address as _, Address, Env};

    fn setup() -> (Env, RoyaltyDistributionContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, RoyaltyDistributionContract);
        let client = RoyaltyDistributionContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin)
    }

    #[test]
    fn test_initialize() {
        let (_, _, _) = setup();
        // Contract initialized without panic
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_panics() {
        let (_, client, admin) = setup();
        client.initialize(&admin);
    }

    #[test]
    fn test_set_royalty_split_valid() {
        let (_, client, admin) = setup();
        client.set_royalty_split(&admin, &1, &60, &30, &10);
        let split = client.get_royalty_split(&1).unwrap();
        assert_eq!(split.creator_percentage, 60);
        assert_eq!(split.contributor_percentage, 30);
        assert_eq!(split.platform_percentage, 10);
    }

    #[test]
    #[should_panic(expected = "Percentages must sum to 100")]
    fn test_split_not_summing_to_100_panics() {
        let (_, client, admin) = setup();
        client.set_royalty_split(&admin, &1, &50, &30, &10); // 90 ≠ 100
    }

    #[test]
    #[should_panic(expected = "Only admin can set splits")]
    fn test_non_admin_cannot_set_split() {
        let (env, client, _) = setup();
        let rando = Address::generate(&env);
        client.set_royalty_split(&rando, &1, &60, &30, &10);
    }

    #[test]
    fn test_add_royalty_recipient() {
        let (env, client, admin) = setup();
        let creator = Address::generate(&env);
        client.set_royalty_split(&admin, &1, &60, &30, &10);
        client.add_royalty_recipient(&admin, &1, &creator);
    }

    #[test]
    #[should_panic(expected = "Only admin can add recipients")]
    fn test_non_admin_cannot_add_recipient() {
        let (env, client, admin) = setup();
        let rando = Address::generate(&env);
        let recipient = Address::generate(&env);
        client.set_royalty_split(&admin, &1, &60, &30, &10);
        client.add_royalty_recipient(&rando, &1, &recipient);
    }

    #[test]
    fn test_distribute_royalties_and_balance() {
        let (env, client, admin) = setup();
        let creator = Address::generate(&env);
        let contributor = Address::generate(&env);
        let platform = Address::generate(&env);

        client.set_royalty_split(&admin, &1, &60, &30, &10);
        client.add_royalty_recipient(&admin, &1, &creator);
        client.add_royalty_recipient(&admin, &1, &contributor);
        client.add_royalty_recipient(&admin, &1, &platform);

        client.distribute_royalties(&admin, &1, &1000);
        assert_eq!(client.get_royalty_balance(&creator), 600);
        assert_eq!(client.get_royalty_balance(&contributor), 300);
    }

    #[test]
    #[should_panic(expected = "Amount must be positive")]
    fn test_distribute_zero_amount_panics() {
        let (env, client, admin) = setup();
        let creator = Address::generate(&env);
        client.set_royalty_split(&admin, &1, &60, &30, &10);
        client.add_royalty_recipient(&admin, &1, &creator);
        client.distribute_royalties(&admin, &1, &0);
    }

    #[test]
    fn test_withdraw_royalties() {
        let (env, client, admin) = setup();
        let creator = Address::generate(&env);
        let contributor = Address::generate(&env);
        let platform = Address::generate(&env);

        client.set_royalty_split(&admin, &1, &60, &30, &10);
        client.add_royalty_recipient(&admin, &1, &creator);
        client.add_royalty_recipient(&admin, &1, &contributor);
        client.add_royalty_recipient(&admin, &1, &platform);

        client.distribute_royalties(&admin, &1, &1000);
        let withdrawn = client.withdraw_royalties(&creator);
        assert_eq!(withdrawn, 600);
        assert_eq!(client.get_royalty_balance(&creator), 0);
    }

    #[test]
    #[should_panic(expected = "No royalties to withdraw")]
    fn test_withdraw_with_no_balance_panics() {
        let (env, client, _) = setup();
        let user = Address::generate(&env);
        client.withdraw_royalties(&user);
    }

    #[test]
    fn test_split_not_found_returns_none() {
        let (_, client, _) = setup();
        assert!(client.get_royalty_split(&999).is_none());
    }
}
