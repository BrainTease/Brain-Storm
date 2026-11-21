//! Token errors and on-chain value types.
//!
//! Split out of `lib.rs` (issue #1324).

use brain_storm_shared::errors::SharedError;
use soroban_sdk::{contracterror, contracttype, Address, String};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TokenError {
    /// Arithmetic overflow or underflow occurred — mirrors SharedError::ArithmeticOverflow
    ArithmeticError = 1,
    /// Insufficient balance for operation — mirrors SharedError::InsufficientBalance
    InsufficientBalance = 2,
    /// Unauthorized operation — mirrors SharedError::Unauthorized
    Unauthorized = 3,
    /// Invalid amount (zero or negative) — mirrors SharedError::InvalidAmount
    InvalidAmount = 4,
    /// Transfer amount exceeds balance — mirrors SharedError::InsufficientBalance
    TransferExceedsBalance = 5,
    /// Allowance insufficient
    InsufficientAllowance = 6,
}

impl From<SharedError> for TokenError {
    fn from(e: SharedError) -> Self {
        match e {
            SharedError::Unauthorized => TokenError::Unauthorized,
            SharedError::InvalidAmount => TokenError::InvalidAmount,
            SharedError::InsufficientBalance | SharedError::InsufficientFunds => {
                TokenError::InsufficientBalance
            }
            SharedError::ArithmeticOverflow => TokenError::ArithmeticError,
            _ => TokenError::ArithmeticError,
        }
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenState {
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
    pub total_supply: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Balance {
    pub amount: i128,
    pub last_updated: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Allowance {
    pub amount: i128,
    pub spender: Address,
}
