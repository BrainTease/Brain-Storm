//! Governance configuration and upgrade-target validation helpers.
//!
//! Split out of `lib.rs` (issue #1324).

use soroban_sdk::{Address, String};

// =============================================================================
// Governance configuration validation
// =============================================================================

pub const DEFAULT_QUORUM_PERCENTAGE: i128 = 20;
pub const MIN_QUORUM_PERCENTAGE: i128 = 1;
pub const MAX_QUORUM_PERCENTAGE: i128 = 100;
pub const MAX_VOTING_PERIOD_LEDGERS: u32 = 100_000;

pub fn assert_valid_quorum_percentage(percentage: i128) {
    assert!(
        (MIN_QUORUM_PERCENTAGE..=MAX_QUORUM_PERCENTAGE).contains(&percentage),
        "Quorum must be 1-100"
    );
}

pub fn assert_valid_voting_period(current_ledger: u32, voting_end_ledger: u32) {
    assert!(
        voting_end_ledger > current_ledger,
        "Voting end must be in future"
    );
    assert!(
        voting_end_ledger - current_ledger <= MAX_VOTING_PERIOD_LEDGERS,
        "Voting period must be 1-100000 ledgers"
    );
}

// =============================================================================
// Upgrade target validation (issue #1169)
// =============================================================================

/// Strkey of the all-zero *contract* address (strkey version 2, `C…` prefix).
pub const ZERO_CONTRACT_ADDRESS: &str = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";

/// Strkey of the all-zero *account* address (strkey version 6, `G…` prefix).
pub const ZERO_ACCOUNT_ADDRESS: &str = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

/// Returns true when `addr` is one of the all-zero (unusable) addresses.
///
/// `soroban_sdk::Address` exposes no `is_zero()` on SDK 21, so the check
/// compares the canonical strkey produced by `Address::to_string()`.
pub fn is_zero_address(addr: &Address) -> bool {
    let strkey = addr.to_string();
    strkey == String::from_str(addr.env(), ZERO_CONTRACT_ADDRESS)
        || strkey == String::from_str(addr.env(), ZERO_ACCOUNT_ADDRESS)
}
