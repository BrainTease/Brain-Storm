//! Shared constants used across all contracts
//!
//! This module defines magic numbers extracted from contract code to improve
//! readability, auditability, and maintainability. All numeric constants should
//! be defined here and imported where needed.
//!
//! # Categories
//! - **Basis Points**: Calculations using basis points (1 bps = 0.01%)
//! - **Precision Scaling**: Fixed-point arithmetic scaling factors
//! - **Time Values**: Ledger-related timing constants (in ledgers, not seconds)
//! - **Error Codes**: Category codes for error types (not used here but documented)

// ============================================================================
// Basis Points Constants
// ============================================================================

/// Basis points denominator for percentage calculations.
///
/// 100 basis points = 1%
/// 10,000 basis points = 100%
///
/// # Usage
/// To calculate X% of amount: `(amount * bps) / BASIS_POINTS_DENOMINATOR`
pub const BASIS_POINTS_DENOMINATOR: i128 = 10_000;

/// Threshold for 1% (100 basis points)
pub const BASIS_POINTS_1_PERCENT: i128 = 100;

/// Threshold for 50% (5000 basis points)
pub const BASIS_POINTS_50_PERCENT: i128 = 5_000;

// ============================================================================
// Precision Scaling Constants
// ============================================================================

/// Precision scale for reward-per-token accounting (10^12).
///
/// Used in staking to avoid precision loss when dividing by total staked.
/// Stores accumulator values multiplied by this factor, then divides during
/// pending reward calculation.
///
/// # Example
/// ```ignore
/// let increment = rate
///     .checked_mul(EPOCH_LENGTH)
///     .checked_mul(PRECISION_SCALE_12)
///     .checked_div(total_staked);
/// ```
pub const PRECISION_SCALE_12: i128 = 1_000_000_000_000;

// ============================================================================
// Ledger Timing Constants
// ============================================================================

/// Default minimum TTL for temporary storage entries (in ledgers).
///
/// Used in ledger operation setup. Equivalent to ~5 seconds on Stellar testnet
/// (assuming ~20ms block time).
pub const MIN_TEMP_ENTRY_TTL: u32 = 1_000;

/// Default minimum TTL for persistent storage entries (in ledgers).
///
/// Used in ledger operation setup. Equivalent to ~20 seconds on Stellar testnet.
pub const MIN_PERSISTENT_ENTRY_TTL: u32 = 1_000;

/// Default maximum TTL for storage entries (in ledgers).
///
/// Used in ledger operation setup. Equivalent to ~27 minutes on Stellar testnet.
pub const MAX_ENTRY_TTL: u32 = 100_000;

// ============================================================================
// Error Code Categories
// ============================================================================

/// Error code category base for authorization errors.
///
/// Specific errors use codes: 1000 + offset
/// Examples: Unauthorized (1000), InvalidSignature (1001), InsufficientRole (1002)
pub const ERROR_CATEGORY_AUTHORIZATION: u32 = 1_000;

/// Error code category base for validation errors.
///
/// Specific errors use codes: 2000 + offset
/// Examples: InvalidInput (2000), InvalidAmount (2001), InvalidAddress (2002)
pub const ERROR_CATEGORY_VALIDATION: u32 = 2_000;

/// Error code category base for existence errors.
///
/// Specific errors use codes: 3000 + offset
/// Examples: NotFound (3000), AlreadyExists (3001), UnexpectedState (3002)
pub const ERROR_CATEGORY_EXISTENCE: u32 = 3_000;

/// Error code category base for balance errors.
///
/// Specific errors use codes: 4000 + offset
/// Examples: InsufficientBalance (4000), InsufficientFunds (4001)
pub const ERROR_CATEGORY_BALANCE: u32 = 4_000;

/// Error code category base for operation errors.
///
/// Specific errors use codes: 5000 + offset
/// Examples: OperationFailed (5000), Timeout (5001), ArithmeticOverflow (5004)
pub const ERROR_CATEGORY_OPERATION: u32 = 5_000;

/// Error code category base for permission errors.
///
/// Specific errors use codes: 6000 + offset
/// Examples: AccessDenied (6000), Locked (6001), Frozen (6002)
pub const ERROR_CATEGORY_PERMISSION: u32 = 6_000;

/// Error code category base for system errors.
///
/// Specific errors use codes: 9000 + offset
/// Examples: InternalError (9000), NotInitialized (9001)
pub const ERROR_CATEGORY_SYSTEM: u32 = 9_000;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basis_points_constants() {
        assert_eq!(BASIS_POINTS_DENOMINATOR, 10_000);
        assert_eq!(BASIS_POINTS_1_PERCENT, 100);
        assert_eq!(BASIS_POINTS_50_PERCENT, 5_000);
    }

    #[test]
    fn test_precision_scale_constants() {
        assert_eq!(PRECISION_SCALE_12, 1_000_000_000_000);
    }

    #[test]
    fn test_ledger_ttl_constants() {
        assert!(MIN_TEMP_ENTRY_TTL <= MAX_ENTRY_TTL);
        assert!(MIN_PERSISTENT_ENTRY_TTL <= MAX_ENTRY_TTL);
    }

    #[test]
    fn test_error_code_constants() {
        assert_eq!(ERROR_CATEGORY_AUTHORIZATION, 1_000);
        assert_eq!(ERROR_CATEGORY_VALIDATION, 2_000);
        assert_eq!(ERROR_CATEGORY_EXISTENCE, 3_000);
        assert_eq!(ERROR_CATEGORY_BALANCE, 4_000);
        assert_eq!(ERROR_CATEGORY_OPERATION, 5_000);
        assert_eq!(ERROR_CATEGORY_PERMISSION, 6_000);
        assert_eq!(ERROR_CATEGORY_SYSTEM, 9_000);
    }
}
