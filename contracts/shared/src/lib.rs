#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, Symbol};

pub mod pausable;

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum Role {
    Admin,
    Instructor,
    Student,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum Permission {
    CreateCourse,
    EnrollStudent,
    IssueCredential,
    MintToken,
    ManageUsers,
}

#[contracttype]
#[derive(Clone)]
pub struct CrossContractCallRecord {
    pub id: u64,
    pub caller: Address,
    pub target_contract: Address,
    pub method: Symbol,
    pub status: Symbol,                  // "pending", "success", "failed"
    pub created_at: u64,
    pub executed_at: u64,
}

#[contracttype]
pub enum DataKey {
    Role(Address),
    Admin,
    CrossContractCall(u64),              // id → CrossContractCallRecord
    NextCallId,                          // u64 counter
    AuthorizedCallers(Address),          // contract → Vec<Address> (authorized callers)
}

#[contract]
pub struct SharedContract;

/// Returns true if `role` grants `permission`.
fn role_has_permission(role: &Role, permission: &Permission) -> bool {
    match role {
        Role::Admin => true, // Admin has all permissions
        Role::Instructor => matches!(
            permission,
            Permission::CreateCourse | Permission::EnrollStudent
        ),
        Role::Student => false,
    }
}

#[contractimpl]
impl SharedContract {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Role(admin.clone()), &Role::Admin);
    }

    /// Assign a role to an address (admin only). Emits ("rbac", "role_assigned").
    pub fn assign_role(env: Env, caller: Address, target: Address, role: Role) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(caller == admin, "Only admin can assign roles");
        env.storage()
            .instance()
            .set(&DataKey::Role(target.clone()), &role);

        env.events().publish(
            (symbol_short!("rbac"), symbol_short!("role_asgn")),
            (target, role),
        );
    }

    /// Check if an address has a specific role
    pub fn has_role(env: Env, addr: Address, role: Role) -> bool {
        let stored: Option<Role> = env.storage().instance().get(&DataKey::Role(addr));
        match (stored, role) {
            (Some(Role::Admin), Role::Admin) => true,
            (Some(Role::Instructor), Role::Instructor) => true,
            (Some(Role::Student), Role::Student) => true,
            _ => false,
        }
    }

    /// Check if an address has a specific permission based on its assigned role
    pub fn has_permission(env: Env, addr: Address, permission: Permission) -> bool {
        let stored: Option<Role> = env.storage().instance().get(&DataKey::Role(addr));
        match stored {
            Some(role) => role_has_permission(&role, &permission),
            None => false,
        }
    }

    /// Upgrade the contract wasm (admin only). Emits ("shared", "upgraded").
    pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can upgrade");

        env.events().publish(
            (symbol_short!("shared"), symbol_short!("upgraded")),
            new_wasm_hash.clone(),
        );

        env.deployer()
            .update_current_contract_wasm(new_wasm_hash);
    }

    // -------------------------------------------------------------------------
    // Cross-Contract Communication
    // -------------------------------------------------------------------------

    pub fn authorize_caller(
        env: Env,
        admin: Address,
        target_contract: Address,
        caller: Address,
    ) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can authorize");

        let key = DataKey::AuthorizedCallers(target_contract.clone());
        let mut callers: soroban_sdk::Vec<Address> = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| soroban_sdk::vec![&env]);

        if !callers.contains(&caller) {
            callers.push_back(caller.clone());
            env.storage().instance().set(&key, &callers);
        }

        env.events().publish(
            (symbol_short!("shared"), symbol_short!("auth_call")),
            (target_contract, caller),
        );
    }

    pub fn is_caller_authorized(
        env: Env,
        target_contract: Address,
        caller: Address,
    ) -> bool {
        let key = DataKey::AuthorizedCallers(target_contract);
        let callers: Option<soroban_sdk::Vec<Address>> = env.storage().instance().get(&key);
        match callers {
            Some(c) => c.contains(&caller),
            None => false,
        }
    }

    pub fn call_contract(
        env: Env,
        caller: Address,
        target_contract: Address,
        method: Symbol,
    ) -> u64 {
        caller.require_auth();

        // Check authorization
        assert!(
            Self::is_caller_authorized(env.clone(), target_contract.clone(), caller.clone()),
            "Caller not authorized"
        );

        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextCallId)
            .unwrap_or(1);

        let call_record = CrossContractCallRecord {
            id,
            caller: caller.clone(),
            target_contract: target_contract.clone(),
            method: method.clone(),
            status: symbol_short!("pending"),
            created_at: env.ledger().timestamp(),
            executed_at: 0,
        };

        env.storage()
            .instance()
            .set(&DataKey::CrossContractCall(id), &call_record);
        env.storage()
            .instance()
            .set(&DataKey::NextCallId, &(id + 1));

        env.events().publish(
            (symbol_short!("shared"), symbol_short!("call_init")),
            (id, target_contract, method),
        );

        id
    }

    pub fn get_call_record(env: Env, call_id: u64) -> Option<CrossContractCallRecord> {
        env.storage()
            .instance()
            .get(&DataKey::CrossContractCall(call_id))
    }

    pub fn relay_event(
        env: Env,
        caller: Address,
        source_contract: Address,
        event_topic: Symbol,
    ) {
        caller.require_auth();

        // Check authorization
        assert!(
            Self::is_caller_authorized(env.clone(), source_contract.clone(), caller.clone()),
            "Caller not authorized"
        );

        env.events().publish(
            (symbol_short!("shared"), symbol_short!("relay")),
            (source_contract, event_topic),
        );
    }

    // -------------------------------------------------------------------------
    // Reentrancy Guard
    // -------------------------------------------------------------------------

    pub fn acquire_reentrancy_lock(env: Env) {
        reentrancy::acquire_lock(&env);
    }

    pub fn release_reentrancy_lock(env: Env) {
        reentrancy::release_lock(&env);
    }

    pub fn is_reentrancy_locked(env: Env) -> bool {
        reentrancy::is_locked(&env)
    }

    // -------------------------------------------------------------------------
    // Common Validation
    // -------------------------------------------------------------------------

    pub fn validate_positive_amount(env: Env, amount: i128) {
        let _ = env;
        validation::require_positive_amount(amount);
    }

    pub fn validate_percentage(env: Env, pct: u32) {
        let _ = env;
        validation::require_percentage_valid(pct);
    }

    pub fn validate_percentages_sum(env: Env, a: u32, b: u32, c: u32) {
        let _ = env;
        validation::require_percentages_sum_100(a, b, c);
    }

    pub fn validate_future_timestamp(env: Env, ts: u64) {
        validation::require_future_timestamp(&env, ts);
    }

    // -------------------------------------------------------------------------
    // Emergency Pause
    // -------------------------------------------------------------------------

    pub fn pause_contract(env: Env, admin: Address, auto_unpause_ledgers: u32) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can pause");
        pausable::pause(&env, &admin, auto_unpause_ledgers);
    }

    pub fn unpause_contract(env: Env, admin: Address) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can unpause");
        pausable::unpause(&env, &admin);
    }

    pub fn is_contract_paused(env: Env) -> bool {
        pausable::is_paused(&env)
    }

    pub fn get_pause_state(env: Env) -> pausable::PauseState {
        pausable::get_pause_state(&env)
    }

    // -------------------------------------------------------------------------
    // Upgrade mechanism (issue #481)
    // -------------------------------------------------------------------------

    /// Schedule a WASM upgrade with a timelock delay (admin only).
    pub fn schedule_upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>, timelock_ledgers: u32) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can schedule upgrades");
        upgrade::schedule_upgrade(&env, &admin, new_wasm_hash, timelock_ledgers);
    }

    /// Execute a previously scheduled upgrade once its timelock has expired (admin only).
    pub fn execute_upgrade(env: Env, admin: Address) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can execute upgrades");
        upgrade::execute_upgrade(&env, &admin);
    }

    /// Cancel a pending upgrade before it executes (admin only).
    pub fn cancel_upgrade(env: Env, admin: Address) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can cancel upgrades");
        upgrade::cancel_upgrade(&env, &admin);
    }

    /// Returns the pending upgrade details, if any.
    pub fn get_pending_upgrade(env: Env) -> Option<upgrade::ScheduledUpgrade> {
        upgrade::get_pending_upgrade(&env)
    }

    /// Returns the number of completed upgrades (for audit trail).
    pub fn get_upgrade_count(env: Env) -> u32 {
        upgrade::get_upgrade_count(&env)
    }

    /// Returns a specific upgrade history entry by index.
    pub fn get_upgrade_record(env: Env, index: u32) -> Option<upgrade::UpgradeRecord> {
        upgrade::get_upgrade_record(&env, index)
    }
}

pub mod multisig;
pub mod upgrade;

mod tests;
