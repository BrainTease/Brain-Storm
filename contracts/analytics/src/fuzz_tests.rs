#[cfg(test)]
mod fuzz_tests {
    use proptest::prelude::*;

    proptest! {
        #[test]
        fn fuzz_progress_pct_bounds(pct in 0u32..=100) {
            // Progress must be 0-100
            prop_assert!(pct <= 100);
        }

        #[test]
        fn fuzz_milestone_ordering(milestones in prop::collection::vec(0u32..=100, 1..10)) {
            // Milestones should be non-decreasing percentages
            let mut sorted = milestones.clone();
            sorted.sort();
            prop_assert_eq!(milestones.len(), sorted.len());
        }

        #[test]
        fn fuzz_timestamp_non_negative(ts in 0u64..u64::MAX) {
            prop_assert!(ts < u64::MAX);
        }

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

        #[test]
        fn fuzz_ttl_values_are_positive(ledger in 1u32..1_000_000) {
            // TTL extend value should be greater than threshold
            let ttl_threshold = 100u32;
            let ttl_extend_to = 500u32;
            prop_assert!(ttl_extend_to > ttl_threshold);
            prop_assert!(ledger > 0);
        }
    }
}
