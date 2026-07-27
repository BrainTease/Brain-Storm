#![cfg(test)]
use proptest::prelude::*;
use soroban_sdk::{testutils::Address as _, Address, Env};
use crate::{TokenContract, TokenContractClient};

fn setup() -> (Env, Address, TokenContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, TokenContract);
    let client = TokenContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, admin, client)
}

proptest! {
    #[test]
    fn fuzz_mint_valid_amounts(amount in 1i128..=i128::MAX / 2) {
        let (env, admin, client) = setup();
        let user = Address::generate(&env);
        
        client.mint_reward(&admin, &user, &amount);
        prop_assert_eq!(client.balance(&user), amount);
        prop_assert_eq!(client.total_supply(), amount);
    }

    #[test]
    fn fuzz_transfer_valid_amounts(
        mint_amount in 1000i128..=100_000i128,
        transfer_amount in 1i128..=1000i128
    ) {
        let (env, admin, client) = setup();
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        
        client.mint_reward(&admin, &user1, &mint_amount);
        
        if transfer_amount <= mint_amount {
            client.transfer(&user1, &user2, &transfer_amount);
            prop_assert_eq!(client.balance(&user1), mint_amount - transfer_amount);
            prop_assert_eq!(client.balance(&user2), transfer_amount);
        }
    }

    #[test]
    fn fuzz_burn_valid_amounts(
        mint_amount in 1000i128..=100_000i128,
        burn_amount in 1i128..=1000i128
    ) {
        let (env, admin, client) = setup();
        let user = Address::generate(&env);
        
        client.mint_reward(&admin, &user, &mint_amount);
        
        if burn_amount <= mint_amount {
            client.burn(&user, &burn_amount);
            prop_assert_eq!(client.balance(&user), mint_amount - burn_amount);
            prop_assert_eq!(client.total_supply(), mint_amount - burn_amount);
        }
    }

    #[test]
    fn fuzz_multiple_transfers_preserve_total(
        amounts in prop::collection::vec(1i128..=10_000i128, 2..10)
    ) {
        let (env, admin, client) = setup();
        let mut users = vec![];
        let mut total = 0i128;
        
        for amount in &amounts {
            let user = Address::generate(&env);
            client.mint_reward(&admin, &user, amount);
            users.push(user);
            total += amount;
        }
        
        prop_assert_eq!(client.total_supply(), total);
    }

    #[test]
    fn fuzz_sequential_operations_consistency(
        ops in prop::collection::vec(0u8..3, 1..20)
    ) {
        let (env, admin, client) = setup();
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        
        let mut balance1 = 0i128;
        let mut balance2 = 0i128;
        
        for op in ops {
            match op {
                0 => {
                    // Mint to user1
                    let amount = 100i128;
                    client.mint_reward(&admin, &user1, &amount);
                    balance1 += amount;
                }
                1 => {
                    // Transfer from user1 to user2
                    if balance1 > 0 {
                        let amount = (balance1 / 2).max(1);
                        client.transfer(&user1, &user2, &amount);
                        balance1 -= amount;
                        balance2 += amount;
                    }
                }
                2 => {
                    // Burn from user2
                    if balance2 > 0 {
                        let amount = (balance2 / 2).max(1);
                        client.burn(&user2, &amount);
                        balance2 -= amount;
                    }
                }
                _ => {}
            }
        }
        
        prop_assert_eq!(client.balance(&user1), balance1);
        prop_assert_eq!(client.balance(&user2), balance2);
    }

    #[test]
    fn fuzz_transfer_never_creates_tokens(
        mint_amount in 1000i128..=100_000i128,
        transfer_amount in 1i128..=1000i128
    ) {
        let (env, admin, client) = setup();
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        
        client.mint_reward(&admin, &user1, &mint_amount);
        let supply_before = client.total_supply();
        
        if transfer_amount <= mint_amount {
            client.transfer(&user1, &user2, &transfer_amount);
            let supply_after = client.total_supply();
            prop_assert_eq!(supply_before, supply_after);
        }
    }

    #[test]
    fn fuzz_burn_never_creates_tokens(
        mint_amount in 1000i128..=100_000i128,
        burn_amount in 1i128..=1000i128
    ) {
        let (env, admin, client) = setup();
        let user = Address::generate(&env);
        
        client.mint_reward(&admin, &user, &mint_amount);
        let supply_before = client.total_supply();
        
        if burn_amount <= mint_amount {
            client.burn(&user, &burn_amount);
            let supply_after = client.total_supply();
            prop_assert!(supply_after <= supply_before);
        }
    }
}
