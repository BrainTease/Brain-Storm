//! Generic Soroban TTL / bump-extension helpers.
//!
//! These helpers wrap the Soroban storage `extend_ttl` APIs so that contracts
//! can consistently bump the time-to-live of instance, persistent and
//! temporary storage entries.
//!
//! # Storage layout
//!
//! **These helpers do not alter the storage layout.** They only extend the
//! TTL of existing entries (or of the instance storage) and never read, write
//! or remove any stored value. Calling them is therefore backward compatible
//! with any existing storage layout and requires no migration.
//!
//! # Defaults
//!
//! The `threshold` and `extend_to` arguments are expressed in ledgers. When
//! callers do not have specific requirements they should use the defaults
//! exported from [`crate::constants`]:
//!
//! - [`crate::constants::TTL_THRESHOLD`]
//! - [`crate::constants::TTL_EXTEND_TO`]
//!
//! # Example
//!
//! ```ignore
//! use shared::ttl::{bump_instance, bump_persistent};
//! use shared::constants::{TTL_THRESHOLD, TTL_EXTEND_TO};
//!
//! // Extend the instance TTL.
//! bump_instance(&env, TTL_THRESHOLD, TTL_EXTEND_TO);
//!
//! // Extend the TTL of a persistent entry.
//! bump_persistent(&env, &DataKey::Config, TTL_THRESHOLD, TTL_EXTEND_TO);
//! ```

use soroban_sdk::{Env, IntoVal, Val};

use crate::constants::{TTL_EXTEND_TO, TTL_THRESHOLD};

/// Extends the TTL of the contract instance storage.
///
/// `threshold` is the minimum remaining TTL (in ledgers) below which the
/// extension is triggered; `extend_to` is the target TTL (in ledgers) that the
/// entry will be bumped to.
///
/// This does not modify any stored value and does not change the storage
/// layout.
pub fn bump_instance(env: &Env, threshold: u32, extend_to: u32) {
    env.storage().instance().extend_ttl(threshold, extend_to);
}

/// Extends the TTL of a persistent storage entry identified by `key`.
///
/// `threshold` is the minimum remaining TTL (in ledgers) below which the
/// extension is triggered; `extend_to` is the target TTL (in ledgers) that the
/// entry will be bumped to.
///
/// This does not modify the stored value and does not change the storage
/// layout.
pub fn bump_persistent<K>(env: &Env, key: &K, threshold: u32, extend_to: u32)
where
    K: IntoVal<Env, Val>,
{
    env.storage()
        .persistent()
        .extend_ttl(key, threshold, extend_to);
}

/// Extends the TTL of a temporary storage entry identified by `key`.
///
/// `threshold` is the minimum remaining TTL (in ledgers) below which the
/// extension is triggered; `extend_to` is the target TTL (in ledgers) that the
/// entry will be bumped to.
///
/// This does not modify the stored value and does not change the storage
/// layout.
pub fn bump_temporary<K>(env: &Env, key: &K, threshold: u32, extend_to: u32)
where
    K: IntoVal<Env, Val>,
{
    env.storage()
        .temporary()
        .extend_ttl(key, threshold, extend_to);
}

/// Storage durability of an entry, used by [`bump_for_key`] to dispatch to the
/// appropriate bump helper.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Durability {
    /// The contract instance storage.
    Instance,
    /// Persistent storage.
    Persistent,
    /// Temporary storage.
    Temporary,
}

/// Dispatches to the appropriate bump helper based on `durability`.
///
/// For [`Durability::Instance`] the `key` is ignored (instance storage has no
/// key) and [`bump_instance`] is called. For [`Durability::Persistent`] and
/// [`Durability::Temporary`] the corresponding keyed helper is called.
///
/// This does not modify any stored value and does not change the storage
/// layout.
pub fn bump_for_key<K>(
    env: &Env,
    durability: Durability,
    key: &K,
    threshold: u32,
    extend_to: u32,
) where
    K: IntoVal<Env, Val>,
{
    match durability {
        Durability::Instance => bump_instance(env, threshold, extend_to),
        Durability::Persistent => bump_persistent(env, key, threshold, extend_to),
        Durability::Temporary => bump_temporary(env, key, threshold, extend_to),
    }
}

/// Convenience wrapper around [`bump_instance`] using the shared default
/// `threshold` and `extend_to` values from [`crate::constants`].
pub fn bump_instance_default(env: &Env) {
    bump_instance(env, TTL_THRESHOLD, TTL_EXTEND_TO);
}

/// Convenience wrapper around [`bump_persistent`] using the shared default
/// `threshold` and `extend_to` values from [`crate::constants`].
pub fn bump_persistent_default<K>(env: &Env, key: &K)
where
    K: IntoVal<Env, Val>,
{
    bump_persistent(env, key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

/// Convenience wrapper around [`bump_temporary`] using the shared default
/// `threshold` and `extend_to` values from [`crate::constants`].
pub fn bump_temporary_default<K>(env: &Env, key: &K)
where
    K: IntoVal<Env, Val>,
{
    bump_temporary(env, key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Ledger;
    use soroban_sdk::{contract, contractimpl, contracttype, Env};

    #[contracttype]
    #[derive(Clone)]
    enum DataKey {
        Persistent,
        Temporary,
    }

    #[contract]
    struct TtlTestContract;

    #[contractimpl]
    impl TtlTestContract {
        pub fn set_persistent(env: Env, value: u32) {
            env.storage()
                .persistent()
                .set(&DataKey::Persistent, &value);
        }

        pub fn set_temporary(env: Env, value: u32) {
            env.storage()
                .temporary()
                .set(&DataKey::Temporary, &value);
        }

        pub fn bump_instance(env: Env, threshold: u32, extend_to: u32) {
            bump_instance(&env, threshold, extend_to);
        }

        pub fn bump_persistent(env: Env, threshold: u32, extend_to: u32) {
            bump_persistent(&env, &DataKey::Persistent, threshold, extend_to);
        }

        pub fn bump_temporary(env: Env, threshold: u32, extend_to: u32) {
            bump_temporary(&env, &DataKey::Temporary, threshold, extend_to);
        }

        pub fn bump_for_key(env: Env, durability: u32, threshold: u32, extend_to: u32) {
            let durability = match durability {
                0 => Durability::Instance,
                1 => Durability::Persistent,
                _ => Durability::Temporary,
            };
            bump_for_key(&env, durability, &DataKey::Persistent, threshold, extend_to);
        }

        pub fn bump_instance_default(env: Env) {
            bump_instance_default(&env);
        }

        pub fn bump_persistent_default(env: Env) {
            bump_persistent_default(&env, &DataKey::Persistent);
        }

        pub fn bump_temporary_default(env: Env) {
            bump_temporary_default(&env, &DataKey::Temporary);
        }
    }

    fn setup() -> (Env, TtlTestContractClient<'static>) {
        let env = Env::default();
        let contract_id = env.register_contract(None, TtlTestContract);
        let client = TtlTestContractClient::new(&env, &contract_id);
        (env, client)
    }

    #[test]
    fn bump_instance_extends_ttl() {
        let (env, client) = setup();
        env.ledger().set(soroban_sdk::testutils::LedgerInfo {
            timestamp: 0,
            protocol_version: 20,
            sequence_number: 1,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 16,
            min_persistent_entry_ttl: 16,
            max_entry_ttl: 1_000_000,
        });

        client.bump_instance(&100, &10_000);

        // The instance TTL should now be at least the requested extension.
        let ttl = env.storage().instance().get_ttl();
        assert!(ttl >= 10_000);
    }

    #[test]
    fn bump_persistent_extends_ttl() {
        let (env, client) = setup();
        env.ledger().set(soroban_sdk::testutils::LedgerInfo {
            timestamp: 0,
            protocol_version: 20,
            sequence_number: 1,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 16,
            min_persistent_entry_ttl: 16,
            max_entry_ttl: 1_000_000,
        });

        client.set_persistent(&42);
        client.bump_persistent(&100, &10_000);

        let ttl = env
            .storage()
            .persistent()
            .get_ttl(&DataKey::Persistent);
        assert!(ttl >= 10_000);
    }

    #[test]
    fn bump_temporary_extends_ttl() {
        let (env, client) = setup();
        env.ledger().set(soroban_sdk::testutils::LedgerInfo {
            timestamp: 0,
            protocol_version: 20,
            sequence_number: 1,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 16,
            min_persistent_entry_ttl: 16,
            max_entry_ttl: 1_000_000,
        });

        client.set_temporary(&7);
        client.bump_temporary(&100, &10_000);

        let ttl = env.storage().temporary().get_ttl(&DataKey::Temporary);
        assert!(ttl >= 10_000);
    }

    #[test]
    fn bump_for_key_dispatches_instance() {
        let (env, client) = setup();
        env.ledger().set(soroban_sdk::testutils::LedgerInfo {
            timestamp: 0,
            protocol_version: 20,
            sequence_number: 1,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 16,
            min_persistent_entry_ttl: 16,
            max_entry_ttl: 1_000_000,
        });

        client.bump_for_key(&0, &100, &10_000);

        let ttl = env.storage().instance().get_ttl();
        assert!(ttl >= 10_000);
    }

    #[test]
    fn bump_for_key_dispatches_persistent() {
        let (env, client) = setup();
        env.ledger().set(soroban_sdk::testutils::LedgerInfo {
            timestamp: 0,
            protocol_version: 20,
            sequence_number: 1,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 16,
            min_persistent_entry_ttl: 16,
            max_entry_ttl: 1_000_000,
        });

        client.set_persistent(&1);
        client.bump_for_key(&1, &100, &10_000);

        let ttl = env
            .storage()
            .persistent()
            .get_ttl(&DataKey::Persistent);
        assert!(ttl >= 10_000);
    }

    #[test]
    fn bump_for_key_dispatches_temporary() {
        let (env, client) = setup();
        env.ledger().set(soroban_sdk::testutils::LedgerInfo {
            timestamp: 0,
            protocol_version: 20,
            sequence_number: 1,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 16,
            min_persistent_entry_ttl: 16,
            max_entry_ttl: 1_000_000,
        });

        client.set_temporary(&1);
        client.bump_for_key(&2, &100, &10_000);

        let ttl = env.storage().temporary().get_ttl(&DataKey::Temporary);
        assert!(ttl >= 10_000);
    }

    #[test]
    fn default_helpers_use_shared_constants() {
        let (env, client) = setup();
        env.ledger().set(soroban_sdk::testutils::LedgerInfo {
            timestamp: 0,
            protocol_version: 20,
            sequence_number: 1,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 16,
            min_persistent_entry_ttl: 16,
            max_entry_ttl: 1_000_000,
        });

        client.set_persistent(&1);
        client.set_temporary(&1);

        client.bump_instance_default();
        client.bump_persistent_default();
        client.bump_temporary_default();

        assert!(env.storage().instance().get_ttl() >= TTL_EXTEND_TO);
        assert!(
            env.storage()
                .persistent()
                .get_ttl(&DataKey::Persistent)
                >= TTL_EXTEND_TO
        );
        assert!(
            env.storage()
                .temporary()
                .get_ttl(&DataKey::Temporary)
                >= TTL_EXTEND_TO
        );
    }
}