#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
};

#[contracttype]
pub enum DataKey {
    Admin,
    Whitelist(Address),
    Blacklist(Address),
    TransferLimit(Address),
    PendingApprovals(Address, Address),
    EmergencyOverride,
    RestrictionLog(u64),
    LogCount,
}

#[contracttype]
#[derive(Clone)]
pub struct RestrictionLogEntry {
    pub id: u64,
    pub account: Address,
    pub action: Symbol,
    pub timestamp: u64,
}

const WHITELIST_ADD: Symbol = symbol_short!("wl_add");
const BLACKLIST_ADD: Symbol = symbol_short!("bl_add");
const LIMIT_SET: Symbol = symbol_short!("limit");
const APPROVAL_REQ: Symbol = symbol_short!("appr");
const EMERGENCY: Symbol = symbol_short!("emrg");

#[contract]
pub struct TokenRestrictionsContract;

#[contractimpl]
impl TokenRestrictionsContract {
    pub fn initialize(env: Env, admin: Address) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "Already initialized"
        );
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn add_to_whitelist(env: Env, admin: Address, account: Address) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can manage whitelist");

        env.storage()
            .instance()
            .set(&DataKey::Whitelist(account.clone()), &true);

        env.events()
            .publish((WHITELIST_ADD, symbol_short!("addr")), account);
    }

    pub fn remove_from_whitelist(env: Env, admin: Address, account: Address) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can manage whitelist");

        env.storage()
            .instance()
            .remove(&DataKey::Whitelist(account.clone()));

        env.events()
            .publish((WHITELIST_ADD, symbol_short!("rmv")), account);
    }

    pub fn is_whitelisted(env: Env, account: Address) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Whitelist(account))
            .unwrap_or(false)
    }

    pub fn add_to_blacklist(env: Env, admin: Address, account: Address) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can manage blacklist");

        env.storage()
            .instance()
            .set(&DataKey::Blacklist(account.clone()), &true);

        env.events()
            .publish((BLACKLIST_ADD, symbol_short!("addr")), account);
    }

    pub fn remove_from_blacklist(env: Env, admin: Address, account: Address) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can manage blacklist");

        env.storage()
            .instance()
            .remove(&DataKey::Blacklist(account.clone()));

        env.events()
            .publish((BLACKLIST_ADD, symbol_short!("rmv")), account);
    }

    pub fn is_blacklisted(env: Env, account: Address) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Blacklist(account))
            .unwrap_or(false)
    }

    pub fn set_transfer_limit(env: Env, admin: Address, account: Address, limit: i128) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can set limits");
        assert!(limit > 0, "Limit must be positive");

        env.storage()
            .instance()
            .set(&DataKey::TransferLimit(account.clone()), &limit);

        env.events()
            .publish((LIMIT_SET, symbol_short!("addr")), (account, limit));
    }

    pub fn get_transfer_limit(env: Env, account: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TransferLimit(account))
            .unwrap_or(i128::MAX)
    }

    /// Request approval for a transfer from `from` to `to`.
    /// The transfer is blocked until admin approves it via approve_transfer().
    pub fn request_transfer_approval(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
    ) {
        from.require_auth();
        assert!(amount > 0, "Amount must be positive");

        env.storage()
            .instance()
            .set(&DataKey::PendingApprovals(from.clone(), to.clone()), &true);

        env.events()
            .publish((APPROVAL_REQ, symbol_short!("xfer")), (from, to, amount));
    }

    /// Admin approval to allow a transfer from `from` to `to`.
    /// Clears the pending approval flag, allowing transfers between these addresses.
    pub fn approve_transfer(env: Env, admin: Address, from: Address, to: Address) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can approve transfers");

        env.storage()
            .instance()
            .remove(&DataKey::PendingApprovals(from.clone(), to.clone()));

        env.events()
            .publish((APPROVAL_REQ, symbol_short!("appr")), (from, to));
    }

    pub fn is_transfer_approved(env: Env, from: Address, to: Address) -> bool {
        env.storage()
            .instance()
            .get::<_, bool>(&DataKey::PendingApprovals(from, to))
            .unwrap_or(true)
    }

    pub fn activate_emergency_override(env: Env, admin: Address) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can activate override");

        env.storage()
            .instance()
            .set(&DataKey::EmergencyOverride, &true);

        Self::log_restriction_event(env.clone(), admin, symbol_short!("emrg_on"));
        env.events()
            .publish((EMERGENCY, symbol_short!("on")), env.ledger().timestamp());
    }

    pub fn deactivate_emergency_override(env: Env, admin: Address) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can deactivate override");

        env.storage()
            .instance()
            .set(&DataKey::EmergencyOverride, &false);

        Self::log_restriction_event(env.clone(), admin, symbol_short!("emrg_off"));
        env.events()
            .publish((EMERGENCY, symbol_short!("off")), env.ledger().timestamp());
    }

    pub fn is_emergency_override_active(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::EmergencyOverride)
            .unwrap_or(false)
    }

    /// Comprehensive transfer authorization check.
    /// Verifies: emergency override, blacklist, whitelist, approvals.
    /// For amount-based limits, use can_transfer_amount().
    pub fn can_transfer(env: Env, from: Address, to: Address) -> bool {
        // Emergency override bypasses all checks
        if Self::is_emergency_override_active(env.clone()) {
            return true;
        }

        // Blacklist blocks transfer
        if Self::is_blacklisted(env.clone(), from.clone())
            || Self::is_blacklisted(env.clone(), to.clone())
        {
            return false;
        }

        // Whitelist enforcement (if whitelist exists)
        let to_whitelisted = Self::is_whitelisted(env.clone(), to.clone());
        let from_whitelisted = Self::is_whitelisted(env.clone(), from.clone());

        // If either is whitelisted, check that both are in whitelist
        if to_whitelisted || from_whitelisted {
            if !to_whitelisted || !from_whitelisted {
                return false;
            }
        }

        // Check transfer approval status
        if !Self::is_transfer_approved(env, from, to) {
            return false;
        }

        true
    }

    /// Check if transfer is allowed with a specific amount.
    /// Verifies: can_transfer() checks + transfer limit for sender.
    pub fn can_transfer_amount(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
    ) -> bool {
        // First check all basic transfer restrictions
        if !Self::can_transfer(env.clone(), from.clone(), to) {
            return false;
        }

        // Then check transfer limit if one is set
        let limit = Self::get_transfer_limit(env, from);
        if limit != i128::MAX && amount > limit {
            return false;
        }

        true
    }

    fn log_restriction_event(env: Env, account: Address, action: Symbol) {
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::LogCount)
            .unwrap_or(0);

        let entry = RestrictionLogEntry {
            id,
            account,
            action,
            timestamp: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::RestrictionLog(id), &entry);
        env.storage()
            .instance()
            .set(&DataKey::LogCount, &(id + 1));
    }

    pub fn get_restriction_log(env: Env, log_id: u64) -> Option<RestrictionLogEntry> {
        env.storage()
            .persistent()
            .get(&DataKey::RestrictionLog(log_id))
    }

    pub fn get_log_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::LogCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod tests;
