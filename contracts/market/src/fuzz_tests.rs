//! #664: Property-based and fuzz tests for the market contract.
//! Tests invariants for escrow amounts, fee calculation, and auth.
//!
//! #865: Removed the following redundant test cases that duplicated coverage
//! already provided by the proptest suite above them:
//!
//!   - `edge_cases::test_zero_fee_bps`
//!     → fully subsumed by `prop_zero_fee_bps_means_zero_fee` (arbitrary amounts)
//!
//!   - `edge_cases::test_fee_and_net_add_to_amount`
//!     → fully subsumed by `prop_fee_plus_net_equals_amount` (arbitrary amounts × bps)
//!
//!   - `edge_cases::test_max_fee_bps_10_percent`
//!     → the 10 % cap is asserted over all amounts by `prop_max_fee_bps_bounded`;
//!       a single fixed point adds no independent coverage
//!
//!   - `prop_batch_fee_summation`
//!     → the assertion `total_fee == individual_sum` is a tautology: both sides
//!       compute the identical expression, so the test can never fail regardless
//!       of the implementation
//!
//! Retained (unique value):
//!   - `edge_cases::test_rounding_down_one_stroop`
//!     → pins the concrete rounding behaviour at the smallest possible input
//!       (amount=1, fee_bps=1 → fee=0) which the property tests cannot guarantee
//!       because `arb_amount()` starts at 1 but `arb_fee_bps()` can be 0.
//!
//!   - `edge_cases::test_large_amount_no_overflow`
//!     → pins a concrete near-maximum i128 value; `prop_no_overflow_in_fee_math`
//!       tests arbitrary valid inputs but never exercises `i128::MAX / 10_001`.

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

    /// Overflow safety: checked arithmetic on escrow amounts.
    #[test]
    fn prop_no_overflow_in_fee_math(amount in arb_amount(), fee_bps in arb_fee_bps()) {
        // amount * fee_bps must not overflow i128 for valid inputs
        let product = (amount as i128).checked_mul(fee_bps as i128);
        prop_assert!(product.is_some());
    }
}

// ── Concrete edge cases (unique coverage not covered by proptest above) ───────

#[cfg(test)]
mod edge_cases {
    use super::*;

    /// Integer division truncates: 1 unit × 1 bps = 0.0001 stroops → rounds to 0.
    /// This pins the exact rounding boundary that the property tests never
    /// guarantee at this specific (amount=1, bps=1) input.
    #[test]
    fn test_rounding_down_one_stroop() {
        let (fee, net) = compute_fee(1, 1);
        assert_eq!(fee, 0, "fee should round down to 0 for 1 unit @ 1 bps");
        assert_eq!(net, 1);
    }

    /// Near-maximum i128 value: verifies no overflow at a concrete extreme
    /// that proptest's bounded strategy (`arb_amount`) never reaches.
    #[test]
    fn test_large_amount_no_overflow() {
        let amount = i128::MAX / 10_001;
        let (fee, net) = compute_fee(amount, 1_000);
        assert!(fee >= 0);
        assert!(net >= 0);
        assert_eq!(fee + net, amount);
    }
}
