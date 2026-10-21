//! Registry types, storage keys and event topics.
//!
//! Split out of `lib.rs` (issue #1324) so the contract entry points live in a
//! single, readable file.

use soroban_sdk::{contracttype, symbol_short, Address, Symbol};

// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    Curator(Address),
    VerificationLevel(Address),   // persistent: VerificationLevel
    CertifiedSkills(Address),     // persistent: Vec<Symbol>
    Specialisation(Address),      // persistent: Vec<Symbol>
    SkillExpiry(Address, Symbol), // persistent: u64 timestamp (0 = never)
    UserList,                     // instance: Vec<Address> — ordered registration list
}

pub fn level_ord(level: &VerificationLevel) -> u32 {
    match level {
        VerificationLevel::Unverified => 0,
        VerificationLevel::Basic => 1,
        VerificationLevel::Advanced => 2,
        VerificationLevel::Expert => 3,
    }
}

// ── Types ─────────────────────────────────────────────────────────────────────

/// Numeric verification tier (0 = unverified … 3 = fully verified).
#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum VerificationLevel {
    Unverified,
    Basic,
    Advanced,
    Expert,
}

// ── Events ────────────────────────────────────────────────────────────────────
pub const EVT_VL_SET: Symbol = symbol_short!("vl_set");
pub const EVT_SKILL_ADD: Symbol = symbol_short!("sk_add");
pub const EVT_SKILL_RM: Symbol = symbol_short!("sk_rm");
pub const EVT_SPEC_SET: Symbol = symbol_short!("sp_set");
pub const EVT_CURATOR_ADD: Symbol = symbol_short!("cur_add");
