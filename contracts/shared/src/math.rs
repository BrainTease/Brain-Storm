//! Overflow-safe arithmetic helpers shared across contracts.
//!
//! Contract arithmetic must never silently wrap or rely on the build
//! profile's `overflow-checks` setting to catch bad math. These helpers
//! make the check explicit and produce a clear panic message instead of
//! an opaque VM trap.

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
}
