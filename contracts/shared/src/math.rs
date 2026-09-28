/// Shared mathematical utilities
pub mod math {
    use super::super::constants::BASIS_POINTS_DENOMINATOR;
    use super::SharedError;

    /// Calculate percentage with basis points (bps)
    /// where 100 bps = 1%
    pub fn calculate_bps(amount: i128, bps: i128) -> Result<i128, SharedError> {
        if amount < 0 {
            return Err(SharedError::InvalidAmount);
        }
        if bps < 0 || bps > BASIS_POINTS_DENOMINATOR {
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
        value >= min && value <= max
    }

    /// Clamp a value between min and max
    pub fn clamp(value: i128, min: i128, max: i128) -> i128 {
        if value < min { min } else if value > max { max } else { value }
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
}

#[cfg(test)]
mod fuzz_tests {
    use super::math::*;
    use proptest::prelude::*;

    proptest! {
        #[test]
        fn calculate_bps_doesnt_overflow(amount in 0i128..i128::MAX, bps in 0i128..10000) {
            let _ = calculate_bps(amount, bps);
        }

        #[test]
        fn safe_add_doesnt_overflow(a in i128::MIN..i128::MAX, b in i128::MIN..i128::MAX) {
            let _ = safe_add(a, b);
        }

        #[test]
        fn safe_sub_doesnt_overflow(a in i128::MIN..i128::MAX, b in i128::MIN..i128::MAX) {
            let _ = safe_sub(a, b);
        }

        #[test]
        fn safe_mul_doesnt_overflow(a in i128::MIN..1000i128, b in i128::MIN..1000i128) {
            let _ = safe_mul(a, b);
        }
    }
}
