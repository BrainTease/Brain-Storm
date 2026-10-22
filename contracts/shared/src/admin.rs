//! Admin role management utilities for Soroban contracts.
//!
//! This module provides a centralized way to manage admin authorization checks
//! across multiple contracts, eliminating duplicated code patterns like:
//!
//! ```ignore
//! let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
//! assert!(admin == stored_admin, "Only admin");
//! ```
//!
//! # Invariants
//!
//! - **Admin Uniqueness**: Only one address holds the admin role at any given time.
//! - **Immutable Initialization**: The admin role is assigned at contract initialization and cannot be transferred.
//! - **Authorization Requirement**: All privileged operations require the admin to provide cryptographic proof via `require_auth()`.
//! - **Fail-Closed**: Mismatched admin addresses result in immediate panics to prevent unauthorized state changes.
//! - **No Silent Failures**: Missing admin slots produce clear error messages ("Only admin can perform this action").

use soroban_sdk::Address;

/// Storage key for admin role. Contracts should use this when storing the admin address.
/// Example: `DataKey::Admin` enum variant or similar.
pub struct AdminManager;

impl AdminManager {
    /// Verifies that the caller is the admin. Requires auth and equality check.
    ///
    /// # Invariants Enforced
    ///
    /// - **Authorization**: The caller must have authorized this invocation via `require_auth()`.
    /// - **Identity**: The caller's address must match the stored admin address exactly.
    /// - **Fail-Closed**: If either check fails, execution halts immediately with a panic.
    ///
    /// # Arguments
    /// * `caller` - The address claiming to be the admin (will require auth)
    /// * `stored_admin` - The stored admin address from contract storage
    ///
    /// # Panics
    /// With message `"Only admin can perform this action"` if the caller is not authorized or not the stored admin.
    ///
    /// # Example
    ///
    /// ```ignore
    /// // Inside a privileged contract function
    /// AdminManager::require_admin(&caller, &stored_admin);
    /// // If we reach here, caller is the authenticated admin
    /// state_changing_operation();
    /// ```
    pub fn require_admin(caller: &Address, stored_admin: &Address) {
        caller.require_auth();
        assert!(caller == stored_admin, "Only admin can perform this action");
    }

    /// Verifies that the caller is the admin without auth requirement.
    /// Used in contexts where auth is already handled separately.
    ///
    /// # Invariants Enforced
    ///
    /// - **Identity**: The caller's address must match the stored admin address exactly.
    /// - **No Auth**: This function does NOT call `require_auth()` — use only when auth
    ///   has been verified through another path.
    ///
    /// # Arguments
    /// * `caller` - The address to verify
    /// * `stored_admin` - The stored admin address from contract storage
    ///
    /// # Panics
    /// With message `"Only admin can perform this action"` if the caller is not the stored admin.
    ///
    /// # Example
    ///
    /// ```ignore
    /// // After auth is already checked elsewhere
    /// admin.require_auth();
    /// AdminManager::verify_admin(&admin, &stored_admin);
    /// ```
    pub fn verify_admin(caller: &Address, stored_admin: &Address) {
        assert!(caller == stored_admin, "Only admin can perform this action");
    }

    /// Checks if an address is the admin.
    ///
    /// # Invariants Enforced
    ///
    /// - **Pure Predicate**: This is a read-only check; it does not require auth or panic.
    /// - **Identity Comparison**: Uses direct equality; no fuzzy matching.
    ///
    /// # Arguments
    /// * `address` - The address to check
    /// * `stored_admin` - The stored admin address from contract storage
    ///
    /// # Returns
    /// `true` if the address is the admin, `false` otherwise.
    ///
    /// # Example
    ///
    /// ```ignore
    /// if AdminManager::is_admin(&caller, &stored_admin) {
    ///     // caller has admin privileges
    /// } else {
    ///     // caller is not admin; decide what to do
    /// }
    /// ```
    pub fn is_admin(address: &Address, stored_admin: &Address) -> bool {
        address == stored_admin
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as AddressTestUtils;
    use soroban_sdk::Env;

    use crate::SharedContract;

    fn contract_context(env: &Env) -> soroban_sdk::Address {
        env.register_contract(None, SharedContract)
    }

    #[test]
    fn test_require_admin_success() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let caller = admin.clone();

        // `require_auth` is only valid while a contract is executing.
        env.as_contract(&contract_context(&env), || {
            AdminManager::require_admin(&caller, &admin);
        });
    }

    #[test]
    #[should_panic(expected = "Only admin")]
    fn test_require_admin_failure() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let caller = Address::generate(&env);

        env.as_contract(&contract_context(&env), || {
            AdminManager::require_admin(&caller, &admin);
        });
    }

    #[test]
    fn test_verify_admin_success() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let caller = admin.clone();

        // Should not panic
        AdminManager::verify_admin(&caller, &admin);
    }

    #[test]
    #[should_panic(expected = "Only admin")]
    fn test_verify_admin_failure() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let caller = Address::generate(&env);

        AdminManager::verify_admin(&caller, &admin);
    }

    #[test]
    fn test_is_admin() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let caller = admin.clone();
        let other = Address::generate(&env);

        assert!(AdminManager::is_admin(&caller, &admin));
        assert!(!AdminManager::is_admin(&other, &admin));
    }
}
