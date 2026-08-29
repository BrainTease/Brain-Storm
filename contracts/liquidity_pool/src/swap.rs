// Swap Module (Issue #1002)
// Handles constant-product AMM swaps and swap history tracking

use soroban_sdk::{Address, Env, Symbol, Vec};
use brain_storm_shared::math::checked_mul_div_i128;

use crate::types::{DataKey, PoolConfig, SwapRecord};

pub fn swap(
    env: &Env,
    user: Address,
    token_in: Symbol,
    amount_in: i128,
    amount_out_min: i128,
) -> i128 {
    user.require_auth();
    assert!(amount_in > 0, "Amount must be positive");
    
    let config: PoolConfig = env
        .storage()
        .instance()
        .get(&DataKey::PoolConfig)
        .unwrap();
    assert!(config.swap_enabled, "Swaps are disabled");
    
    let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap_or(0);
    let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap_or(0);
    
    // Constant-product formula: (amount_in * fee_complement * reserve_out) / (reserve_in * fee_denom + amount_in_with_fee)
    let fee_amount = checked_mul_div_i128(amount_in, 1000 - config.fee_numerator, 1000);
    let amount_in_with_fee = amount_in - fee_amount;
    
    let amount_out = if token_in == soroban_sdk::symbol_short!("BST") {
        checked_mul_div_i128(amount_in_with_fee * reserve_b, 1, reserve_a * 1000 + amount_in_with_fee)
    } else {
        checked_mul_div_i128(amount_in_with_fee * reserve_a, 1, reserve_b * 1000 + amount_in_with_fee)
    };
    
    assert!(amount_out >= amount_out_min, "Slippage exceeded");
    
    // Record swap
    let swap_record = SwapRecord {
        timestamp: env.ledger().timestamp(),
        user: user.clone(),
        amount_in,
        amount_out,
        fee: fee_amount,
    };
    
    let swap_count: u32 = env
        .storage()
        .instance()
        .get(&DataKey::SwapHistoryCount)
        .unwrap_or(0);
    env.storage()
        .instance()
        .set(&DataKey::SwapHistory(swap_count), &swap_record);
    env.storage()
        .instance()
        .set(&DataKey::SwapHistoryCount, &(swap_count + 1));
    
    // Update reserves
    if token_in == soroban_sdk::symbol_short!("BST") {
        env.storage()
            .instance()
            .set(&DataKey::ReserveA, &(reserve_a + amount_in));
        env.storage()
            .instance()
            .set(&DataKey::ReserveB, &(reserve_b - amount_out));
    } else {
        env.storage()
            .instance()
            .set(&DataKey::ReserveA, &(reserve_a - amount_out));
        env.storage()
            .instance()
            .set(&DataKey::ReserveB, &(reserve_b + amount_in));
    }
    
    // Accumulate fees
    let accumulated_fees: i128 = env
        .storage()
        .instance()
        .get(&DataKey::AccumulatedFees)
        .unwrap_or(0);
    env.storage()
        .instance()
        .set(&DataKey::AccumulatedFees, &(accumulated_fees + fee_amount));
    
    amount_out
}

pub fn get_swap_history(env: &Env, start: u32, limit: u32) -> Vec<SwapRecord> {
    let total: u32 = env
        .storage()
        .instance()
        .get(&DataKey::SwapHistoryCount)
        .unwrap_or(0);
    
    let mut result = Vec::new(env);
    for i in 0..limit {
        let idx = start.saturating_add(i);
        if idx >= total {
            break;
        }
        
        if let Some(record) = env
            .storage()
            .instance()
            .get::<_, SwapRecord>(&DataKey::SwapHistory(idx))
        {
            result.push_back(record);
        }
    }
    result
}
