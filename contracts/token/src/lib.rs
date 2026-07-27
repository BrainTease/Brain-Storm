#![no_std]
use brain_storm_shared::math::{checked_add_i128, checked_sub_i128};
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

#[contracttype]
pub struct AllowanceDataKey {
    pub from: Address,
    pub spender: Address,
}

#[contracttype]
pub struct AllowanceValue {
    pub amount: i128,
    pub expiration_ledger: u32,
}

#[contracttype]
pub enum DataKey {
    Balance(Address),
    Allowance(AllowanceDataKey),
    Admin,
    Name,
    Symbol,
    Decimals,
}

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    /// Initialize the token with an admin address and SEP-41 metadata
    pub fn initialize(env: Env, admin: Address, name: String, symbol: String, decimals: u32) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::Decimals, &decimals);
    }

    /// Mint reward tokens to a student upon course completion (admin-only)
    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        assert!(amount > 0, "Amount must be positive");

        let balance = Self::balance(env.clone(), to.clone());
        env.storage()
            .instance()
            .set(&DataKey::Balance(to), &checked_add_i128(balance, amount));
    }

    /// Get the balance of an address
    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    /// Transfer tokens from the caller to another address
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        Self::spend_balance(&env, from, amount);
        Self::receive_balance(&env, to, amount);
    }

    /// Transfer tokens on behalf of `from`, spending the caller's allowance
    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        Self::spend_allowance(&env, from.clone(), spender, amount);
        Self::spend_balance(&env, from, amount);
        Self::receive_balance(&env, to, amount);
    }

    /// Burn tokens from the caller's balance
    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        Self::spend_balance(&env, from, amount);
    }

    /// Burn tokens from `from`'s balance, spending the caller's allowance
    pub fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        spender.require_auth();
        Self::spend_allowance(&env, from.clone(), spender, amount);
        Self::spend_balance(&env, from, amount);
    }

    /// Set the amount of tokens `spender` may transfer on behalf of `from`
    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();
        assert!(amount >= 0, "Amount must be non-negative");
        if amount > 0 {
            assert!(
                expiration_ledger >= env.ledger().sequence(),
                "Expiration ledger must not be in the past"
            );
        }

        let key = DataKey::Allowance(AllowanceDataKey { from, spender });
        env.storage().instance().set(
            &key,
            &AllowanceValue {
                amount,
                expiration_ledger,
            },
        );
    }

    /// Get the amount `spender` may transfer on behalf of `from`
    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        Self::read_allowance(&env, from, spender).amount
    }

    pub fn decimals(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Decimals).unwrap()
    }

    pub fn name(env: Env) -> String {
        env.storage().instance().get(&DataKey::Name).unwrap()
    }

    pub fn symbol(env: Env) -> String {
        env.storage().instance().get(&DataKey::Symbol).unwrap()
    }
}

// Internal helpers, kept out of the #[contractimpl] block since they are
// not part of the contract's exported interface.
impl TokenContract {
    fn read_allowance(env: &Env, from: Address, spender: Address) -> AllowanceValue {
        let key = DataKey::Allowance(AllowanceDataKey { from, spender });
        let stored: Option<AllowanceValue> = env.storage().instance().get(&key);
        match stored {
            Some(allowance) if allowance.expiration_ledger >= env.ledger().sequence() => allowance,
            _ => AllowanceValue {
                amount: 0,
                expiration_ledger: 0,
            },
        }
    }

    fn spend_allowance(env: &Env, from: Address, spender: Address, amount: i128) {
        let allowance = Self::read_allowance(env, from.clone(), spender.clone());
        assert!(allowance.amount >= amount, "Insufficient allowance");

        let key = DataKey::Allowance(AllowanceDataKey { from, spender });
        env.storage().instance().set(
            &key,
            &AllowanceValue {
                amount: checked_sub_i128(allowance.amount, amount),
                expiration_ledger: allowance.expiration_ledger,
            },
        );
    }

    fn spend_balance(env: &Env, addr: Address, amount: i128) {
        assert!(amount > 0, "Amount must be positive");
        let balance = Self::balance(env.clone(), addr.clone());
        assert!(balance >= amount, "Insufficient balance");
        env.storage()
            .instance()
            .set(&DataKey::Balance(addr), &checked_sub_i128(balance, amount));
    }

    fn receive_balance(env: &Env, addr: Address, amount: i128) {
        let balance = Self::balance(env.clone(), addr.clone());
        env.storage()
            .instance()
            .set(&DataKey::Balance(addr), &checked_add_i128(balance, amount));
    }
}
