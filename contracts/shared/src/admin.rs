//! Admin role management utilities for Soroban contracts.
//!
//! This module provides a centralized way to manage admin authorization checks
//! across multiple contracts, eliminating duplicated code patterns like:
//!
//! ```ignore
//! let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
//! assert!(admin == stored_admin, "Only admin");
//! ```

use soroban_sdk::{Address, Env};

/// Storage key for admin role. Contracts should use this when storing the admin address.
/// Example: `DataKey::Admin` enum variant or similar.
pub struct AdminManager;

impl AdminManager {
    /// Verifies that the caller is the admin. Requires auth and equality check.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `caller` - The address claiming to be the admin (will require auth)
    /// * `stored_admin` - The stored admin address from contract storage
    ///
    /// # Panics
    /// If the caller is not authorized or not the stored admin
    pub fn require_admin(caller: &Address, stored_admin: &Address) {
        caller.require_auth();
        assert!(caller == stored_admin, "Only admin can perform this action");
    }

    /// Verifies that the caller is the admin without auth requirement.
    /// Used in contexts where auth is already handled separately.
    ///
    /// # Arguments
    /// * `caller` - The address to verify
    /// * `stored_admin` - The stored admin address from contract storage
    ///
    /// # Panics
    /// If the caller is not the stored admin
    pub fn verify_admin(caller: &Address, stored_admin: &Address) {
        assert!(
            caller == stored_admin,
            "Only admin can perform this action"
        );
    }

    /// Checks if an address is the admin.
    ///
    /// # Arguments
    /// * `address` - The address to check
    /// * `stored_admin` - The stored admin address from contract storage
    ///
    /// # Returns
    /// `true` if the address is the admin, `false` otherwise
    pub fn is_admin(address: &Address, stored_admin: &Address) -> bool {
        address == stored_admin
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as AddressTestUtils;
    use soroban_sdk::Env;

    #[test]
    fn test_require_admin_success() {
        let env = Env::default();
        env.mock_all_auths();
        
        let admin = Address::generate(&env);
        let caller = admin.clone();
        
        // Should not panic
        AdminManager::require_admin(&caller, &admin);
    }

    #[test]
    #[should_panic(expected = "Only admin")]
    fn test_require_admin_failure() {
        let env = Env::default();
        env.mock_all_auths();
        
        let admin = Address::generate(&env);
        let caller = Address::generate(&env);
        
        AdminManager::require_admin(&caller, &admin);
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
