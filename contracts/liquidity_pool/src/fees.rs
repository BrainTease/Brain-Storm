// Fee Management Module (Issue #1002)
// Handles fee collection and accounting

use soroban_sdk::{Address, Env};
use brain_storm_shared::access;

use crate::types::DataKey;

pub fn collect_fees(env: &Env, admin: Address) {
    access::require_admin(env, &admin, &DataKey::Admin);
    
    let fees: i128 = env
        .storage()
        .instance()
        .get(&DataKey::AccumulatedFees)
        .unwrap_or(0);
    
    if fees > 0 {
        let _collector: Address = env
            .storage()
            .instance()
            .get(&DataKey::FeeCollector)
            .unwrap();
        // TODO: Transfer fees to collector via token contract call
        // For now, just reset accumulated fees
        env.storage().instance().set(&DataKey::AccumulatedFees, &0);
    }
}

pub fn get_accumulated_fees(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::AccumulatedFees)
        .unwrap_or(0)
}

pub fn emergency_drain(env: &Env, admin: Address) {
    access::require_admin(env, &admin, &DataKey::Admin);
    
    // Mark as drained and zero reserves
    env.storage().instance().set(&DataKey::EmergencyDrained, &true);
    env.storage().instance().set(&DataKey::ReserveA, &0_i128);
    env.storage().instance().set(&DataKey::ReserveB, &0_i128);
    env.storage().instance().set(&DataKey::TotalLiquidity, &0_i128);
}
