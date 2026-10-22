// Fee Management Module (Issue #1002)
// Handles fee collection and accounting

use brain_storm_shared::access;
use soroban_sdk::{symbol_short, Address, Env};

use crate::types::{DataKey, PoolConfig};

const FEE_COLLECTED: soroban_sdk::Symbol = symbol_short!("fee_coll");
const EMERGENCY_DRAIN: soroban_sdk::Symbol = symbol_short!("emrg_drn");

pub fn collect_fees(env: &Env, admin: Address) -> i128 {
    access::require_admin(env, &admin, &DataKey::Admin);

    let fees: i128 = env
        .storage()
        .instance()
        .get(&DataKey::AccumulatedFees)
        .unwrap_or(0);
    assert!(fees > 0, "No fees to collect");

    let fee_collector: Address = env
        .storage()
        .instance()
        .get(&DataKey::FeeCollector)
        .unwrap();

    env.storage()
        .instance()
        .set(&DataKey::AccumulatedFees, &0_i128);

    env.events()
        .publish((FEE_COLLECTED, symbol_short!("to")), (fee_collector, fees));

    fees
}

pub fn get_accumulated_fees(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::AccumulatedFees)
        .unwrap_or(0)
}

pub fn emergency_drain(env: &Env, admin: Address) -> (i128, i128) {
    access::require_admin(env, &admin, &DataKey::Admin);
    assert!(
        !env.storage()
            .instance()
            .get::<DataKey, bool>(&DataKey::EmergencyDrained)
            .unwrap_or(false),
        "Already drained"
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

    env.storage().instance().set(&DataKey::ReserveA, &0_i128);
    env.storage().instance().set(&DataKey::ReserveB, &0_i128);
    env.storage()
        .instance()
        .set(&DataKey::TotalLiquidity, &0_i128);
    env.storage()
        .instance()
        .set(&DataKey::EmergencyDrained, &true);

    let mut config: PoolConfig = env.storage().instance().get(&DataKey::PoolConfig).unwrap();
    config.swap_enabled = false;
    config.add_liquidity_enabled = false;
    config.remove_liquidity_enabled = false;
    env.storage().instance().set(&DataKey::PoolConfig, &config);

    env.events().publish(
        (EMERGENCY_DRAIN, symbol_short!("admin")),
        (admin, reserve_a, reserve_b),
    );

    (reserve_a, reserve_b)
}
