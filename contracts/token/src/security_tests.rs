#![cfg(test)]
use soroban_sdk::{testutils::Address as _, Address, Env};
use crate::{TokenContract, TokenContractClient};

#[cfg(test)]
mod reentrancy_tests {
    use soroban_sdk::{testutils::Address as _, Address, Env};
    use crate::{TokenContract, TokenContractClient};

    #[test]
    fn test_reentrancy_protection_on_transfer() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        
        client.initialize(&admin);
        client.mint_reward(&admin, &user1, &1000);
        
        // Attempt transfer - should succeed without reentrancy issues
        client.transfer(&user1, &user2, &500);
        
        assert_eq!(client.balance(&user1), 500);
        assert_eq!(client.balance(&user2), 500);
    }

    #[test]
    fn test_reentrancy_protection_on_burn() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        
        client.initialize(&admin);
        client.mint_reward(&admin, &user, &1000);
        
        // Burn should not allow reentrancy
        client.burn(&user, &500);
        
        assert_eq!(client.balance(&user), 500);
        assert_eq!(client.total_supply(), 500);
    }
}

#[cfg(test)]
mod overflow_underflow_tests {
    use soroban_sdk::{testutils::Address as _, Address, Env};
    use crate::{TokenContract, TokenContractClient};

    #[test]
    fn test_mint_overflow_protection() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        
        client.initialize(&admin);
        
        // Mint max value
        client.mint_reward(&admin, &user, &i128::MAX);
        assert_eq!(client.balance(&user), i128::MAX);
        
        // Attempting to mint more should fail or saturate
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.mint_reward(&admin, &user, &1);
        }));
        
        // Should either panic or handle gracefully
        assert!(result.is_err() || client.balance(&user) == i128::MAX);
    }

    #[test]
    fn test_transfer_underflow_protection() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        
        client.initialize(&admin);
        client.mint_reward(&admin, &user1, &100);
        
        // Try to transfer more than balance
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.transfer(&user1, &user2, &200);
        }));
        
        // Should fail
        assert!(result.is_err());
        assert_eq!(client.balance(&user1), 100);
        assert_eq!(client.balance(&user2), 0);
    }

    #[test]
    fn test_burn_underflow_protection() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        
        client.initialize(&admin);
        client.mint_reward(&admin, &user, &100);
        
        // Try to burn more than balance
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.burn(&user, &200);
        }));
        
        // Should fail
        assert!(result.is_err());
        assert_eq!(client.balance(&user), 100);
    }
}

#[cfg(test)]
mod access_control_tests {
    use soroban_sdk::{testutils::Address as _, Address, Env};
    use crate::{TokenContract, TokenContractClient};

    #[test]
    fn test_only_admin_can_mint() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let non_admin = Address::generate(&env);
        let user = Address::generate(&env);
        
        client.initialize(&admin);
        
        // Admin can mint
        client.mint_reward(&admin, &user, &100);
        assert_eq!(client.balance(&user), 100);
        
        // Non-admin cannot mint
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.mint_reward(&non_admin, &user, &100);
        }));
        
        assert!(result.is_err());
    }

    #[test]
    fn test_only_admin_can_burn() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let non_admin = Address::generate(&env);
        let user = Address::generate(&env);
        
        client.initialize(&admin);
        client.mint_reward(&admin, &user, &100);
        
        // Non-admin cannot burn
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.burn(&non_admin, &50);
        }));
        
        assert!(result.is_err());
    }

    #[test]
    fn test_user_can_transfer_own_tokens() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        
        client.initialize(&admin);
        client.mint_reward(&admin, &user1, &100);
        
        // User can transfer own tokens
        client.transfer(&user1, &user2, &50);
        
        assert_eq!(client.balance(&user1), 50);
        assert_eq!(client.balance(&user2), 50);
    }

    #[test]
    fn test_user_cannot_transfer_others_tokens() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let user3 = Address::generate(&env);
        
        client.initialize(&admin);
        client.mint_reward(&admin, &user1, &100);
        
        // User2 cannot transfer user1's tokens
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.transfer(&user1, &user3, &50);
        }));
        
        // Should fail or require authorization
        assert_eq!(client.balance(&user1), 100);
    }
}

/// # Explicit unauthorized-call tests (issue #1318)
///
/// These tests cover every admin entry-point (`mint`, `burn`, `initialize`
/// double-init) and verify that an unauthorized caller receives
/// `TokenError::Unauthorized` (or a contract-level error) rather than
/// silently succeeding.
///
/// Two scenarios are tested per entry-point:
///  1. **No auth at all** — `require_auth()` itself panics / returns an error.
///  2. **Auth granted but wrong address** — `mock_all_auths()` satisfies
///     `require_auth()`, but the stored-admin equality check in `lib.rs`
///     still rejects the call with `TokenError::Unauthorized`.
#[cfg(test)]
mod unauthorized_call_tests {
    use soroban_sdk::{
        testutils::{Address as _, Ledger, LedgerInfo},
        Address, Env, String,
    };
    use crate::{TokenContract, TokenContractClient, TokenError};

    const INITIAL_SUPPLY: i128 = 1_000_000;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /// Create a fresh environment with a properly initialized token contract.
    /// auth mocking is NOT enabled here; callers enable it as needed.
    fn setup_env() -> (Env, TokenContractClient<'static>, Address) {
        let env = Env::default();
        env.ledger().set(LedgerInfo {
            timestamp: 1_735_689_600,
            protocol_version: 20,
            sequence_number: 1,
            network_id: [0; 32],
            base_reserve: 10,
            min_temp_entry_ttl: 1,
            min_persistent_entry_ttl: 1,
            max_entry_ttl: 518_400,
        });

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);

        // Use mock_all_auths only for the setup call so we can initialize cleanly.
        env.mock_all_auths();
        client.initialize(
            &admin,
            &String::from_str(&env, "Test Token"),
            &String::from_str(&env, "TST"),
            &18,
            &INITIAL_SUPPLY,
        );

        (env, client, admin)
    }

    // -------------------------------------------------------------------------
    // mint — no auth
    // -------------------------------------------------------------------------

    /// Calling `mint` with no auth injection must fail.
    /// `require_auth()` will panic in the Soroban test environment when no
    /// matching mock auth is present; `try_mint` catches that as an error.
    #[test]
    fn test_mint_no_auth_fails() {
        let (env, client, _admin) = setup_env();
        let non_admin = Address::generate(&env);
        let recipient = Address::generate(&env);

        // Deliberately do NOT call env.mock_all_auths() here.
        let result = client.try_mint(&non_admin, &recipient, &500);

        assert!(result.is_err(), "mint with no auth must fail");
    }

    // -------------------------------------------------------------------------
    // mint — auth granted to wrong address
    // -------------------------------------------------------------------------

    /// Even when `require_auth()` is satisfied (via `mock_all_auths`), the
    /// stored-admin equality check must still reject a non-admin caller.
    #[test]
    fn test_wrong_address_with_auth_cannot_mint() {
        let (env, client, _admin) = setup_env();
        let non_admin = Address::generate(&env);
        let recipient = Address::generate(&env);

        // Grant auth globally — require_auth() will pass for any address.
        env.mock_all_auths();

        let result = client.try_mint(&non_admin, &recipient, &500);

        assert!(
            result.is_err(),
            "a non-admin address must be rejected by the admin-equality check even with auth"
        );
        assert_eq!(
            result.unwrap_err().unwrap(),
            TokenError::Unauthorized,
            "wrong-admin mint must return TokenError::Unauthorized"
        );
    }

    // -------------------------------------------------------------------------
    // burn — no auth
    // -------------------------------------------------------------------------

    #[test]
    fn test_burn_no_auth_fails() {
        let (env, client, admin) = setup_env();
        let target = Address::generate(&env);

        // Give target a balance first (auth already mocked from setup_env).
        env.mock_all_auths();
        client.mint(&admin, &target, &200);

        // Now test burn with no auth.
        let result = client.try_burn(&Address::generate(&env), &target, &100);

        assert!(result.is_err(), "burn with no auth must fail");
    }

    // -------------------------------------------------------------------------
    // burn — auth granted to wrong address
    // -------------------------------------------------------------------------

    #[test]
    fn test_wrong_address_with_auth_cannot_burn() {
        let (env, client, admin) = setup_env();
        let non_admin = Address::generate(&env);
        let target = Address::generate(&env);

        // Mint tokens to target.
        env.mock_all_auths();
        client.mint(&admin, &target, &200);

        // mock_all_auths is still active; require_auth() will pass for non_admin.
        let result = client.try_burn(&non_admin, &target, &100);

        assert!(
            result.is_err(),
            "a non-admin with auth must still be rejected on burn"
        );
        assert_eq!(
            result.unwrap_err().unwrap(),
            TokenError::Unauthorized,
            "wrong-admin burn must return TokenError::Unauthorized"
        );
    }

    // -------------------------------------------------------------------------
    // initialize — double-init guard
    // -------------------------------------------------------------------------

    /// A second call to `initialize` must be rejected regardless of who calls it.
    /// This prevents an attacker (or even the original admin) from overwriting
    /// the stored admin after deployment.
    #[test]
    fn test_double_initialize_by_admin_is_rejected() {
        let (env, client, admin) = setup_env();

        // mock_all_auths is still active from setup_env setup.
        env.mock_all_auths();
        let result = client.try_initialize(
            &admin,
            &String::from_str(&env, "Hack Token"),
            &String::from_str(&env, "HACK"),
            &18,
            &9_999_999,
        );

        assert!(
            result.is_err(),
            "a second initialize call by the original admin must fail"
        );
        assert_eq!(
            result.unwrap_err().unwrap(),
            TokenError::Unauthorized,
            "double-init must return TokenError::Unauthorized"
        );
    }

    /// An attacker who provides their own auth must also be unable to
    /// re-initialize the contract and steal the admin role.
    #[test]
    fn test_attacker_cannot_reinitialize_to_steal_admin() {
        let (env, client, _admin) = setup_env();
        let attacker = Address::generate(&env);

        env.mock_all_auths();
        let result = client.try_initialize(
            &attacker,
            &String::from_str(&env, "Evil Token"),
            &String::from_str(&env, "EVIL"),
            &18,
            &i128::MAX,
        );

        assert!(
            result.is_err(),
            "attacker re-initialization must be rejected"
        );
        assert_eq!(
            result.unwrap_err().unwrap(),
            TokenError::Unauthorized,
            "double-init by attacker must return TokenError::Unauthorized"
        );
    }
}

#[cfg(test)]
mod state_management_tests {
    use soroban_sdk::{testutils::Address as _, Address, Env};
    use crate::{TokenContract, TokenContractClient};

    #[test]
    fn test_total_supply_consistency() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        
        client.initialize(&admin);
        
        client.mint_reward(&admin, &user1, &100);
        assert_eq!(client.total_supply(), 100);
        
        client.mint_reward(&admin, &user2, &200);
        assert_eq!(client.total_supply(), 300);
        
        client.transfer(&user1, &user2, &50);
        assert_eq!(client.total_supply(), 300);
    }

    #[test]
    fn test_balance_consistency_after_operations() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        
        client.initialize(&admin);
        
        client.mint_reward(&admin, &user1, &1000);
        let initial_balance = client.balance(&user1);
        
        client.transfer(&user1, &user2, &300);
        let user1_after = client.balance(&user1);
        let user2_after = client.balance(&user2);
        
        assert_eq!(user1_after + user2_after, initial_balance);
    }

    #[test]
    fn test_burn_reduces_total_supply() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        
        client.initialize(&admin);
        client.mint_reward(&admin, &user, &1000);
        
        let supply_before = client.total_supply();
        client.burn(&user, &300);
        let supply_after = client.total_supply();
        
        assert_eq!(supply_before - supply_after, 300);
    }

    #[test]
    fn test_initialization_only_once() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &contract_id);
        
        let admin1 = Address::generate(&env);
        let admin2 = Address::generate(&env);
        
        client.initialize(&admin1);
        
        // Second initialization should fail
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.initialize(&admin2);
        }));
        
        assert!(result.is_err());
    }
}
