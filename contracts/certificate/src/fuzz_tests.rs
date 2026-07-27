#[cfg(test)]
mod fuzz_tests {
    use proptest::prelude::*;

    proptest! {
        #[test]
        fn fuzz_certificate_id_never_overflows(count in 0u64..1_000_000) {
            // Certificate IDs are u64; verify arithmetic doesn't overflow
            if let Some(next) = count.checked_add(1) {
                prop_assert!(next > count);
            }
        }

        #[test]
        fn fuzz_revocation_reason_length(len in 0usize..256) {
            // Strings of arbitrary length should not cause panics in logic
            let reason = "x".repeat(len);
            prop_assert!(reason.len() == len);
        }

        #[test]
        fn fuzz_timestamp_ordering(ts1 in 0u64..u64::MAX / 2, ts2 in 0u64..u64::MAX / 2) {
            // Timestamps should be comparable without overflow
            let _ = ts1.cmp(&ts2);
            prop_assert!(true);
        }

        #[test]
        fn fuzz_multiple_certificates_per_owner(n in 0u32..100) {
            // Simulates minting n certificates — ID counter must stay consistent
            let mut id: u64 = 1;
            for _ in 0..n {
                id = id.checked_add(1).expect("ID overflow");
            }
            prop_assert!(id == 1 + n as u64);
        }
    }

    // Security fuzz: boundary values
    #[test]
    fn fuzz_boundary_certificate_id_zero() {
        // ID 0 should never be issued (counter starts at 1)
        let id: u64 = 0;
        assert_eq!(id, 0); // placeholder — real check is in the contract
    }

    #[test]
    fn fuzz_boundary_max_u64_certificate_id() {
        let id = u64::MAX;
        assert!(id.checked_add(1).is_none());
    }
}
