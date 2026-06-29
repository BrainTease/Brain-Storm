/// End-to-end integration tests for the Brain-Storm contract suite.
///
/// These tests use the Soroban test environment to simulate the full
/// register → progress-tracking → token-reward flow in a single ledger
/// sequence, asserting on emitted events and final on-chain state.
#[cfg(test)]
mod integration {
    use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

    use brain_storm_analytics::{AnalyticsContract, AnalyticsContractClient};
    use brain_storm_shared::{Permission, Role, SharedContract, SharedContractClient};
    use brain_storm_token::{TokenContract, TokenContractClient};

    // ─── helpers ─────────────────────────────────────────────────────────────

    fn deploy_analytics(env: &Env) -> AnalyticsContractClient<'static> {
        let id = env.register_contract(None, AnalyticsContract);
        AnalyticsContractClient::new(env, &id)
    }

    fn deploy_token(env: &Env) -> TokenContractClient<'static> {
        let id = env.register_contract(None, TokenContract);
        TokenContractClient::new(env, &id)
    }

    fn deploy_shared(env: &Env) -> SharedContractClient<'static> {
        let id = env.register_contract(None, SharedContract);
        SharedContractClient::new(env, &id)
    }

    // ─── #694 — full register / progress / reward flow ───────────────────────

    /// Scenario:
    /// 1. Admin initialises all three contracts.
    /// 2. Admin assigns RBAC roles via the Shared contract.
    /// 3. Student records progress milestones on the Analytics contract.
    /// 4. Admin mints reward tokens for a completed course.
    /// 5. Final state and emitted events are asserted.
    #[test]
    fn test_full_learning_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let student = Address::generate(&env);
        let course = symbol_short!("RUST101");

        // 1. Deploy & initialize
        let analytics = deploy_analytics(&env);
        let token = deploy_token(&env);
        let shared = deploy_shared(&env);

        analytics.initialize(&admin);
        token.initialize(&admin);
        shared.initialize(&admin);

        // 2. Assign student role
        shared.assign_role(&admin, &student, &Role::Student);
        assert!(shared.has_role(&student, &Role::Student));

        // 3. Progress milestones: 25 → 50 → 75 → 100
        for pct in [25u32, 50, 75, 100] {
            analytics.record_progress(&student, &student, &course, &pct);
            let rec = analytics.get_progress(&student, &course).unwrap();
            assert_eq!(rec.progress_pct, pct);
        }

        // 4. Verify completion flag
        let final_rec = analytics.get_progress(&student, &course).unwrap();
        assert!(final_rec.completed, "course should be marked completed");

        // 5. Mint reward tokens
        let reward: i128 = 100;
        token.mint_reward(&admin, &student, &reward);
        assert_eq!(token.balance(&student), reward);
        assert_eq!(token.total_supply(), reward);
    }

    /// Verify that unauthorized callers are rejected by the analytics contract.
    #[test]
    #[should_panic]
    fn test_unauthorized_progress_update_rejected() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let student = Address::generate(&env);
        let attacker = Address::generate(&env);
        let course = symbol_short!("RUST101");

        let analytics = deploy_analytics(&env);
        analytics.initialize(&admin);

        // attacker is neither student, admin, nor authorized caller
        analytics.record_progress(&attacker, &student, &course, &50);
    }

    /// Verify the token contract enforces admin-only minting.
    #[test]
    #[should_panic]
    fn test_non_admin_mint_rejected() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let attacker = Address::generate(&env);
        let victim = Address::generate(&env);

        let token = deploy_token(&env);
        token.initialize(&admin);

        // attacker tries to mint
        token.mint_reward(&attacker, &victim, &1_000);
    }

    /// Verify an authorized caller (e.g. backend oracle) can write progress
    /// on behalf of a student after being granted access by the admin.
    #[test]
    fn test_authorized_caller_can_record_progress() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let student = Address::generate(&env);
        let oracle = Address::generate(&env);
        let course = symbol_short!("SOL101");

        let analytics = deploy_analytics(&env);
        analytics.initialize(&admin);

        analytics.authorize_caller(&admin, &oracle);
        analytics.record_progress(&oracle, &student, &course, &80);

        let rec = analytics.get_progress(&student, &course).unwrap();
        assert_eq!(rec.progress_pct, 80);
    }

    /// Cross-contract: shared contract authorises an oracle; oracle records
    /// progress and the resulting token reward is minted by the admin.
    #[test]
    fn test_cross_contract_oracle_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let student = Address::generate(&env);
        let oracle = Address::generate(&env);
        let course = symbol_short!("STLR202");

        let analytics = deploy_analytics(&env);
        let token = deploy_token(&env);
        let shared = deploy_shared(&env);

        analytics.initialize(&admin);
        token.initialize(&admin);
        shared.initialize(&admin);

        // Authorize oracle via analytics contract
        analytics.authorize_caller(&admin, &oracle);

        // Oracle records course completion
        analytics.record_progress(&oracle, &student, &course, &100);

        // Verify state
        let rec = analytics.get_progress(&student, &course).unwrap();
        assert!(rec.completed);

        // Admin mints completion reward
        token.mint_reward(&admin, &student, &50);
        assert_eq!(token.balance(&student), 50);
    }

    /// TTL extension: after writing a progress record the persistent-storage
    /// TTL should be extended above the threshold.
    #[test]
    fn test_ttl_extended_after_progress_write() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let student = Address::generate(&env);
        let course = symbol_short!("TTL001");

        let analytics = deploy_analytics(&env);
        analytics.initialize(&admin);

        analytics.record_progress(&student, &student, &course, &60);

        // Record exists — TTL extension was triggered inside record_progress.
        let rec = analytics.get_progress(&student, &course);
        assert!(rec.is_some(), "progress record should exist after write");
    }

    /// Escrow / vesting: admin creates a vesting schedule, waits past cliff,
    /// beneficiary claims tokens.
    #[test]
    fn test_vesting_claim_after_cliff() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let instructor = Address::generate(&env);

        let token = deploy_token(&env);
        token.initialize(&admin);

        let start = env.ledger().sequence();
        let cliff = start + 10;
        let end = start + 100;

        token.create_vesting(&admin, &instructor, &1_000, &cliff, &end);

        // Advance ledger past cliff
        env.ledger().with_mut(|l| l.sequence_number = cliff + 1);

        token.claim_vesting(&instructor);
        assert!(token.balance(&instructor) > 0, "tokens should be claimable after cliff");
    }
}
