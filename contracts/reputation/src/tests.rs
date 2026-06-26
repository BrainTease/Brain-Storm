#[cfg(test)]
mod tests {
    use crate::{ReputationContract, ReputationContractClient};
    use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

    fn setup() -> (Env, ReputationContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, ReputationContract);
        let client = ReputationContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin)
    }

    #[test]
    fn test_initialize_sets_admin() {
        let (_, client, admin) = setup();
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_panics() {
        let (_, client, admin) = setup();
        client.initialize(&admin);
    }

    #[test]
    fn test_update_and_get_reputation() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &100, &symbol_short!("course"), &None);
        assert_eq!(client.get_reputation(&user), 100);
    }

    #[test]
    fn test_reputation_accumulates() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        let reason = symbol_short!("course");
        client.update_reputation(&admin, &user, &100, &reason, &None);
        client.update_reputation(&admin, &user, &50, &reason, &None);
        assert_eq!(client.get_reputation(&user), 150);
    }

    #[test]
    fn test_reputation_cannot_go_negative() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &-9999, &symbol_short!("decay"), &None);
        assert_eq!(client.get_reputation(&user), 0);
    }

    #[test]
    #[should_panic(expected = "Unauthorized caller")]
    fn test_non_authorized_cannot_update() {
        let (env, client, _) = setup();
        let rando = Address::generate(&env);
        let user = Address::generate(&env);
        client.update_reputation(&rando, &user, &100, &symbol_short!("course"), &None);
    }

    // ── #657: Authorized caller tests ────────────────────────────────────────

    #[test]
    fn test_admin_is_always_authorized() {
        let (_, client, admin) = setup();
        assert!(client.is_authorized_caller(&admin));
    }

    #[test]
    fn test_add_authorized_caller() {
        let (env, client, admin) = setup();
        let market = Address::generate(&env);
        assert!(!client.is_authorized_caller(&market));
        client.add_authorized_caller(&admin, &market);
        assert!(client.is_authorized_caller(&market));
    }

    #[test]
    fn test_authorized_caller_can_update_reputation() {
        let (env, client, admin) = setup();
        let market = Address::generate(&env);
        let user = Address::generate(&env);
        client.add_authorized_caller(&admin, &market);
        client.update_reputation(&market, &user, &200, &symbol_short!("market"), &None);
        assert_eq!(client.get_reputation(&user), 200);
    }

    #[test]
    fn test_remove_authorized_caller() {
        let (env, client, admin) = setup();
        let market = Address::generate(&env);
        client.add_authorized_caller(&admin, &market);
        client.remove_authorized_caller(&admin, &market);
        assert!(!client.is_authorized_caller(&market));
    }

    // ── #657: Slashing tests ──────────────────────────────────────────────────

    #[test]
    fn test_admin_can_slash() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &200, &symbol_short!("course"), &None);
        client.slash(&admin, &user, &50, &symbol_short!("fraud"));
        assert_eq!(client.get_reputation(&user), 150);
    }

    #[test]
    fn test_authorized_caller_can_slash() {
        let (env, client, admin) = setup();
        let escrow = Address::generate(&env);
        let user = Address::generate(&env);
        client.add_authorized_caller(&admin, &escrow);
        client.update_reputation(&admin, &user, &300, &symbol_short!("course"), &None);
        client.slash(&escrow, &user, &100, &symbol_short!("dispute"));
        assert_eq!(client.get_reputation(&user), 200);
    }

    #[test]
    fn test_slash_cannot_go_below_zero() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &50, &symbol_short!("course"), &None);
        client.slash(&admin, &user, &9999, &symbol_short!("fraud"));
        assert_eq!(client.get_reputation(&user), 0);
    }

    #[test]
    #[should_panic(expected = "Unauthorized caller")]
    fn test_unauthorized_cannot_slash() {
        let (env, client, _) = setup();
        let rando = Address::generate(&env);
        let user = Address::generate(&env);
        client.slash(&rando, &user, &50, &symbol_short!("fraud"));
    }

    // ── Existing tests ────────────────────────────────────────────────────────

    #[test]
    fn test_reputation_level_starts_at_one() {
        let (env, client, _) = setup();
        let user = Address::generate(&env);
        assert_eq!(client.get_reputation_level(&user), 1);
    }

    #[test]
    fn test_reputation_level_increases_with_score() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &400, &symbol_short!("course"), &None);
        assert!(client.get_reputation_level(&user) >= 2);
    }

    #[test]
    fn test_verify_reputation_threshold_pass() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &200, &symbol_short!("course"), &None);
        assert!(client.verify_reputation_threshold(&user, &100));
    }

    #[test]
    fn test_verify_reputation_threshold_fail() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &50, &symbol_short!("course"), &None);
        assert!(!client.verify_reputation_threshold(&user, &100));
    }

    #[test]
    fn test_total_reputation_sums_all_users() {
        let (env, client, admin) = setup();
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let reason = symbol_short!("course");
        client.update_reputation(&admin, &user1, &100, &reason, &None);
        client.update_reputation(&admin, &user2, &200, &reason, &None);
        assert_eq!(client.get_total_reputation(), 300);
    }

    #[test]
    fn test_reputation_history_records_updates() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        let reason = symbol_short!("course");
        client.update_reputation(&admin, &user, &100, &reason, &None);
        client.update_reputation(&admin, &user, &50, &reason, &None);
        let history = client.get_reputation_history(&user, &0, &10);
        assert_eq!(history.len(), 2);
    }

    #[test]
    fn test_reputation_record_has_correct_user() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &100, &symbol_short!("course"), &None);
        let record = client.get_reputation_record(&user).unwrap();
        assert_eq!(record.user, user);
        assert_eq!(record.score, 100);
    }

    #[test]
    fn test_claim_reputation_reward_emits_event() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &400, &symbol_short!("course"), &None);
        client.claim_reputation_reward(&user);
    }
}
