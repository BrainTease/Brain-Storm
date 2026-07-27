#[cfg(test)]
mod tests {
    use crate::{TokenRestrictionsContract, TokenRestrictionsContractClient};
    use soroban_sdk::{testutils::Address as _, Address, Env};

    fn setup() -> (Env, TokenRestrictionsContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, TokenRestrictionsContract);
        let client = TokenRestrictionsContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin)
    }

    #[test]
    fn test_initialize() {
        let (_, _, _) = setup();
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_panics() {
        let (_, client, admin) = setup();
        client.initialize(&admin);
    }

    #[test]
    fn test_add_to_whitelist() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.add_to_whitelist(&admin, &account);
        assert!(client.is_whitelisted(&account));
    }

    #[test]
    fn test_not_whitelisted_by_default() {
        let (env, client, _) = setup();
        let account = Address::generate(&env);
        assert!(!client.is_whitelisted(&account));
    }

    #[test]
    fn test_remove_from_whitelist() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.add_to_whitelist(&admin, &account);
        client.remove_from_whitelist(&admin, &account);
        assert!(!client.is_whitelisted(&account));
    }

    #[test]
    #[should_panic(expected = "Only admin can manage whitelist")]
    fn test_non_admin_cannot_whitelist() {
        let (env, client, _) = setup();
        let rando = Address::generate(&env);
        let account = Address::generate(&env);
        client.add_to_whitelist(&rando, &account);
    }

    #[test]
    fn test_add_to_blacklist() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.add_to_blacklist(&admin, &account);
        assert!(client.is_blacklisted(&account));
    }

    #[test]
    fn test_not_blacklisted_by_default() {
        let (env, client, _) = setup();
        let account = Address::generate(&env);
        assert!(!client.is_blacklisted(&account));
    }

    #[test]
    fn test_remove_from_blacklist() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.add_to_blacklist(&admin, &account);
        client.remove_from_blacklist(&admin, &account);
        assert!(!client.is_blacklisted(&account));
    }

    #[test]
    #[should_panic(expected = "Only admin can manage blacklist")]
    fn test_non_admin_cannot_blacklist() {
        let (env, client, _) = setup();
        let rando = Address::generate(&env);
        let account = Address::generate(&env);
        client.add_to_blacklist(&rando, &account);
    }

    #[test]
    fn test_set_transfer_limit() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.set_transfer_limit(&admin, &account, &5000);
        assert_eq!(client.get_transfer_limit(&account), 5000);
    }

    #[test]
    fn test_default_transfer_limit_is_zero() {
        let (env, client, _) = setup();
        let account = Address::generate(&env);
        assert_eq!(client.get_transfer_limit(&account), 0);
    }

    #[test]
    #[should_panic(expected = "Only admin can set limits")]
    fn test_non_admin_cannot_set_limit() {
        let (env, client, _) = setup();
        let rando = Address::generate(&env);
        let account = Address::generate(&env);
        client.set_transfer_limit(&rando, &account, &5000);
    }

    #[test]
    fn test_request_transfer_approval() {
        let (env, client, _) = setup();
        let from = Address::generate(&env);
        let to = Address::generate(&env);
        client.request_transfer_approval(&from, &to, &1000);
        assert!(!client.is_transfer_approved(&from, &to));
    }

    #[test]
    fn test_approve_transfer() {
        let (env, client, admin) = setup();
        let from = Address::generate(&env);
        let to = Address::generate(&env);
        client.request_transfer_approval(&from, &to, &1000);
        client.approve_transfer(&admin, &from, &to);
        assert!(client.is_transfer_approved(&from, &to));
    }

    // Security: whitelist and blacklist are independent
    #[test]
    fn test_whitelist_and_blacklist_are_independent() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.add_to_whitelist(&admin, &account);
        client.add_to_blacklist(&admin, &account);
        assert!(client.is_whitelisted(&account));
        assert!(client.is_blacklisted(&account));
    }
}
