#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec};

pub mod math;

#[contracttype]
pub enum Role {
    Admin,
    Instructor,
    Student,
}

#[contracttype]
pub enum DataKey {
    Role(Address),
    Admin,
}

#[contract]
pub struct SharedContract;

#[contractimpl]
impl SharedContract {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Assign a role to an address
    pub fn assign_role(env: Env, caller: Address, target: Address, role: Role) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(caller == admin, "Only admin can assign roles");
        env.storage().instance().set(&DataKey::Role(target), &role);
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
}
