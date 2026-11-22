#![no_std]
#![allow(clippy::needless_pass_by_value)] // Soroban SDK types like Address are Copy
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
};

use brain_storm_shared::{access, events::emit_contract_event, reentrancy, ttl, validation};

#[contracttype]
pub enum DataKey {
    Admin,
    RoyaltySplit(u64),
    RoyaltyRecipient(u64, u32),
    RecipientCount(u64),
    RoyaltyBalance(Address),
    PaymentRecord(u64),
    PaymentCount,
}

#[contracttype]
#[derive(Clone)]
pub struct RoyaltySplit {
    pub course_id: u64,
    pub creator_percentage: u32,
    pub contributor_percentage: u32,
    pub platform_percentage: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct RoyaltyPayment {
    pub course_id: u64,
    pub amount: i128,
    pub timestamp: u64,
}

const EVT_DOMAIN: Symbol = symbol_short!("royalty");
const DISTRIBUTE: Symbol = symbol_short!("distribtd");
const WITHDRAW: Symbol = symbol_short!("withdrawn");
const SPLIT_SET: Symbol = symbol_short!("split_set");

#[contract]
pub struct RoyaltyDistributionContract;

#[contractimpl]
impl RoyaltyDistributionContract {
    pub fn initialize(env: Env, admin: Address) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "Already initialized"
        );
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn set_royalty_split(
        env: Env,
        admin: Address,
        course_id: u64,
        creator_pct: u32,
        contributor_pct: u32,
        platform_pct: u32,
    ) {
        access::require_admin(&env, &admin, &DataKey::Admin);
        assert!(
            creator_pct + contributor_pct + platform_pct == 100,
            "Percentages must sum to 100"
        );

        let split = RoyaltySplit {
            course_id,
            creator_percentage: creator_pct,
            contributor_percentage: contributor_pct,
            platform_percentage: platform_pct,
        };

        let split_key = DataKey::RoyaltySplit(course_id);
        env.storage().persistent().set(&split_key, &split);
        ttl::bump_persistent(&env, &split_key);

        emit_contract_event(
            &env,
            EVT_DOMAIN,
            SPLIT_SET,
            (admin.clone(), course_id, (creator_pct, contributor_pct, platform_pct)),
        );
    }

    pub fn add_royalty_recipient(
        env: Env,
        admin: Address,
        course_id: u64,
        recipient: Address,
    ) {
        access::require_admin(&env, &admin, &DataKey::Admin);

        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::RecipientCount(course_id))
            .unwrap_or(0);

        let recipient_key = DataKey::RoyaltyRecipient(course_id, count);
        env.storage().persistent().set(&recipient_key, &recipient);
        ttl::bump_persistent(&env, &recipient_key);

        let count_key = DataKey::RecipientCount(course_id);
        env.storage().persistent().set(&count_key, &(count + 1));
        ttl::bump_persistent(&env, &count_key);
    }

    pub fn distribute_royalties(
        env: Env,
        admin: Address,
        course_id: u64,
        total_amount: i128,
    ) {
        access::require_admin(&env, &admin, &DataKey::Admin);
        validation::require_positive_amount(total_amount);

        // Reentrancy guard: balance mutations and any downstream token
        // transfers must not be re-entered while a distribution is in flight.
        reentrancy::enter(&env);

        let split: RoyaltySplit = env
            .storage()
            .persistent()
            .get(&DataKey::RoyaltySplit(course_id))
            .expect("Royalty split not configured");

        let creator_amount = compute_split_amount(total_amount, split.creator_percentage);
        let contributor_amount = compute_split_amount(total_amount, split.contributor_percentage);
        let platform_amount = total_amount
            .checked_sub(creator_amount)
            .and_then(|remaining| remaining.checked_sub(contributor_amount))
            .unwrap_or(0);

        let creator: Address = env
            .storage()
            .persistent()
            .get(&DataKey::RoyaltyRecipient(course_id, 0))
            .expect("Creator not set");

        // Checks-effects-interactions: credit all balances before any
        // external interaction (token transfer) can occur.
        let creator_balance_key = DataKey::RoyaltyBalance(creator.clone());
        let mut creator_balance: i128 = env
            .storage()
            .persistent()
            .get(&creator_balance_key)
            .unwrap_or(0);
        creator_balance = creator_balance
            .checked_add(creator_amount)
            .expect("royalty balance overflow");
        env.storage()
            .persistent()
            .set(&creator_balance_key, &creator_balance);
        ttl::bump_persistent(&env, &creator_balance_key);

        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::RecipientCount(course_id))
            .unwrap_or(0);

        if count > 1 {
            let contributor: Address = env
                .storage()
                .persistent()
                .get(&DataKey::RoyaltyRecipient(course_id, 1))
                .expect("Contributor not set");

            let contrib_balance_key = DataKey::RoyaltyBalance(contributor.clone());
            let mut contrib_balance: i128 = env
                .storage()
                .persistent()
                .get(&contrib_balance_key)
                .unwrap_or(0);
            contrib_balance = contrib_balance
                .checked_add(contributor_amount)
                .expect("royalty balance overflow");
            env.storage()
                .persistent()
                .set(&contrib_balance_key, &contrib_balance);
            ttl::bump_persistent(&env, &contrib_balance_key);
        }

        let platform: Address = env
            .storage()
            .persistent()
            .get(&DataKey::RoyaltyRecipient(course_id, count.saturating_sub(1)))
            .expect("Platform not set");

        let platform_balance_key = DataKey::RoyaltyBalance(platform.clone());
        let mut platform_balance: i128 = env
            .storage()
            .persistent()
            .get(&platform_balance_key)
            .unwrap_or(0);
        platform_balance = platform_balance
            .checked_add(platform_amount)
            .expect("royalty balance overflow");
        env.storage()
            .persistent()
            .set(&platform_balance_key, &platform_balance);
        ttl::bump_persistent(&env, &platform_balance_key);

        let payment_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::PaymentCount)
            .unwrap_or(0);

        let record = RoyaltyPayment {
            course_id,
            amount: total_amount,
            timestamp: env.ledger().timestamp(),
        };

        let record_key = DataKey::PaymentRecord(payment_id);
        env.storage().persistent().set(&record_key, &record);
        ttl::bump_persistent(&env, &record_key);
        env.storage()
            .instance()
            .set(&DataKey::PaymentCount, &(payment_id + 1));

        emit_contract_event(
            &env,
            EVT_DOMAIN,
            DISTRIBUTE,
            (admin.clone(), course_id, total_amount),
        );

        reentrancy::exit(&env);
    }

    pub fn withdraw_royalties(env: Env, recipient: Address) -> i128 {
        recipient.require_auth();

        reentrancy::enter(&env);

        let balance_key = DataKey::RoyaltyBalance(recipient.clone());
        let balance: i128 = env
            .storage()
            .persistent()
            .get(&balance_key)
            .unwrap_or(0);

        assert!(balance > 0, "No royalties to withdraw");

        // Effects before interactions: zero out the balance before any
        // external transfer so a re-entrant call cannot double-withdraw.
        env.storage().persistent().set(&balance_key, &0i128);
        ttl::bump_persistent(&env, &balance_key);

        emit_contract_event(&env, EVT_DOMAIN, WITHDRAW, (recipient.clone(), balance, 0i128));

        reentrancy::exit(&env);

        balance
    }

    pub fn get_royalty_balance(env: Env, recipient: Address) -> i128 {
        let key = DataKey::RoyaltyBalance(recipient);
        let balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if balance != 0 {
            ttl::bump_persistent(&env, &key);
        }
        balance
    }

    pub fn get_royalty_split(env: Env, course_id: u64) -> Option<RoyaltySplit> {
        env.storage()
            .persistent()
            .get(&DataKey::RoyaltySplit(course_id))
    }

    pub fn get_payment_record(env: Env, payment_id: u64) -> Option<RoyaltyPayment> {
        env.storage()
            .persistent()
            .get(&DataKey::PaymentRecord(payment_id))
    }

    pub fn get_payment_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::PaymentCount)
            .unwrap_or(0)
    }

    pub fn get_total_distributed(env: Env, course_id: u64) -> i128 {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::PaymentCount)
            .unwrap_or(0);

        let mut total: i128 = 0;
        let mut i: u64 = 0;
        while i < count {
            let record: Option<RoyaltyPayment> = env
                .storage()
                .persistent()
                .get(&DataKey::PaymentRecord(i));
            if let Some(r) = record {
                if r.course_id == course_id {
                    total += r.amount;
                }
            }
            i += 1;
        }
        total
    }
}

fn compute_split_amount(total_amount: i128, percentage: u32) -> i128 {
    let pct: i128 = percentage as i128;
    total_amount
        .checked_mul(pct)
        .expect("royalty split overflow")
        .checked_div(100)
        .expect("division by zero")
}

#[cfg(test)]
mod tests;
