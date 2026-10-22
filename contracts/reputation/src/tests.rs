#[cfg(test)]
mod tests {
    use crate::{ReputationContract, ReputationContractClient};
    use soroban_sdk::{symbol_short, testutils::Address as _, testutils::Ledger, Address, Env};

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

    // ── #1033: Edge-case coverage for reputation scoring ──────────────────────

    // ── Zero history ─────────────────────────────────────────────────────────

    #[test]
    fn test_get_reputation_history_returns_empty_for_new_user() {
        let (env, client, _) = setup();
        let user = Address::generate(&env);
        let history = client.get_reputation_history(&user, &0, &10);
        assert_eq!(history.len(), 0);
    }

    #[test]
    fn test_get_reputation_record_returns_none_for_new_user() {
        let (env, client, _) = setup();
        let user = Address::generate(&env);
        assert!(client.get_reputation_record(&user).is_none());
    }

    // ── Zero score ───────────────────────────────────────────────────────────

    #[test]
    fn test_zero_score_returns_level_one() {
        let (env, client, _) = setup();
        let user = Address::generate(&env);
        // Level threshold [0, 100, ...] means score 0 → level 1
        assert_eq!(client.get_reputation_level(&user), 1);
    }

    #[test]
    fn test_total_reputation_starts_at_zero() {
        let (_, client, _) = setup();
        assert_eq!(client.get_total_reputation(), 0);
    }

    // ── Level threshold boundaries ───────────────────────────────────────────

    // LEVEL_THRESHOLDS = [0, 100, 400, 900, 1600]
    // Level 1: score < 100
    // Level 2: 100 <= score < 400
    // Level 3: 400 <= score < 900
    // Level 4: 900 <= score < 1600
    // Level 5: score >= 1600

    #[test]
    fn test_level_1_boundary_just_below_100() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &99, &symbol_short!("course"), &None);
        assert_eq!(client.get_reputation_level(&user), 1);
    }

    #[test]
    fn test_level_2_boundary_exactly_100() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        // score = 100
        client.update_reputation(&admin, &user, &100, &symbol_short!("course"), &None);
        assert_eq!(client.get_reputation_level(&user), 2);
    }

    #[test]
    fn test_level_2_boundary_just_below_400() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &399, &symbol_short!("course"), &None);
        assert_eq!(client.get_reputation_level(&user), 2);
    }

    #[test]
    fn test_level_3_boundary_exactly_400() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &400, &symbol_short!("course"), &None);
        assert_eq!(client.get_reputation_level(&user), 3);
    }

    #[test]
    fn test_level_3_boundary_just_below_900() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &899, &symbol_short!("course"), &None);
        assert_eq!(client.get_reputation_level(&user), 3);
    }

    #[test]
    fn test_level_4_boundary_exactly_900() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &900, &symbol_short!("course"), &None);
        assert_eq!(client.get_reputation_level(&user), 4);
    }

    #[test]
    fn test_level_4_boundary_just_below_1600() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &1599, &symbol_short!("course"), &None);
        assert_eq!(client.get_reputation_level(&user), 4);
    }

    #[test]
    fn test_level_5_boundary_exactly_1600() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &1600, &symbol_short!("course"), &None);
        assert_eq!(client.get_reputation_level(&user), 5);
    }

    #[test]
    fn test_level_5_boundary_above_1600() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &10_000, &symbol_short!("course"), &None);
        assert_eq!(client.get_reputation_level(&user), 5);
    }

    // ── Single contribution ──────────────────────────────────────────────────

    #[test]
    fn test_single_small_update() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &1, &symbol_short!("course"), &None);
        assert_eq!(client.get_reputation(&user), 1);
        assert_eq!(client.get_reputation_level(&user), 1);
    }

    #[test]
    fn test_single_large_update() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &5000, &symbol_short!("course"), &None);
        assert_eq!(client.get_reputation(&user), 5000);
        assert_eq!(client.get_reputation_level(&user), 5);
    }

    // ── Score accumulation and decay interaction ─────────────────────────────

    #[test]
    fn test_score_accumulation_preserves_level_progression() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        let reason = symbol_short!("course");

        // Start at level 1
        client.update_reputation(&admin, &user, &50, &reason, &None);
        assert_eq!(client.get_reputation_level(&user), 1);

        // Push to level 2
        client.update_reputation(&admin, &user, &60, &reason, &None);
        assert_eq!(client.get_reputation_level(&user), 2); // 110 >= 100

        // Push to level 3
        client.update_reputation(&admin, &user, &300, &reason, &None);
        assert_eq!(client.get_reputation_level(&user), 3); // 410 >= 400

        // Push to level 4
        client.update_reputation(&admin, &user, &500, &reason, &None);
        assert_eq!(client.get_reputation_level(&user), 4); // 910 >= 900

        // Push to level 5
        client.update_reputation(&admin, &user, &700, &reason, &None);
        assert_eq!(client.get_reputation_level(&user), 5); // 1610 >= 1600
    }

    // ── Decay edge cases ─────────────────────────────────────────────────────

    #[test]
    fn test_decay_disabled_no_change() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);

        // Disable decay
        client.set_decay_config(&admin, &false, &0, &1000);

        client.update_reputation(&admin, &user, &100, &symbol_short!("course"), &None);

        // Advance ledger by a moderate amount — score should remain unchanged
        // because decay is disabled
        env.ledger().with_mut(|l| l.sequence_number += 500);

        assert_eq!(client.get_reputation(&user), 100);
    }

    #[test]
    fn test_decay_before_interval_no_change() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);

        // Default config: enabled=true, decay_rate=-1, decay_interval=1000
        client.update_reputation(&admin, &user, &100, &symbol_short!("course"), &None);

        // Advance ledger by less than one interval
        env.ledger().with_mut(|l| l.sequence_number += 500);

        // Score should remain 100 — decay hasn't triggered
        assert_eq!(client.get_reputation(&user), 100);
    }

    #[test]
    fn test_decay_at_exactly_one_interval() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);

        // Default: decay_rate=-1, decay_interval=1000
        client.update_reputation(&admin, &user, &100, &symbol_short!("course"), &None);

        // Advance by exactly one interval
        env.ledger().with_mut(|l| l.sequence_number += 1000);

        // 1 period * -1 decay = -1 → score = 100 + (-1) = 99
        assert_eq!(client.get_reputation(&user), 99);
    }

    #[test]
    fn test_decay_clamps_to_zero() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);

        // Set aggressive decay
        client.set_decay_config(&admin, &true, &-100, &1);

        client.update_reputation(&admin, &user, &50, &symbol_short!("course"), &None);

        // Advance enough for decay to exceed score (2 periods * -100 = -200)
        env.ledger().with_mut(|l| l.sequence_number += 2);

        // score = 50 + (-200) = -150 → clamped to 0
        assert_eq!(client.get_reputation(&user), 0);
    }

    #[test]
    fn test_decay_multiple_periods() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);

        // Default: decay_rate=-1, decay_interval=1000
        client.update_reputation(&admin, &user, &1000, &symbol_short!("course"), &None);

        // Advance by 3 intervals (3000 ledgers)
        env.ledger().with_mut(|l| l.sequence_number += 3000);

        // 3 periods * -1 decay = -3 → score = 1000 + (-3) = 997
        assert_eq!(client.get_reputation(&user), 997);
    }

    #[test]
    fn test_decay_configurable_rate() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);

        // Set custom decay: rate=-10, interval=100
        client.set_decay_config(&admin, &true, &-10, &100);

        client.update_reputation(&admin, &user, &500, &symbol_short!("course"), &None);

        // Advance by 2 intervals (200 ledgers)
        env.ledger().with_mut(|l| l.sequence_number += 200);

        // 2 periods * -10 decay = -20 → score = 500 + (-20) = 480
        assert_eq!(client.get_reputation(&user), 480);
    }

    // ── Negative score changes ───────────────────────────────────────────────

    #[test]
    fn test_negative_update_reduces_score() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &200, &symbol_short!("course"), &None);
        client.update_reputation(&admin, &user, &-50, &symbol_short!("penalty"), &None);
        assert_eq!(client.get_reputation(&user), 150);
    }

    #[test]
    fn test_negative_update_clamped_at_zero() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &50, &symbol_short!("course"), &None);
        client.update_reputation(&admin, &user, &-200, &symbol_short!("penalty"), &None);
        assert_eq!(client.get_reputation(&user), 0);
    }

    // ── Leaderboard edge cases ───────────────────────────────────────────────

    #[test]
    fn test_leaderboard_empty() {
        let (_, client, _) = setup();
        let leaderboard = client.get_leaderboard(&10);
        assert_eq!(leaderboard.len(), 0);
    }

    #[test]
    fn test_leaderboard_single_user() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &100, &symbol_short!("course"), &None);
        let leaderboard = client.get_leaderboard(&10);
        assert_eq!(leaderboard.len(), 1);
        assert_eq!(leaderboard.get(0).unwrap().score, 100);
    }

    #[test]
    fn test_leaderboard_sorted_descending() {
        let (env, client, admin) = setup();
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let user3 = Address::generate(&env);
        let reason = symbol_short!("course");

        client.update_reputation(&admin, &user1, &100, &reason, &None);
        client.update_reputation(&admin, &user2, &300, &reason, &None);
        client.update_reputation(&admin, &user3, &200, &reason, &None);

        let leaderboard = client.get_leaderboard(&10);
        assert_eq!(leaderboard.len(), 3);
        assert_eq!(leaderboard.get(0).unwrap().score, 300);
        assert_eq!(leaderboard.get(1).unwrap().score, 200);
        assert_eq!(leaderboard.get(2).unwrap().score, 100);
    }

    #[test]
    fn test_leaderboard_limit() {
        let (env, client, admin) = setup();
        let reason = symbol_short!("course");

        for i in 0..5 {
            let user = Address::generate(&env);
            client.update_reputation(&admin, &user, &(i * 100), &reason, &None);
        }

        let leaderboard = client.get_leaderboard(&3);
        assert_eq!(leaderboard.len(), 3);
    }

    // ── History pagination edge cases ────────────────────────────────────────

    #[test]
    fn test_history_empty_range() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &100, &symbol_short!("course"), &None);
        let history = client.get_reputation_history(&user, &0, &0);
        assert_eq!(history.len(), 0);
    }

    #[test]
    fn test_history_beyond_available() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &100, &symbol_short!("course"), &None);
        client.update_reputation(&admin, &user, &50, &symbol_short!("course"), &None);
        // Request start=100, limit=10 — should return empty
        let history = client.get_reputation_history(&user, &100, &10);
        assert_eq!(history.len(), 0);
    }

    #[test]
    fn test_history_partial_overlap() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &100, &symbol_short!("course"), &None);
        client.update_reputation(&admin, &user, &200, &symbol_short!("course"), &None);
        client.update_reputation(&admin, &user, &300, &symbol_short!("course"), &None);
        // Request start=2, limit=10 — only the third entry
        let history = client.get_reputation_history(&user, &2, &10);
        assert_eq!(history.len(), 1);
    }

    // ── Verify threshold at exact boundaries ─────────────────────────────────

    #[test]
    fn test_verify_threshold_at_exact_score() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &100, &symbol_short!("course"), &None);
        assert!(client.verify_reputation_threshold(&user, &100));
    }

    #[test]
    fn test_verify_threshold_just_below() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &99, &symbol_short!("course"), &None);
        assert!(!client.verify_reputation_threshold(&user, &100));
    }

    #[test]
    fn test_verify_level_at_exact_boundary() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        // Level 2 requires score >= 100
        client.update_reputation(&admin, &user, &100, &symbol_short!("course"), &None);
        assert!(client.verify_reputation_level(&user, &2));
    }

    #[test]
    fn test_verify_level_just_below_boundary() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &99, &symbol_short!("course"), &None);
        assert!(!client.verify_reputation_level(&user, &2));
    }

    // ── Multiple users isolation ─────────────────────────────────────────────

    #[test]
    fn test_reputation_isolated_between_users() {
        let (env, client, admin) = setup();
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        client.update_reputation(&admin, &user1, &500, &symbol_short!("course"), &None);
        client.update_reputation(&admin, &user2, &200, &symbol_short!("course"), &None);

        assert_eq!(client.get_reputation(&user1), 500);
        assert_eq!(client.get_reputation(&user2), 200);
        assert_eq!(client.get_reputation_level(&user1), 3);
        assert_eq!(client.get_reputation_level(&user2), 2);
    }

    // ── Get decay config defaults ────────────────────────────────────────────

    #[test]
    fn test_get_decay_config_after_init() {
        let (_, client, _) = setup();
        let config = client.get_decay_config();
        assert!(config.enabled);
        assert_eq!(config.decay_rate, -1);
        assert_eq!(config.decay_interval, 1000);
    }

    #[test]
    fn test_set_decay_config_persists() {
        let (_env, client, admin) = setup();
        client.set_decay_config(&admin, &false, &-5, &500);
        let config = client.get_decay_config();
        assert!(!config.enabled);
        assert_eq!(config.decay_rate, -5);
        assert_eq!(config.decay_interval, 500);
    }

    // ── Total reputation tracking ────────────────────────────────────────────

    #[test]
    fn test_total_reputation_decreases_with_negative_updates() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &100, &symbol_short!("course"), &None);
        assert_eq!(client.get_total_reputation(), 100);

        client.update_reputation(&admin, &user, &-30, &symbol_short!("penalty"), &None);
        // total = 100 + (-30) = 70
        assert_eq!(client.get_total_reputation(), 70);
    }

    #[test]
    fn test_total_reputation_clamped_at_zero() {
        let (env, client, admin) = setup();
        let user = Address::generate(&env);
        client.update_reputation(&admin, &user, &100, &symbol_short!("course"), &None);
        client.update_reputation(&admin, &user, &-500, &symbol_short!("penalty"), &None);
        // Score clamped to 0, but total_reputation = 100 + (-500) = -400
        // (total is NOT clamped, only individual scores are)
        assert_eq!(client.get_reputation(&user), 0);
        assert_eq!(client.get_total_reputation(), -400);
    }

    // ── Property-based tests using proptest ──────────────────────────────────

    mod properties {
        use super::*;
        use proptest::prelude::*;

        // ── Monotonicity invariants ──────────────────────────────────────

        /// Invariant: Positive reputation updates never decrease score
        proptest! {
            #[test]
            fn prop_positive_update_increases_score(score_change in 1i128..10000i128) {
                let (env, client, admin) = setup();
                let user = Address::generate(&env);

                // Start with zero
                let initial = client.get_reputation(&user);
                assert_eq!(initial, 0);

                // Apply positive update
                client.update_reputation(&admin, &user, &score_change, &symbol_short!("test"), &None);
                let after = client.get_reputation(&user);

                // Verify monotonicity
                prop_assert!(after >= initial);
                prop_assert_eq!(after, initial + score_change);
            }
        }

        /// Invariant: Negative updates never increase score (except via clamping to 0)
        proptest! {
            #[test]
            fn prop_negative_update_decreases_score(
                initial_score in 100i128..10000i128,
                decrease in 1i128..200i128
            ) {
                let (env, client, admin) = setup();
                let user = Address::generate(&env);

                // Set up initial score
                client.update_reputation(&admin, &user, &initial_score, &symbol_short!("setup"), &None);
                let before = client.get_reputation(&user);

                // Apply negative update
                client.update_reputation(&admin, &user, &(-decrease), &symbol_short!("test"), &None);
                let after = client.get_reputation(&user);

                // Verify monotonicity: score should not increase
                prop_assert!(after <= before);
            }
        }

        /// Invariant: Score accumulation is commutative (order-independent for additions)
        proptest! {
            #[test]
            fn prop_accumulation_commutative(
                update1 in 1i128..5000i128,
                update2 in 1i128..5000i128
            ) {
                let (env, client, admin) = setup();

                // Path 1: update1 then update2
                let user1 = Address::generate(&env);
                client.update_reputation(&admin, &user1, &update1, &symbol_short!("a"), &None);
                client.update_reputation(&admin, &user1, &update2, &symbol_short!("b"), &None);
                let result1 = client.get_reputation(&user1);

                // Path 2: update2 then update1
                let user2 = Address::generate(&env);
                client.update_reputation(&admin, &user2, &update2, &symbol_short!("b"), &None);
                client.update_reputation(&admin, &user2, &update1, &symbol_short!("a"), &None);
                let result2 = client.get_reputation(&user2);

                // Both should yield the same score
                prop_assert_eq!(result1, result2);
                prop_assert_eq!(result1, update1 + update2);
            }
        }

        /// Invariant: Slashing never increases score
        proptest! {
            #[test]
            fn prop_slash_never_increases(
                initial_score in 100i128..5000i128,
                slash_amount in 1i128..500i128
            ) {
                let (env, client, admin) = setup();
                let user = Address::generate(&env);

                client.update_reputation(&admin, &user, &initial_score, &symbol_short!("setup"), &None);
                let before = client.get_reputation(&user);

                client.slash(&admin, &user, &slash_amount, &symbol_short!("test"));
                let after = client.get_reputation(&user);

                prop_assert!(after <= before);
            }
        }

        // ── Bounds invariants ────────────────────────────────────────────

        /// Invariant: Score is always >= 0 (clamped lower bound)
        proptest! {
            #[test]
            fn prop_score_never_negative(score_change in -10000i128..10000i128) {
                let (env, client, admin) = setup();
                let user = Address::generate(&env);

                client.update_reputation(&admin, &user, &score_change, &symbol_short!("test"), &None);
                let score = client.get_reputation(&user);

                prop_assert!(score >= 0);
            }
        }

        /// Invariant: Level is always in [1, 5] (valid range based on thresholds)
        proptest! {
            #[test]
            fn prop_level_in_valid_range(score_change in -10000i128..100000i128) {
                let (env, client, admin) = setup();
                let user = Address::generate(&env);

                client.update_reputation(&admin, &user, &score_change, &symbol_short!("test"), &None);
                let level = client.get_reputation_level(&user);

                prop_assert!(level >= 1);
                prop_assert!(level <= 5);
            }
        }

        /// Invariant: Level is monotonically non-decreasing with score
        proptest! {
            #[test]
            fn prop_level_monotonic(
                initial_score in 0i128..1000i128,
                increase in 1i128..5000i128
            ) {
                let (env, client, admin) = setup();
                let user = Address::generate(&env);

                client.update_reputation(&admin, &user, &initial_score, &symbol_short!("setup"), &None);
                let level1 = client.get_reputation_level(&user);

                client.update_reputation(&admin, &user, &increase, &symbol_short!("more"), &None);
                let level2 = client.get_reputation_level(&user);

                prop_assert!(level2 >= level1);
            }
        }

        /// Invariant: Threshold boundaries are correct
        proptest! {
            #[test]
            fn prop_threshold_boundaries_exact(threshold in [100i128, 400, 900, 1600].iter().copied()) {
                let (env, client, admin) = setup();

                // Just below threshold → level is one lower
                let user_below = Address::generate(&env);
                client.update_reputation(&admin, &user_below, &(threshold - 1), &symbol_short!("test"), &None);
                let level_below = client.get_reputation_level(&user_below);

                // At threshold → level is one higher
                let user_at = Address::generate(&env);
                client.update_reputation(&admin, &user_at, &threshold, &symbol_short!("test"), &None);
                let level_at = client.get_reputation_level(&user_at);

                prop_assert_eq!(level_at, level_below + 1);
            }
        }

        /// Invariant: Slash clamped at zero (never goes negative)
        proptest! {
            #[test]
            fn prop_slash_clamped_at_zero(
                initial_score in 1i128..1000i128,
                slash_amount in 1i128..100000i128
            ) {
                let (env, client, admin) = setup();
                let user = Address::generate(&env);

                client.update_reputation(&admin, &user, &initial_score, &symbol_short!("setup"), &None);
                client.slash(&admin, &user, &slash_amount, &symbol_short!("test"));
                let final_score = client.get_reputation(&user);

                prop_assert!(final_score >= 0);
                if slash_amount >= initial_score {
                    prop_assert_eq!(final_score, 0);
                } else {
                    prop_assert_eq!(final_score, initial_score - slash_amount);
                }
            }
        }

        /// Invariant: Negative update clamped at zero
        proptest! {
            #[test]
            fn prop_negative_update_clamped(
                initial_score in 1i128..1000i128,
                negative_change in -100000i128..=-1i128
            ) {
                let (env, client, admin) = setup();
                let user = Address::generate(&env);

                client.update_reputation(&admin, &user, &initial_score, &symbol_short!("setup"), &None);
                client.update_reputation(&admin, &user, &negative_change, &symbol_short!("test"), &None);
                let final_score = client.get_reputation(&user);

                prop_assert!(final_score >= 0);
                let expected = (initial_score + negative_change).max(0);
                prop_assert_eq!(final_score, expected);
            }
        }

        // ── Decay invariants ─────────────────────────────────────────────

        /// Invariant: Decay with enabled=false has no effect
        proptest! {
            #[test]
            fn prop_decay_disabled_no_change(score in 100i128..10000i128) {
                let (env, client, admin) = setup();
                let user = Address::generate(&env);

                // Disable decay
                client.set_decay_config(&admin, &false, &0, &1000);

                client.update_reputation(&admin, &user, &score, &symbol_short!("setup"), &None);
                let before = client.get_reputation(&user);

                // Advance ledger by multiple intervals
                env.ledger().with_mut(|l| l.sequence_number += 5000);

                let after = client.get_reputation(&user);

                prop_assert_eq!(after, before);
            }
        }

        /// Invariant: Decay before interval threshold has no effect
        proptest! {
            #[test]
            fn prop_decay_before_interval(score in 100i128..10000i128) {
                let (env, client, admin) = setup();
                let user = Address::generate(&env);

                // Default: interval=1000
                client.update_reputation(&admin, &user, &score, &symbol_short!("setup"), &None);
                let before = client.get_reputation(&user);

                // Advance by less than one interval
                env.ledger().with_mut(|l| l.sequence_number += 500);

                let after = client.get_reputation(&user);

                prop_assert_eq!(after, before);
            }
        }

        /// Invariant: Decay never increases score (decay_rate <= 0)
        proptest! {
            #[test]
            fn prop_decay_never_increases(
                score in 100i128..10000i128,
                decay_rate in -1000i128..=0i128,
                periods_elapsed in 1u32..=100
            ) {
                let (env, client, admin) = setup();
                let user = Address::generate(&env);

                // Set decay with rate <= 0
                client.set_decay_config(&admin, &true, &decay_rate, &1);

                client.update_reputation(&admin, &user, &score, &symbol_short!("setup"), &None);
                let before = client.get_reputation(&user);

                // Advance by multiple periods
                env.ledger().with_mut(|l| l.sequence_number += periods_elapsed);

                let after = client.get_reputation(&user);

                // With decay_rate <= 0, score should never increase
                prop_assert!(after <= before);
            }
        }

        // ── Authorization invariants ────────────────────────────────────

        /// Invariant: Only admin and authorized callers can update
        proptest! {
            #[test]
            fn prop_only_authorized_can_update(score_change in 1i128..1000i128) {
                let (env, client, admin) = setup();
                let user = Address::generate(&env);
                let unauthorized = Address::generate(&env);

                // Unauthorized caller should panic
                let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    client.update_reputation(&unauthorized, &user, &score_change, &symbol_short!("test"), &None);
                }));

                prop_assert!(result.is_err(), "unauthorized caller should have panicked");
            }
        }

        /// Invariant: Score never exceeds i128 max when accumulating
        proptest! {
            #[test]
            fn prop_no_overflow_on_accumulation(
                update1 in 1i128..i128::MAX / 3,
                update2 in 1i128..i128::MAX / 3,
                update3 in 1i128..i128::MAX / 3
            ) {
                let (env, client, admin) = setup();
                let user = Address::generate(&env);

                // Should not panic on overflow
                client.update_reputation(&admin, &user, &update1, &symbol_short!("a"), &None);
                client.update_reputation(&admin, &user, &update2, &symbol_short!("b"), &None);
                client.update_reputation(&admin, &user, &update3, &symbol_short!("c"), &None);

                let final_score = client.get_reputation(&user);
                prop_assert!(final_score >= 0);
                prop_assert_eq!(final_score, update1 + update2 + update3);
            }
        }
    }
}
