/// Shared mathematical utilities
pub mod math {
    use super::SharedError;

    /// Calculate percentage with basis points (bps)
    /// where 100 bps = 1%
    pub fn calculate_bps(amount: i128, bps: i128) -> Result<i128, SharedError> {
        if amount < 0 {
            return Err(SharedError::InvalidAmount);
        }
        if bps < 0 || bps > 10_000 {
            return Err(SharedError::InvalidInput);
        }
        if bps == 0 {
            return Ok(0);
        }

        let result = amount
            .checked_mul(bps)
            .ok_or(SharedError::ArithmeticOverflow)?
            .checked_div(10_000)
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
