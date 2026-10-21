//! Upgrade-target validation helpers (issue #1169).
//!
//! Split out of `lib.rs` (issue #1324).

use soroban_sdk::{Address, String};

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

