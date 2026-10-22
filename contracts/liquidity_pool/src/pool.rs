// Liquidity Pool Module (Issue #1002)
// Handles pool initialization, liquidity provision, and reserve management

use brain_storm_shared::math::{
    checked_add_i128, checked_mul_div_i128, checked_mul_i128, checked_sub_i128,
};
use soroban_sdk::{Address, Env};

use crate::types::{DataKey, MiningConfig, PoolConfig, PoolStats};

pub const MINIMUM_LIQUIDITY: i128 = 1000;

/// Scaling factor used when computing the spot price (6 decimal places of precision).
pub const PRICE_SCALE_FACTOR: i128 = 1_000_000;

pub fn initialize(env: &Env, admin: Address, bst_token: Address, fee_collector: Address) {
    assert!(
        !env.storage().instance().has(&DataKey::Admin),
        "Already initialized"
    );
    admin.require_auth();

    env.storage().instance().set(&DataKey::Admin, &admin);
    env.storage().instance().set(&DataKey::TokenA, &bst_token);
    env.storage()
        .instance()
        .set(&DataKey::FeeCollector, &fee_collector);
    env.storage().instance().set(&DataKey::ReserveA, &0_i128);
    env.storage().instance().set(&DataKey::ReserveB, &0_i128);
    env.storage()
        .instance()
        .set(&DataKey::TotalLiquidity, &0_i128);

    let config = PoolConfig {
        fee_numerator: 3,
        fee_denominator: 1000,
        swap_enabled: true,
        add_liquidity_enabled: true,
        remove_liquidity_enabled: true,
    };
    env.storage().instance().set(&DataKey::PoolConfig, &config);

    let mining_config = MiningConfig {
        enabled: true,
        reward_rate: 100,
        reward_token: bst_token,
    };
    env.storage()
        .instance()
        .set(&DataKey::MiningConfig, &mining_config);

    env.storage()
        .instance()
        .set(&DataKey::SwapHistoryCount, &0_u32);
    env.storage()
        .instance()
        .set(&DataKey::AccumulatedFees, &0_i128);
    env.storage()
        .instance()
        .set(&DataKey::EmergencyDrained, &false);
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

    let config: PoolConfig = env.storage().instance().get(&DataKey::PoolConfig).unwrap();
    assert!(config.add_liquidity_enabled, "Adding liquidity is disabled");
    assert!(
        amount_a_desired > 0 && amount_b_desired > 0,
        "Desired amounts must be positive"
    );
    assert!(
        amount_a_min >= 0 && amount_b_min >= 0,
        "Minimum amounts must be non-negative"
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
    let total_liquidity: i128 = env
        .storage()
        .instance()
        .get(&DataKey::TotalLiquidity)
        .unwrap_or(0);

    let (amount_a, amount_b) = if total_liquidity == 0 {
        (amount_a_desired, amount_b_desired)
    } else {
        let amount_b_optimal = quote(amount_a_desired, reserve_a, reserve_b);
        if amount_b_optimal <= amount_b_desired {
            assert!(amount_b_optimal >= amount_b_min, "Insufficient B amount");
            (amount_a_desired, amount_b_optimal)
        } else {
            let amount_a_optimal = quote(amount_b_desired, reserve_b, reserve_a);
            assert!(
                amount_a_optimal <= amount_a_desired,
                "Insufficient A amount"
            );
            assert!(amount_a_optimal >= amount_a_min, "Insufficient A amount");
            (amount_a_optimal, amount_b_desired)
        }
    };

    assert!(amount_a >= amount_a_min, "Insufficient A amount");
    assert!(amount_b >= amount_b_min, "Insufficient B amount");

    let liquidity_minted = if total_liquidity == 0 {
        let root = sqrt(checked_mul_i128(amount_a, amount_b));
        assert!(root > MINIMUM_LIQUIDITY, "Initial liquidity below minimum");
        env.storage().instance().set(
            &DataKey::Liquidity(env.current_contract_address()),
            &MINIMUM_LIQUIDITY,
        );
        checked_sub_i128(root, MINIMUM_LIQUIDITY)
    } else {
        assert!(reserve_a > 0 && reserve_b > 0, "Insufficient reserves");
        let liquidity_minted_a = checked_mul_div_i128(amount_a, total_liquidity, reserve_a);
        let liquidity_minted_b = checked_mul_div_i128(amount_b, total_liquidity, reserve_b);
        liquidity_minted_a.min(liquidity_minted_b)
    };

    assert!(liquidity_minted > 0, "Insufficient liquidity minted");

    env.storage()
        .instance()
        .set(&DataKey::ReserveA, &checked_add_i128(reserve_a, amount_a));
    env.storage()
        .instance()
        .set(&DataKey::ReserveB, &checked_add_i128(reserve_b, amount_b));
    env.storage().instance().set(
        &DataKey::TotalLiquidity,
        &checked_add_i128(total_liquidity, liquidity_minted),
    );

    let user_liquidity: i128 = env
        .storage()
        .persistent()
        .get(&DataKey::Liquidity(provider.clone()))
        .unwrap_or(0);
    env.storage().persistent().set(
        &DataKey::Liquidity(provider),
        &checked_add_i128(user_liquidity, liquidity_minted),
    );

    liquidity_minted
}

pub fn remove_liquidity(env: &Env, provider: Address, liquidity: i128) -> (i128, i128) {
    provider.require_auth();

    let config: PoolConfig = env.storage().instance().get(&DataKey::PoolConfig).unwrap();
    assert!(
        config.remove_liquidity_enabled,
        "Removing liquidity is disabled"
    );
    assert!(liquidity > 0, "Liquidity must be positive");

    let user_liquidity: i128 = env
        .storage()
        .persistent()
        .get(&DataKey::Liquidity(provider.clone()))
        .unwrap_or(0);
    assert!(user_liquidity >= liquidity, "Insufficient liquidity");

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
    let total_liquidity: i128 = env
        .storage()
        .instance()
        .get(&DataKey::TotalLiquidity)
        .unwrap_or(0);

    assert!(total_liquidity > 0, "Pool has no liquidity");

    let amount_a = checked_mul_div_i128(liquidity, reserve_a, total_liquidity);
    let amount_b = checked_mul_div_i128(liquidity, reserve_b, total_liquidity);

    assert!(amount_a > 0 && amount_b > 0, "Insufficient amounts");

    env.storage().persistent().set(
        &DataKey::Liquidity(provider),
        &checked_sub_i128(user_liquidity, liquidity),
    );
    env.storage().instance().set(
        &DataKey::TotalLiquidity,
        &checked_sub_i128(total_liquidity, liquidity),
    );
    env.storage()
        .instance()
        .set(&DataKey::ReserveA, &checked_sub_i128(reserve_a, amount_a));
    env.storage()
        .instance()
        .set(&DataKey::ReserveB, &checked_sub_i128(reserve_b, amount_b));

    (amount_a, amount_b)
}

pub fn get_pool_stats(env: &Env) -> PoolStats {
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
    let total_liquidity: i128 = env
        .storage()
        .instance()
        .get(&DataKey::TotalLiquidity)
        .unwrap_or(0);

    let price_bst_xlm = if reserve_a > 0 {
        checked_mul_div_i128(reserve_b, PRICE_SCALE_FACTOR, reserve_a)
    } else {
        0
    };

    PoolStats {
        reserve_a,
        reserve_b,
        total_liquidity,
        volume_24h: 0,
        fees_24h: 0,
        price_bst_xlm,
    }
}

pub fn get_user_liquidity(env: &Env, user: Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Liquidity(user))
        .unwrap_or(0)
}

pub fn claim_mining_rewards(env: &Env, user: Address) -> i128 {
    user.require_auth();

    let mining_config: MiningConfig = env
        .storage()
        .instance()
        .get(&DataKey::MiningConfig)
        .unwrap();
    assert!(mining_config.enabled, "Mining rewards are disabled");

    let user_liquidity: i128 = env
        .storage()
        .persistent()
        .get(&DataKey::Liquidity(user.clone()))
        .unwrap_or(0);
    if user_liquidity == 0 {
        return 0;
    }

    let rewards = checked_mul_div_i128(user_liquidity, mining_config.reward_rate, 1_000_000);

    env.storage()
        .persistent()
        .set(&DataKey::MiningRewards(user.clone()), &0_i128);

    env.events().publish(
        (
            soroban_sdk::symbol_short!("claim_rew"),
            soroban_sdk::symbol_short!("user"),
        ),
        (user, rewards),
    );

    rewards
}

pub fn quote(amount_a: i128, reserve_a: i128, reserve_b: i128) -> i128 {
    assert!(
        amount_a > 0 && reserve_a > 0 && reserve_b > 0,
        "Invalid quote inputs"
    );
    checked_mul_div_i128(amount_a, reserve_b, reserve_a)
}

pub fn sqrt(x: i128) -> i128 {
    assert!(x >= 0, "sqrt: negative input");
    if x < 2 {
        return x;
    }
    let mut z = checked_add_i128(x, 1) / 2;
    let mut y = x;
    while z < y {
        y = z;
        z = (x / z + z) / 2;
    }
    y
}
