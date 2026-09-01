#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec};

mod types;
mod pool;
mod swap;
mod fees;

use types::{DataKey, PoolStats, SwapRecord};

#[contract]
pub struct LiquidityPoolContract;

#[contractimpl]
impl LiquidityPoolContract {
    /// Initialize the liquidity pool (Issue #1002 - delegated to pool module)
    pub fn initialize(env: Env, admin: Address, bst_token: Address, fee_collector: Address) {
        pool::initialize(&env, admin, bst_token, fee_collector);
    }

    /// Add liquidity to the pool (delegated to pool module)
    pub fn add_liquidity(
        env: Env,
        provider: Address,
        amount_a_desired: i128,
        amount_b_desired: i128,
        amount_a_min: i128,
        amount_b_min: i128,
    ) -> i128 {
        pool::add_liquidity(&env, provider, amount_a_desired, amount_b_desired, amount_a_min, amount_b_min)
    }

    /// Remove liquidity from the pool (delegated to pool module)
    pub fn remove_liquidity(env: Env, provider: Address, liquidity: i128) -> (i128, i128) {
        pool::remove_liquidity(&env, provider, liquidity)
    }

    /// Execute a swap (delegated to swap module)
    pub fn swap(env: Env, user: Address, token_in: Symbol, amount_in: i128, amount_out_min: i128) -> i128 {
        swap::swap(&env, user, token_in, amount_in, amount_out_min)
    }

    /// Get swap history (delegated to swap module)
    pub fn get_swap_history(env: Env, start: u32, limit: u32) -> Vec<SwapRecord> {
        swap::get_swap_history(&env, start, limit)
    }

    /// Collect accumulated fees (delegated to fees module)
    pub fn collect_fees(env: Env, admin: Address) {
        fees::collect_fees(&env, admin);
    }

    /// Get accumulated fees (delegated to fees module)
    pub fn get_accumulated_fees(env: Env) -> i128 {
        fees::get_accumulated_fees(&env)
    }

    /// Emergency drain the pool (delegated to fees module)
    pub fn emergency_drain(env: Env, admin: Address) {
        fees::emergency_drain(&env, admin);
    }

    /// Get pool statistics (delegated to pool module)
    pub fn get_pool_stats(env: Env) -> PoolStats {
        pool::get_pool_stats(&env)
    }
}

#[cfg(test)]
mod tests;
