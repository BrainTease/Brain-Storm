//! Overflow-safe arithmetic helpers shared across contracts.
//!
//! Contract arithmetic must never silently wrap or rely on the build
//! profile's `overflow-checks` setting to catch bad math. These helpers
//! make the check explicit and produce a clear panic message instead of
//! an opaque VM trap.

use crate::constants::BASIS_POINTS_DENOMINATOR;
use crate::errors::SharedError;

// ---------------------------------------------------------------------------
// Checked helpers (panic with an explicit message on overflow / zero divisor)
// ---------------------------------------------------------------------------

pub fn checked_add_i128(a: i128, b: i128) -> i128 {
    a.checked_add(b).expect("math: i128 addition overflow")
}

pub fn checked_sub_i128(a: i128, b: i128) -> i128 {
    a.checked_sub(b).expect("math: i128 subtraction overflow")
}

pub fn checked_mul_i128(a: i128, b: i128) -> i128 {
    a.checked_mul(b).expect("math: i128 multiplication overflow")
}

/// Integer division that reports a zero divisor explicitly.
///
/// A bare `a / 0` traps in the VM with no indication of which computation
/// failed; this names it.
pub fn checked_div_i128(a: i128, b: i128) -> i128 {
    assert!(b != 0, "math: i128 division by zero");
    a.checked_div(b).expect("math: i128 division overflow")
}

/// Computes `(a * b) / denominator` — the proportional-share formula that
/// AMM and fee math is built from.
///
/// The intermediate product is a checked `i128`: if `a * b` exceeds `i128`
/// this panics rather than wrapping. It does *not* promote to a wider type,
/// so a mathematically-representable result can still be rejected when the
/// intermediate does not fit. That fails closed, which is the right default
/// for value-moving code.
pub fn checked_mul_div_i128(a: i128, b: i128, denominator: i128) -> i128 {
    checked_div_i128(checked_mul_i128(a, b), denominator)
}

pub fn checked_add_u32(a: u32, b: u32) -> u32 {
    a.checked_add(b).expect("math: u32 addition overflow")
}

pub fn checked_sub_u32(a: u32, b: u32) -> u32 {
    a.checked_sub(b).expect("math: u32 subtraction overflow")
}

// ---------------------------------------------------------------------------
// `Result`-returning helpers (for callers that prefer propagating SharedError)
// ---------------------------------------------------------------------------

/// Calculate percentage with basis points (bps)
/// where 100 bps = 1%
pub fn calculate_bps(amount: i128, bps: i128) -> Result<i128, SharedError> {
    if amount < 0 {
        return Err(SharedError::InvalidAmount);
    }
    if !( 0..=BASIS_POINTS_DENOMINATOR).contains(&bps) {
        return Err(SharedError::InvalidInput);
    }
    if bps == 0 {
        return Ok(0);
    }

    let result = amount
        .checked_mul(bps)
        .ok_or(SharedError::ArithmeticOverflow)?
        .checked_div(BASIS_POINTS_DENOMINATOR)
        .ok_or(SharedError::OperationFailed)?;

    Ok(result)
}

/// Check if a value is within bounds
pub fn is_within_bounds(value: i128, min: i128, max: i128) -> bool {
    (min..=max).contains(&value)
}

/// Clamp a value between min and max
pub fn clamp(value: i128, min: i128, max: i128) -> i128 {
    if value < min {
        min
    } else if value > max {
        max
    } else {
        value
    }
}

/// Safe addition with overflow check
pub fn safe_add(a: i128, b: i128) -> Result<i128, SharedError> {
    a.checked_add(b).ok_or(SharedError::ArithmeticOverflow)
}

/// Safe subtraction with overflow check
pub fn safe_sub(a: i128, b: i128) -> Result<i128, SharedError> {
    a.checked_sub(b).ok_or(SharedError::ArithmeticOverflow)
}

/// Safe multiplication with overflow check
pub fn safe_mul(a: i128, b: i128) -> Result<i128, SharedError> {
    a.checked_mul(b).ok_or(SharedError::ArithmeticOverflow)
}

/// Safe division with overflow check
pub fn safe_div(a: i128, b: i128) -> Result<i128, SharedError> {
    if b == 0 {
        return Err(SharedError::InvalidInput);
    }
    a.checked_div(b).ok_or(SharedError::OperationFailed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_i128_ok() {
        assert_eq!(checked_add_i128(1, 2), 3);
    }

    #[test]
    #[should_panic(expected = "math: i128 addition overflow")]
    fn add_i128_overflow() {
        checked_add_i128(i128::MAX, 1);
    }

    #[test]
    #[should_panic(expected = "math: i128 subtraction overflow")]
    fn sub_i128_overflow() {
        checked_sub_i128(i128::MIN, 1);
    }

    #[test]
    #[should_panic(expected = "math: u32 subtraction overflow")]
    fn sub_u32_underflow() {
        checked_sub_u32(0, 1);
    }

    #[test]
    #[should_panic(expected = "math: i128 division by zero")]
    fn div_i128_by_zero() {
        checked_div_i128(1, 0);
    }

    #[test]
    fn mul_div_i128_ok() {
        assert_eq!(checked_mul_div_i128(10, 3, 4), 7); // truncates toward zero
        assert_eq!(checked_mul_div_i128(0, 5, 7), 0);
    }

    #[test]
    #[should_panic(expected = "math: i128 division by zero")]
    fn mul_div_i128_zero_denominator() {
        checked_mul_div_i128(1, 1, 0);
    }

    #[test]
    #[should_panic(expected = "math: i128 multiplication overflow")]
    fn mul_div_i128_intermediate_overflow() {
        // The result would fit in i128, but the a*b intermediate does not.
        checked_mul_div_i128(i128::MAX, 2, 2);
    }

    #[test]
    fn calculate_bps_ok() {
        assert_eq!(calculate_bps(1_000, 500).unwrap(), 50);
        assert_eq!(calculate_bps(1_000, 0).unwrap(), 0);
    }

    #[test]
    fn calculate_bps_rejects_bad_input() {
        assert_eq!(calculate_bps(-1, 100), Err(SharedError::InvalidAmount));
        assert_eq!(
            calculate_bps(1_000, BASIS_POINTS_DENOMINATOR + 1),
            Err(SharedError::InvalidInput)
        );
    }

    #[test]
    fn bounds_and_clamp() {
        assert!(is_within_bounds(5, 0, 10));
        assert!(!is_within_bounds(15, 0, 10));
        assert_eq!(clamp(15, 0, 10), 10);
        assert_eq!(clamp(-5, 0, 10), 0);
        assert_eq!(clamp(5, 0, 10), 5);
    }

    #[test]
    fn safe_ops_ok_and_err() {
        assert_eq!(safe_add(1, 2).unwrap(), 3);
        assert_eq!(safe_sub(5, 3).unwrap(), 2);
        assert_eq!(safe_mul(3, 4).unwrap(), 12);
        assert_eq!(safe_div(10, 2).unwrap(), 5);
        assert_eq!(safe_div(1, 0), Err(SharedError::InvalidInput));
        assert_eq!(
            safe_mul(i128::MAX, 2),
            Err(SharedError::ArithmeticOverflow)
        );
    }

    // -----------------------------------------------------------------------
    // Property-based tests
    //
    // These exercise the shared arithmetic used by token and escrow math on
    // arbitrary inputs. The `Result`-returning helpers must never panic and
    // must agree with the corresponding `i128` checked operations; the
    // panicking helpers must only panic on genuine overflow (never on valid
    // inputs). Fee math must stay within bounds and conserve value.
    // -----------------------------------------------------------------------

    use proptest::prelude::*;

    proptest! {
        // -- safe_add / safe_sub / safe_mul agree with checked ops ----------

        #[test]
        fn prop_safe_add_matches_checked(a in any::<i128>(), b in any::<i128>()) {
            match a.checked_add(b) {
                Some(expected) => prop_assert_eq!(safe_add(a, b), Ok(expected)),
                None => prop_assert_eq!(safe_add(a, b), Err(SharedError::ArithmeticOverflow)),
            }
        }

        #[test]
        fn prop_safe_sub_matches_checked(a in any::<i128>(), b in any::<i128>()) {
            match a.checked_sub(b) {
                Some(expected) => prop_assert_eq!(safe_sub(a, b), Ok(expected)),
                None => prop_assert_eq!(safe_sub(a, b), Err(SharedError::ArithmeticOverflow)),
            }
        }

        #[test]
        fn prop_safe_mul_matches_checked(a in any::<i128>(), b in any::<i128>()) {
            match a.checked_mul(b) {
                Some(expected) => prop_assert_eq!(safe_mul(a, b), Ok(expected)),
                None => prop_assert_eq!(safe_mul(a, b), Err(SharedError::ArithmeticOverflow)),
            }
        }

        #[test]
        fn prop_safe_div_matches_checked(a in any::<i128>(), b in any::<i128>()) {
            if b == 0 {
                prop_assert_eq!(safe_div(a, b), Err(SharedError::InvalidInput));
            } else {
                // `checked_div` only fails on `i128::MIN / -1`.
                match a.checked_div(b) {
                    Some(expected) => prop_assert_eq!(safe_div(a, b), Ok(expected)),
                    None => prop_assert_eq!(safe_div(a, b), Err(SharedError::OperationFailed)),
                }
            }
        }

        // -- checked helpers never panic on non-overflowing inputs ----------

        #[test]
        fn prop_checked_add_no_panic(a in any::<i128>(), b in any::<i128>()) {
            if let Some(expected) = a.checked_add(b) {
                prop_assert_eq!(checked_add_i128(a, b), expected);
            }
        }

        #[test]
        fn prop_checked_sub_no_panic(a in any::<i128>(), b in any::<i128>()) {
            if let Some(expected) = a.checked_sub(b) {
                prop_assert_eq!(checked_sub_i128(a, b), expected);
            }
        }

        #[test]
        fn prop_checked_mul_no_panic(a in any::<i128>(), b in any::<i128>()) {
            if let Some(expected) = a.checked_mul(b) {
                prop_assert_eq!(checked_mul_i128(a, b), expected);
            }
        }

        #[test]
        fn prop_checked_div_no_panic(a in any::<i128>(), b in any::<i128>()) {
            if b != 0 {
                if let Some(expected) = a.checked_div(b) {
                    prop_assert_eq!(checked_div_i128(a, b), expected);
                }
            }
        }

        #[test]
        fn prop_checked_add_u32_no_panic(a in any::<u32>(), b in any::<u32>()) {
            if let Some(expected) = a.checked_add(b) {
                prop_assert_eq!(checked_add_u32(a, b), expected);
            }
        }

        #[test]
        fn prop_checked_sub_u32_no_panic(a in any::<u32>(), b in any::<u32>()) {
            if let Some(expected) = a.checked_sub(b) {
                prop_assert_eq!(checked_sub_u32(a, b), expected);
            }
        }

        // -- mul_div: no panic when the intermediate fits -------------------

        #[test]
        fn prop_mul_div_no_panic(
            a in any::<i128>(),
            b in any::<i128>(),
            d in any::<i128>(),
        ) {
            if d != 0 {
                if let Some(product) = a.checked_mul(b) {
                    if let Some(expected) = product.checked_div(d) {
                        prop_assert_eq!(checked_mul_div_i128(a, b, d), expected);
                    }
                }
            }
        }

        // -- calculate_bps: bounds, rounding, and conservation --------------

        #[test]
        fn prop_calculate_bps_bounds(amount in 0i128..=i128::MAX, bps in 0i128..=BASIS_POINTS_DENOMINATOR) {
            let fee = calculate_bps(amount, bps).expect("valid bps must not fail");
            // Fee is non-negative and never exceeds the amount.
            prop_assert!(fee >= 0);
            prop_assert!(fee <= amount);
            // Truncating division: fee * denominator <= amount * bps.
            let lhs = fee.checked_mul(BASIS_POINTS_DENOMINATOR);
            let rhs = amount.checked_mul(bps);
            if let (Some(lhs), Some(rhs)) = (lhs, rhs) {
                prop_assert!(lhs <= rhs);
            }
        }

        #[test]
        fn prop_calculate_bps_rounding_error_bounded(
            amount in 0i128..=i128::MAX,
            bps in 0i128..=BASIS_POINTS_DENOMINATOR,
        ) {
            let fee = calculate_bps(amount, bps).expect("valid bps must not fail");
            // The truncation error is strictly less than one unit of the
            // result, i.e. amount*bps - fee*denominator < denominator.
            if let (Some(product), Some(scaled)) = (
                amount.checked_mul(bps),
                fee.checked_mul(BASIS_POINTS_DENOMINATOR),
            ) {
                let remainder = product - scaled;
                prop_assert!(remainder >= 0);
                prop_assert!(remainder < BASIS_POINTS_DENOMINATOR);
            }
        }

        #[test]
        fn prop_calculate_bps_conserves_value(
            amount in 0i128..=i128::MAX,
            bps in 0i128..=BASIS_POINTS_DENOMINATOR,
        ) {
            // Splitting an amount into fee + remainder must conserve the total.
            let fee = calculate_bps(amount, bps).expect("valid bps must not fail");
            let remainder = amount - fee;
            prop_assert_eq!(fee + remainder, amount);
            prop_assert!(remainder >= 0);
        }

        #[test]
        fn prop_calculate_bps_rejects_out_of_range_bps(
            amount in 0i128..=i128::MAX,
            bps in (BASIS_POINTS_DENOMINATOR + 1)..=i128::MAX,
        ) {
            prop_assert_eq!(calculate_bps(amount, bps), Err(SharedError::InvalidInput));
        }

        #[test]
        fn prop_calculate_bps_rejects_negative_amount(
            amount in i128::MIN..0i128,
            bps in 0i128..=BASIS_POINTS_DENOMINATOR,
        ) {
            prop_assert_eq!(calculate_bps(amount, bps), Err(SharedError::InvalidAmount));
        }

        // -- clamp / bounds invariants --------------------------------------

        #[test]
        fn prop_clamp_within_bounds(value in any::<i128>(), a in any::<i128>(), b in any::<i128>()) {
            let (min, max) = if a <= b { (a, b) } else { (b, a) };
            let clamped = clamp(value, min, max);
            prop_assert!(is_within_bounds(clamped, min, max));
            prop_assert!(clamped >= min);
            prop_assert!(clamped <= max);
        }

        #[test]
        fn prop_clamp_idempotent(value in any::<i128>(), a in any::<i128>(), b in any::<i128>()) {
            let (min, max) = if a <= b { (a, b) } else { (b, a) };
            let once = clamp(value, min, max);
            prop_assert_eq!(clamp(once, min, max), once);
        }
    }
}
