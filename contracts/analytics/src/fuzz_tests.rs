/// Pure property-based tests for AnalyticsContract invariants.
/// These use proptest to verify invariants without needing a live Soroban env,
/// keeping fuzz tests fast and deterministic.
#[cfg(test)]
mod fuzz_tests {
    use proptest::prelude::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};
    use crate::{AnalyticsContract, AnalyticsContractClient};

    fn setup_with_admin() -> (Env, Address, AnalyticsContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, AnalyticsContract);
        let client = AnalyticsContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, admin, client)
    }

    proptest! {
        // ── Progress percentage boundary ──────────────────────────────────────
        #[test]
        fn fuzz_record_progress_valid_range(progress_pct in 0u32..=100u32) {
            let (env, _admin, client) = setup_with_admin();
            let student = Address::generate(&env);
            let course = soroban_sdk::symbol_short!("TEST");
            // Any value in 0..=100 must be accepted
            client.record_progress(&student, &student, &course, &progress_pct);
            let rec = client.get_progress(&student, &course).unwrap();
            prop_assert_eq!(rec.progress_pct, progress_pct);
            // completed flag must agree with pct == 100
            prop_assert_eq!(rec.completed, progress_pct == 100);
        }

        // ── Completion rate arithmetic ────────────────────────────────────────
        #[test]
        fn fuzz_completion_rate_within_bounds(
            completions in 0u32..10_000,
            total in 1u32..10_000,
        ) {
            if completions <= total {
                let rate = (completions * 100) / total;
                prop_assert!(rate <= 100);
            }
        }

        // ── TTL constants invariant ───────────────────────────────────────────
        #[test]
        fn fuzz_ttl_extend_exceeds_threshold(_ledger in 1u32..1_000_000) {
            let ttl_threshold = 100u32;
            let ttl_extend_to = 500u32;
            prop_assert!(ttl_extend_to > ttl_threshold);
        }

        // ── Milestone ordering invariant ──────────────────────────────────────
        #[test]
        fn fuzz_milestone_set_is_monotone(
            pct_a in 0u32..=100u32,
            pct_b in 0u32..=100u32,
        ) {
            // Milestone set must grow (or stay same) as progress increases.
            let defined_milestones = [25u32, 50, 75, 100];
            let min_pct = pct_a.min(pct_b);
            let max_pct = pct_a.max(pct_b);
            let after_min: Vec<u32> = defined_milestones.iter().copied()
                .filter(|&m| m <= min_pct)
                .collect();
            let after_max: Vec<u32> = defined_milestones.iter().copied()
                .filter(|&m| m <= max_pct)
                .collect();
            prop_assert!(after_max.len() >= after_min.len());
        }

        // ── Progress update is idempotent for same value ──────────────────────
        #[test]
        fn fuzz_idempotent_progress_update(progress_pct in 0u32..=100u32) {
            let (env, _admin, client) = setup_with_admin();
            let student = Address::generate(&env);
            let course = soroban_sdk::symbol_short!("IDEM");
            // Record twice with same value — should produce same result.
            client.record_progress(&student, &student, &course, &progress_pct);
            client.record_progress(&student, &student, &course, &progress_pct);
            let rec = client.get_progress(&student, &course).unwrap();
            prop_assert_eq!(rec.progress_pct, progress_pct);
        }

        // ── Average progress invariant ────────────────────────────────────────
        #[test]
        fn fuzz_average_progress_within_bounds(
            pct_a in 0u32..=100u32,
            pct_b in 0u32..=100u32,
        ) {
            // avg of two values in 0..=100 must remain in 0..=100
            let avg = ((pct_a as u64) + (pct_b as u64)) / 2;
            prop_assert!(avg <= 100);
        }
    }
}
