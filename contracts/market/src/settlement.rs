use soroban_sdk::{Address, Env, Symbol};
use brain_storm_shared::pausable;
use crate::MarketError;

pub fn release_escrow(env: Env, admin: Address) -> Result<(), MarketError> {
    pausable::check_not_paused(&env);
    access::require_admin(&env, &admin, &crate::DataKey::Admin);
    Ok(())
}

pub fn refund_escrow(env: Env, admin: Address) -> Result<(), MarketError> {
    pausable::check_not_paused(&env);
    access::require_admin(&env, &admin, &crate::DataKey::Admin);
    Ok(())
}
