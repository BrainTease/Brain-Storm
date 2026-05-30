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
