//! Storage keys, on-chain types and event topics for the `badges` contract.
//!
//! Split out of `lib.rs` (issue #1324) so the contract entry points live in a
//! single, readable file.

use soroban_sdk::{contracttype, symbol_short, Address, String, Symbol};

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
    BurnedBadge(u64),                    // id → bool (burned flag)
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
