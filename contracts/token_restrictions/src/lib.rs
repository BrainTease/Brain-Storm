#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
};

use brain_storm_shared::access;

// =============================================================================
// Input-length limits (Issue #1015)
// =============================================================================

/// Maximum number of log entries retained in instance storage.
pub const MAX_LOG_ENTRIES: u64 = 1_000;

/// Maximum number of per-account pending-approval pairs held in instance
/// storage at any one time.  Each pair occupies a separate instance storage
/// slot; limiting this guards against storage-rent bloat.
pub const MAX_PENDING_APPROVALS: u64 = 500;

/// Maximum transfer limit value (prevents overflow when comparing to amounts).
pub const MAX_TRANSFER_LIMIT: i128 = 1_000_000_000_000_000_000; // 1e18

// =============================================================================
// Storage keys
// =============================================================================

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
    PendingApprovalCount,
}

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Contract
// =============================================================================

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
        env.storage()
            .instance()
            .set(&DataKey::PendingApprovalCount, &0_u64);
    }

    // -------------------------------------------------------------------------
    // Whitelist
    // -------------------------------------------------------------------------

    pub fn add_to_whitelist(env: Env, admin: Address, account: Address) {
        access::require_admin(&env, &admin, &DataKey::Admin);

        env.storage()
            .instance()
            .set(&DataKey::Whitelist(account.clone()), &true);

        env.events()
            .publish((WHITELIST_ADD, symbol_short!("addr")), account);
    }

    pub fn remove_from_whitelist(env: Env, admin: Address, account: Address) {
        access::require_admin(&env, &admin, &DataKey::Admin);

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

    // -------------------------------------------------------------------------
    // Blacklist
    // -------------------------------------------------------------------------

    pub fn add_to_blacklist(env: Env, admin: Address, account: Address) {
        access::require_admin(&env, &admin, &DataKey::Admin);

        env.storage()
            .instance()
            .set(&DataKey::Blacklist(account.clone()), &true);

        env.events()
            .publish((BLACKLIST_ADD, symbol_short!("addr")), account);
    }

    pub fn remove_from_blacklist(env: Env, admin: Address, account: Address) {
        access::require_admin(&env, &admin, &DataKey::Admin);

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

    // -------------------------------------------------------------------------
    // Transfer limits (Issue #1015: enforces MAX_TRANSFER_LIMIT upper bound)
    // -------------------------------------------------------------------------

    /// Set a per-account transfer limit.
    ///
    /// # Errors
    /// - Panics with `"Limit must be positive"` if `limit <= 0`.
    /// - Panics with `"Limit exceeds maximum allowed value"` if
    ///   `limit > MAX_TRANSFER_LIMIT`.
    pub fn set_transfer_limit(env: Env, admin: Address, account: Address, limit: i128) {
        access::require_admin(&env, &admin, &DataKey::Admin);
        assert!(limit > 0, "Limit must be positive");
        assert!(
            limit <= MAX_TRANSFER_LIMIT,
            "Limit exceeds maximum allowed value"
        );

        env.storage()
            .instance()
            .set(&DataKey::TransferLimit(account.clone()), &limit);

        env.events()
            .publish((LIMIT_SET, symbol_short!("addr")), (account, limit));
    }

    /// Return the transfer limit for `account`, or `MAX_TRANSFER_LIMIT` if
    /// none has been explicitly set (i.e. no limit applies).
    pub fn get_transfer_limit(env: Env, account: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TransferLimit(account))
            .unwrap_or(MAX_TRANSFER_LIMIT)
    }

    // -------------------------------------------------------------------------
    // Pending approvals (Issue #1015: enforces MAX_PENDING_APPROVALS cap)
    // -------------------------------------------------------------------------

    /// Request approval for a transfer from `from` to `to`.
    ///
    /// # Errors
    /// - Panics with `"Too many pending approvals"` when the global pending-
    ///   approval count would exceed `MAX_PENDING_APPROVALS`.
    pub fn request_transfer_approval(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
    ) {
        from.require_auth();
        assert!(amount > 0, "Amount must be positive");

        // Enforce cap on total pending approvals (Issue #1015)
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::PendingApprovalCount)
            .unwrap_or(0);
        assert!(
            count < MAX_PENDING_APPROVALS,
            "Too many pending approvals"
        );

        // Only increment if this pair is not already pending
        let pair_key = DataKey::PendingApprovals(from.clone(), to.clone());
        let already_pending: bool = env
            .storage()
            .instance()
            .get::<_, bool>(&pair_key)
            .unwrap_or(false);
        if !already_pending {
            env.storage().instance().set(&pair_key, &true);
            env.storage()
                .instance()
                .set(&DataKey::PendingApprovalCount, &(count + 1));
        }

        env.events()
            .publish((APPROVAL_REQ, symbol_short!("xfer")), (from, to, amount));
    }

    /// Admin approval to allow a transfer from `from` to `to`.
    pub fn approve_transfer(env: Env, admin: Address, from: Address, to: Address) {
        access::require_admin(&env, &admin, &DataKey::Admin);

        let pair_key = DataKey::PendingApprovals(from.clone(), to.clone());
        let was_pending: bool = env
            .storage()
            .instance()
            .get::<_, bool>(&pair_key)
            .unwrap_or(false);

        env.storage().instance().remove(&pair_key);

        // Decrement counter if it was actually pending
        if was_pending {
            let count: u64 = env
                .storage()
                .instance()
                .get(&DataKey::PendingApprovalCount)
                .unwrap_or(0);
            if count > 0 {
                env.storage()
                    .instance()
                    .set(&DataKey::PendingApprovalCount, &(count - 1));
            }
        }

        env.events()
            .publish((APPROVAL_REQ, symbol_short!("appr")), (from, to));
    }

    pub fn is_transfer_approved(env: Env, from: Address, to: Address) -> bool {
        env.storage()
            .instance()
            .get::<_, bool>(&DataKey::PendingApprovals(from, to))
            .unwrap_or(true)
    }

    // -------------------------------------------------------------------------
    // Emergency override
    // -------------------------------------------------------------------------

    pub fn activate_emergency_override(env: Env, admin: Address) {
        access::require_admin(&env, &admin, &DataKey::Admin);

        env.storage()
            .instance()
            .set(&DataKey::EmergencyOverride, &true);

        Self::log_restriction_event(env.clone(), admin, symbol_short!("emrg_on"));
        env.events()
            .publish((EMERGENCY, symbol_short!("on")), env.ledger().timestamp());
    }

    pub fn deactivate_emergency_override(env: Env, admin: Address) {
        access::require_admin(&env, &admin, &DataKey::Admin);

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

    // -------------------------------------------------------------------------
    // Transfer checks
    // -------------------------------------------------------------------------

    /// Comprehensive transfer authorization check.
    pub fn can_transfer(env: Env, from: Address, to: Address) -> bool {
        if Self::is_emergency_override_active(env.clone()) {
            return true;
        }

        if Self::is_blacklisted(env.clone(), from.clone())
            || Self::is_blacklisted(env.clone(), to.clone())
        {
            return false;
        }

        let to_whitelisted = Self::is_whitelisted(env.clone(), to.clone());
        let from_whitelisted = Self::is_whitelisted(env.clone(), from.clone());

        if (to_whitelisted || from_whitelisted) && (!to_whitelisted || !from_whitelisted) {
            return false;
        }

        if !Self::is_transfer_approved(env, from, to) {
            return false;
        }

        true
    }

    /// Check if transfer is allowed with a specific amount.
    pub fn can_transfer_amount(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
    ) -> bool {
        if !Self::can_transfer(env.clone(), from.clone(), to) {
            return false;
        }

        let limit = Self::get_transfer_limit(env, from);
        if limit != MAX_TRANSFER_LIMIT && amount > limit {
            return false;
        }

        true
    }

    // -------------------------------------------------------------------------
    // Restriction log (Issue #1015: enforces MAX_LOG_ENTRIES cap)
    // -------------------------------------------------------------------------

    fn log_restriction_event(env: Env, account: Address, action: Symbol) {
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::LogCount)
            .unwrap_or(0);

        // Enforce log entry cap to prevent unbounded storage growth (Issue #1015)
        assert!(id < MAX_LOG_ENTRIES, "Restriction log is full");

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

    /// Return the current number of pending approval pairs.
    pub fn get_pending_approval_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::PendingApprovalCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod tests;
