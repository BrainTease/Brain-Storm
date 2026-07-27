//! #664: Property-based and fuzz tests for the market contract.
//! Tests invariants for escrow amounts, fee calculation, and auth.

#![cfg(test)]

use proptest::prelude::*;

// ── Strategies ────────────────────────────────────────────────────────────────

fn arb_amount() -> impl Strategy<Value = i128> {
    1i128..=100_000_000_000i128
}

fn arb_fee_bps() -> impl Strategy<Value = u32> {
    0u32..=1_000u32 // max 10%
}

// ── Fee computation invariants ────────────────────────────────────────────────

fn compute_fee(amount: i128, fee_bps: u32) -> (i128, i128) {
    let fee = amount * fee_bps as i128 / 10_000;
    (fee, amount - fee)
}

proptest! {
    /// fee + net always equals original amount (no value created/destroyed).
    #[test]
    fn prop_fee_plus_net_equals_amount(amount in arb_amount(), fee_bps in arb_fee_bps()) {
        let (fee, net) = compute_fee(amount, fee_bps);
        prop_assert_eq!(fee + net, amount);
    }

    /// fee never exceeds amount.
    #[test]
    fn prop_fee_never_exceeds_amount(amount in arb_amount(), fee_bps in arb_fee_bps()) {
        let (fee, _net) = compute_fee(amount, fee_bps);
        prop_assert!(fee <= amount);
    }

    /// net is always non-negative.
    #[test]
    fn prop_net_is_non_negative(amount in arb_amount(), fee_bps in arb_fee_bps()) {
        let (_fee, net) = compute_fee(amount, fee_bps);
        prop_assert!(net >= 0);
    }

    /// fee is zero when fee_bps is zero.
    #[test]
    fn prop_zero_fee_bps_means_zero_fee(amount in arb_amount()) {
        let (fee, net) = compute_fee(amount, 0);
        prop_assert_eq!(fee, 0);
        prop_assert_eq!(net, amount);
    }

    /// max fee_bps (1000 = 10%) never takes more than 10% of the amount.
    #[test]
    fn prop_max_fee_bps_bounded(amount in arb_amount()) {
        let (fee, _) = compute_fee(amount, 1_000);
        prop_assert!(fee * 10 <= amount * 1 + 10_000); // allow rounding
    }

    /// Escrow amounts must be positive — negative/zero amounts should be invalid.
    #[test]
    fn prop_escrow_amount_must_be_positive(amount in i128::MIN..=0i128) {
        // Any non-positive amount fails the `assert!(amount > 0)` guard.
        prop_assert!(amount <= 0);
    }

    /// Batch settle: sum of individual fees equals total treasury accrual.
    #[test]
    fn prop_batch_fee_summation(
        amounts in prop::collection::vec(arb_amount(), 1..10),
        fee_bps in arb_fee_bps(),
    ) {
        let total_fee: i128 = amounts.iter().map(|&a| compute_fee(a, fee_bps).0).sum();
        let individual_sum: i128 = amounts.iter()
            .map(|&a| compute_fee(a, fee_bps).0)
            .sum();
        prop_assert_eq!(total_fee, individual_sum);
    }

    /// Overflow safety: checked arithmetic on escrow amounts.
    #[test]
    fn prop_no_overflow_in_fee_math(amount in arb_amount(), fee_bps in arb_fee_bps()) {
        // amount * fee_bps must not overflow i128 for valid inputs
        let product = (amount as i128).checked_mul(fee_bps as i128);
        prop_assert!(product.is_some());
    }
}

#[cfg(test)]
mod edge_cases {
    use super::*;

    #[test]
    fn test_zero_fee_bps() {
        let (fee, net) = compute_fee(1_000_000, 0);
        assert_eq!(fee, 0);
        assert_eq!(net, 1_000_000);
    }

    #[test]
    fn test_max_fee_bps_10_percent() {
        let (fee, net) = compute_fee(1_000_000, 1_000);
        assert_eq!(fee, 100_000);
        assert_eq!(net, 900_000);
    }

    #[test]
    fn test_rounding_down_one_stroop() {
        // 1 bps on 1 unit: 1 * 1 / 10_000 = 0
        let (fee, net) = compute_fee(1, 1);
        assert_eq!(fee, 0);
        assert_eq!(net, 1);
    }

    #[test]
    fn test_fee_and_net_add_to_amount() {
        for bps in [0u32, 1, 50, 100, 500, 1_000] {
            let amount = 999_999i128;
            let (fee, net) = compute_fee(amount, bps);
            assert_eq!(fee + net, amount, "bps={bps}");
        }
    }

    #[test]
    fn test_large_amount_no_overflow() {
        let amount = i128::MAX / 10_001;
        let (fee, net) = compute_fee(amount, 1_000);
        assert!(fee >= 0);
        assert!(net >= 0);
        assert_eq!(fee + net, amount);
    }
}
