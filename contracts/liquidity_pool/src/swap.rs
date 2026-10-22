// Swap Module (Issue #1002)
// Handles constant-product AMM swaps and swap history tracking

use brain_storm_shared::math::{
    checked_add_i128, checked_add_u32, checked_div_i128, checked_mul_div_i128, checked_mul_i128,
    checked_sub_i128, checked_sub_u32,
};
use soroban_sdk::{symbol_short, Address, Env, Symbol, Vec};

use crate::types::{DataKey, PoolConfig, SwapRecord};

pub fn swap(
    env: &Env,
    user: Address,
    token_in: Symbol,
    amount_in: i128,
    amount_out_min: i128,
) -> i128 {
    user.require_auth();

    let config: PoolConfig = env.storage().instance().get(&DataKey::PoolConfig).unwrap();
    assert!(config.swap_enabled, "Swapping is disabled");
    assert!(amount_in > 0, "Amount in must be positive");
    assert!(amount_out_min >= 0, "Minimum output must be non-negative");
    assert!(config.fee_denominator > 0, "Invalid fee denominator");
    assert!(
        config.fee_numerator <= config.fee_denominator,
        "Fee exceeds 100%"
    );
    assert!(
        !env.storage()
            .instance()
            .get::<DataKey, bool>(&DataKey::EmergencyDrained)
            .unwrap_or(false),
        "Pool has been emergency drained"
    );

    let reserve_a: i128 = env
        .storage()
        .instance()
        .get(&DataKey::ReserveA)
        .unwrap_or(0);
    let reserve_b: i128 = env
        .storage()
        .instance()
        .get(&DataKey::ReserveB)
        .unwrap_or(0);

    let bst = symbol_short!("bst");
    let xlm = symbol_short!("xlm");

    let (reserve_in, reserve_out) = if token_in == bst {
        (reserve_a, reserve_b)
    } else if token_in == xlm {
        (reserve_b, reserve_a)
    } else {
        panic!("Invalid token")
    };

    assert!(reserve_in > 0 && reserve_out > 0, "Insufficient liquidity");

    let fee_complement = checked_sub_u32(config.fee_denominator, config.fee_numerator) as i128;
    let amount_in_with_fee = checked_mul_i128(amount_in, fee_complement);
    let numerator = checked_mul_i128(amount_in_with_fee, reserve_out);
    let denominator = checked_add_i128(
        checked_mul_i128(reserve_in, config.fee_denominator as i128),
        amount_in_with_fee,
    );
    let amount_out = checked_div_i128(numerator, denominator);

    assert!(amount_out >= amount_out_min, "Insufficient output amount");
    assert!(amount_out <= reserve_out, "Insufficient liquidity");

    if token_in == bst {
        env.storage()
            .instance()
            .set(&DataKey::ReserveA, &checked_add_i128(reserve_a, amount_in));
        env.storage()
            .instance()
            .set(&DataKey::ReserveB, &checked_sub_i128(reserve_b, amount_out));
    } else {
        env.storage()
            .instance()
            .set(&DataKey::ReserveB, &checked_add_i128(reserve_b, amount_in));
        env.storage()
            .instance()
            .set(&DataKey::ReserveA, &checked_sub_i128(reserve_a, amount_out));
    }

    let fee = checked_mul_div_i128(
        amount_in,
        config.fee_numerator as i128,
        config.fee_denominator as i128,
    );

    let accumulated: i128 = env
        .storage()
        .instance()
        .get(&DataKey::AccumulatedFees)
        .unwrap_or(0);
    env.storage().instance().set(
        &DataKey::AccumulatedFees,
        &checked_add_i128(accumulated, fee),
    );

    let history_count: u32 = env
        .storage()
        .instance()
        .get(&DataKey::SwapHistoryCount)
        .unwrap_or(0);
    let token_out = if token_in == bst { xlm } else { bst };
    let record = SwapRecord {
        timestamp: env.ledger().timestamp(),
        user: user.clone(),
        token_in,
        amount_in,
        token_out,
        amount_out,
        fee,
    };
    env.storage()
        .instance()
        .set(&DataKey::SwapHistory(history_count), &record);
    env.storage().instance().set(
        &DataKey::SwapHistoryCount,
        &checked_add_u32(history_count, 1),
    );

    amount_out
}

pub fn get_swap_history(env: &Env, start_index: u32, limit: u32) -> Vec<SwapRecord> {
    let history_count: u32 = env
        .storage()
        .instance()
        .get(&DataKey::SwapHistoryCount)
        .unwrap_or(0);

    let mut history = Vec::new(env);
    let end_index = start_index.saturating_add(limit).min(history_count);

    let mut i = start_index;
    while i < end_index {
        if let Some(record) = env
            .storage()
            .instance()
            .get::<DataKey, SwapRecord>(&DataKey::SwapHistory(i))
        {
            history.push_back(record);
        }
        i = checked_add_u32(i, 1);
    }

    history
}
