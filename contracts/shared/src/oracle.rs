/// Shared oracle utilities
pub mod oracle {
    use super::SharedError;

    pub struct Price {
        pub value: i128,
        pub timestamp: u64,
        pub source: String,
    }

    /// Validate oracle price freshness
    pub fn validate_freshness(
        timestamp: u64,
        current_time: u64,
        max_age: u64,
    ) -> Result<(), SharedError> {
        if current_time < timestamp {
            return Err(SharedError::InvalidInput);
        }
        if current_time - timestamp > max_age {
            return Err(SharedError::Timeout);
        }
        Ok(())
    }

    /// Validate oracle price is reasonable
    pub fn validate_price(price: i128, min_price: i128, max_price: i128) -> Result<(), SharedError> {
        if price < min_price || price > max_price {
            return Err(SharedError::InvalidInput);
        }
        Ok(())
    }
}
