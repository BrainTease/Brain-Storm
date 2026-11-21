//! Storage keys, on-chain types and event topics for the `badges` contract.
//!
//! Split out of `lib.rs` (issue #1324) so the contract entry points live in a
//! single, readable file.

use soroban_sdk::{contracttype, symbol_short, Address, String, Symbol};

// =============================================================================
// Shared validation / constants
// =============================================================================
//
// These mirror the rules enforced by `contracts/shared` so that the badges
// contract can validate inputs without duplicating magic numbers. They are
// intentionally kept as local constants (rather than pulled in at runtime) to
// preserve the existing storage layout and avoid cross-contract calls.

/// Maximum length (in bytes) allowed for a badge type symbol.
pub const MAX_SYMBOL_LEN: u32 = 32;

/// Maximum length (in bytes) allowed for a badge description string.
pub const MAX_DESCRIPTION_LEN: u32 = 256;

/// Returns `true` if `value` respects the shared symbol length rule.
pub fn is_valid_symbol(value: &Symbol) -> bool {
    value.len() <= MAX_SYMBOL_LEN
}

/// Returns `true` if `value` respects the shared string length rule.
pub fn is_valid_description(value: &String) -> bool {
    value.len() <= MAX_DESCRIPTION_LEN
}

// =============================================================================
// Storage keys
// =============================================================================

#[contracttype]
pub enum DataKey {
    Admin,
    Badge(u64),                          // id → BadgeRecord
    OwnerBadges(Address),                // owner → Vec<u64>
    NextId,                              // u64 counter
    BadgeType(Symbol),                   // type → BadgeTypeRecord
}

// =============================================================================
// Types
// =============================================================================

#[contracttype]
#[derive(Clone)]
pub struct BadgeRecord {
    pub id: u64,
    pub owner: Address,
    pub badge_type: Symbol,
    pub minted_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct BadgeTypeRecord {
    pub name: Symbol,
    pub description: String,
    pub total_minted: u32,
}

// =============================================================================
// Events
// =============================================================================

pub const MINT: Symbol = symbol_short!("mint");
pub const BURN: Symbol = symbol_short!("burn");