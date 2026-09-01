// Liquidity Pool Module (Issue #1002)
// Handles pool initialization, liquidity provision, and reserve management

use soroban_sdk::{Address, Env};
use brain_storm_shared::math::checked_mul_div_i128;

use crate::types::{DataKey, PoolConfig, PoolStats};

pub const MINIMUM_LIQUIDITY: i128 = 1000;

/// Scaling factor used when computing the spot price (6 decimal places of precision).
pub const PRICE_SCALE_FACTOR: i128 = 1_000_000;

pub fn initialize(
    env: &Env,
    admin: Address,
    bst_token: Address,
    fee_collector: Address,
) {
    assert!(
        !env.storage().instance().has(&DataKey::Admin),
        "Already initialized"
    );
    admin.require_auth();
    
    env.storage().instance().set(&DataKey::Admin, &admin);
    env.storage().instance().set(&DataKey::TokenA, &bst_token);
    env.storage().instance().set(&DataKey::FeeCollector, &fee_collector);
    env.storage().instance().set(&DataKey::ReserveA, &0_i128);
    env.storage().instance().set(&DataKey::ReserveB, &0_i128);
    env.storage().instance().set(&DataKey::TotalLiquidity, &0_i128);
    
    let config = PoolConfig {
        fee_numerator: 3,
        fee_denominator: 1000,
        swap_enabled: true,
        add_liquidity_enabled: true,
        remove_liquidity_enabled: true,
    };
    env.storage().instance().set(&DataKey::PoolConfig, &config);
    env.storage().instance().set(&DataKey::SwapHistoryCount, &0_u32);
    env.storage().instance().set(&DataKey::AccumulatedFees, &0_i128);
    env.storage().instance().set(&DataKey::EmergencyDrained, &false);
}

pub fn add_liquidity(
    env: &Env,
    provider: Address,
    amount_a_desired: i128,
    amount_b_desired: i128,
    amount_a_min: i128,
    amount_b_min: i128,
) -> i128 {
    provider.require_auth();
    assert!(amount_a_desired > 0 && amount_b_desired > 0, "Amounts must be positive");
    
    // Cache config read (Issue #1002 - optimization implicit)
    let config: PoolConfig = env
        .storage()
        .instance()
        .get(&DataKey::PoolConfig)
        .unwrap();
    
    let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap_or(0);
    let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap_or(0);
    let total_liquidity: i128 = env.storage().instance().get(&DataKey::TotalLiquidity).unwrap_or(0);
    
    let mut lp_tokens = 0_i128;
    
    if total_liquidity == 0 {
        lp_tokens = sqrt(checked_mul_i128(amount_a_desired, amount_b_desired)) - MINIMUM_LIQUIDITY;
    } else {
        let quote_b = quote(amount_a_desired, reserve_a, reserve_b);
        assert!(quote_b >= amount_b_min, "Insufficient B amount");
        lp_tokens = checked_mul_div_i128(amount_a_desired, total_liquidity, reserve_a);
    }
    
    env.storage()
        .instance()
        .set(&DataKey::ReserveA, &(reserve_a + amount_a_desired));
    env.storage()
        .instance()
        .set(&DataKey::ReserveB, &(reserve_b + amount_b_desired));
    env.storage()
        .instance()
        .set(&DataKey::TotalLiquidity, &(total_liquidity + lp_tokens));
    
    let user_balance: i128 = env
        .storage()
        .persistent()
        .get(&DataKey::Liquidity(provider.clone()))
        .unwrap_or(0);
    env.storage()
        .persistent()
        .set(&DataKey::Liquidity(provider), &(user_balance + lp_tokens));
    
    lp_tokens
}

pub fn remove_liquidity(env: &Env, provider: Address, liquidity: i128) -> (i128, i128) {
    provider.require_auth();
    
    let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap_or(0);
    let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap_or(0);
    let total_liquidity: i128 = env.storage().instance().get(&DataKey::TotalLiquidity).unwrap_or(0);
    
    assert!(total_liquidity > 0, "No liquidity to remove");
    
    let amount_a = checked_mul_div_i128(liquidity, reserve_a, total_liquidity);
    let amount_b = checked_mul_div_i128(liquidity, reserve_b, total_liquidity);
    
    env.storage()
        .instance()
        .set(&DataKey::ReserveA, &(reserve_a - amount_a));
    env.storage()
        .instance()
        .set(&DataKey::ReserveB, &(reserve_b - amount_b));
    env.storage()
        .instance()
        .set(&DataKey::TotalLiquidity, &(total_liquidity - liquidity));
    
    let user_balance: i128 = env
        .storage()
        .persistent()
        .get(&DataKey::Liquidity(provider.clone()))
        .unwrap_or(0);
    env.storage()
        .persistent()
        .set(&DataKey::Liquidity(provider), &(user_balance - liquidity));
    
    (amount_a, amount_b)
}

pub fn get_pool_stats(env: &Env) -> PoolStats {
    let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap_or(0);
    let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap_or(0);
    let total_liquidity: i128 = env.storage().instance().get(&DataKey::TotalLiquidity).unwrap_or(0);
    
    let price = if reserve_a > 0 {
        checked_mul_div_i128(reserve_b, PRICE_SCALE_FACTOR, reserve_a)
    } else {
        0
    };
    
    PoolStats {
        reserve_a,
        reserve_b,
        total_liquidity,
        price,
    }
}

pub fn quote(amount_a: i128, reserve_a: i128, reserve_b: i128) -> i128 {
    assert!(amount_a > 0 && reserve_a > 0 && reserve_b > 0, "Invalid quote inputs");
    checked_mul_div_i128(amount_a, reserve_b, reserve_a)
}

pub fn sqrt(x: i128) -> i128 {
    if x == 0 { return 0; }
    let mut z = (x + 1) / 2;
    let mut y = x;
    while z < y {
        y = z;
        z = (z + x / z) / 2;
    }
    y
}
