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

pub fn checked_add_u32(a: u32, b: u32) -> u32 {
    a.checked_add(b).expect("math: u32 addition overflow")
}

pub fn checked_sub_u32(a: u32, b: u32) -> u32 {
    a.checked_sub(b).expect("math: u32 subtraction overflow")
}

#[cfg(test)]
mod test {
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
}
