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

    /// Minting arbitrary amounts must never overflow total supply and must
    /// keep the sum of balances equal to the reported total supply.
    #[test]
    fn fuzz_mint_arbitrary_amounts_no_overflow(
        amounts in prop::collection::vec(0i128..=i128::MAX / 8, 1..8)
    ) {
        let (env, admin, client) = setup();
        let mut expected_total: i128 = 0;
        let mut users = vec![];

        for amount in &amounts {
            let user = Address::generate(&env);
            client.mint_reward(&admin, &user, amount);
            expected_total = expected_total.checked_add(*amount).expect("overflow in test model");
            users.push(user);
        }

        prop_assert_eq!(client.total_supply(), expected_total);

        let mut sum_balances: i128 = 0;
        for user in &users {
            sum_balances = sum_balances
                .checked_add(client.balance(user))
                .expect("overflow summing balances");
        }
        prop_assert_eq!(sum_balances, expected_total);
    }

    /// Burning arbitrary amounts must never underflow and must keep the
    /// balance/supply relationship consistent.
    #[test]
    fn fuzz_burn_arbitrary_amounts_no_underflow(
        mint_amount in 1i128..=1_000_000i128,
        burn_amount in 0i128..=1_000_000i128
    ) {
        let (env, admin, client) = setup();
        let user = Address::generate(&env);

        client.mint_reward(&admin, &user, &mint_amount);

        if burn_amount <= mint_amount {
            client.burn(&user, &burn_amount);
            prop_assert_eq!(client.balance(&user), mint_amount - burn_amount);
            prop_assert_eq!(client.total_supply(), mint_amount - burn_amount);
        } else {
            // Burning more than the balance must not change state.
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                client.burn(&user, &burn_amount);
            }));
            prop_assert!(result.is_err());
            prop_assert_eq!(client.balance(&user), mint_amount);
            prop_assert_eq!(client.total_supply(), mint_amount);
        }
    }

    /// Transfers of arbitrary amounts must conserve total supply and never
    /// move more than the sender holds.
    #[test]
    fn fuzz_transfer_arbitrary_amounts_conserves_supply(
        mint_amount in 1i128..=1_000_000i128,
        transfer_amount in 0i128..=1_000_000i128
    ) {
        let (env, admin, client) = setup();
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        client.mint_reward(&admin, &user1, &mint_amount);
        let supply_before = client.total_supply();

        if transfer_amount <= mint_amount {
            client.transfer(&user1, &user2, &transfer_amount);
            prop_assert_eq!(client.balance(&user1), mint_amount - transfer_amount);
            prop_assert_eq!(client.balance(&user2), transfer_amount);
        } else {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                client.transfer(&user1, &user2, &transfer_amount);
            }));
            prop_assert!(result.is_err());
            prop_assert_eq!(client.balance(&user1), mint_amount);
            prop_assert_eq!(client.balance(&user2), 0);
        }

        prop_assert_eq!(client.total_supply(), supply_before);
    }

    /// Staking arbitrary amounts must never create or destroy tokens: the
    /// sum of free balance and staked balance must equal the minted amount.
    #[test]
    fn fuzz_stake_preserves_balance_conservation(
        mint_amount in 1i128..=1_000_000i128,
        stake_amount in 0i128..=1_000_000i128
    ) {
        let (env, admin, client) = setup();
        let user = Address::generate(&env);

        client.mint_reward(&admin, &user, &mint_amount);
        let supply_before = client.total_supply();

        if stake_amount <= mint_amount {
            client.stake(&user, &stake_amount);
            prop_assert_eq!(client.balance(&user), mint_amount - stake_amount);
            prop_assert_eq!(client.staked_balance(&user), stake_amount);
        } else {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                client.stake(&user, &stake_amount);
            }));
            prop_assert!(result.is_err());
            prop_assert_eq!(client.balance(&user), mint_amount);
            prop_assert_eq!(client.staked_balance(&user), 0);
        }

        prop_assert_eq!(client.total_supply(), supply_before);
    }

    /// Airdrop claims must be idempotent: claiming twice must not increase
    /// the recipient balance beyond the allocated amount.
    #[test]
    fn fuzz_airdrop_claim_idempotent(
        claim_amount in 1i128..=1_000_000i128,
        claim_times in 1usize..5
    ) {
        let (env, admin, client) = setup();
        let user = Address::generate(&env);

        client.airdrop(&admin, &user, &claim_amount);

        for _ in 0..claim_times {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                client.claim_airdrop(&user);
            }));
            // Either the claim succeeds once or panics on subsequent attempts;
            // in all cases the balance must never exceed the allocation.
            let _ = result;
            prop_assert!(client.balance(&user) <= claim_amount);
        }

        prop_assert_eq!(client.balance(&user), claim_amount);
        prop_assert_eq!(client.total_supply(), claim_amount);
    }
}
