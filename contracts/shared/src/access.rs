//! Common access-control checks shared across contracts (issue #825).
//!
//! Before this module every contract hand-rolled the same three lines:
//!
//! ```ignore
//! admin.require_auth();
//! let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
//! assert!(admin == stored_admin, "Only admin can do the thing");
//! ```
//!
//! The storage *key* differs per contract (each has its own `DataKey` enum), so
//! these helpers take the key as a generic parameter rather than assuming one.
//! That keeps the storage slot explicit at the call site while the auth check,
//! the missing-admin case, and the panic message live in exactly one place:
//!
//! ```ignore
//! access::require_admin(&env, &admin, &DataKey::Admin);
//! ```
//!
//! Panic messages are string literals rather than named constants on purpose:
//! `assert!(cond, LITERAL)` compiles to a static-string panic, whereas
//! `assert!(cond, "{}", SOME_CONST)` drags `core::fmt` into the contract wasm.
//! Each message is documented on the function that raises it.

use soroban_sdk::{Address, Env, IntoVal, Val};

/// Reads the `Address` stored at `key` in instance storage.
///
/// Panics with `"Not initialized"` if the slot is empty, which is a clearer
/// failure than the bare `.unwrap()` this replaces.
pub fn read_authority<K>(env: &Env, key: &K) -> Address
where
    K: IntoVal<Env, Val>,
{
    env.storage().instance().get(key).expect("Not initialized")
}

/// Returns whether `caller` is the admin stored at `admin_key`.
///
/// Pure predicate: it neither requires auth nor panics on a mismatch. Use it to
/// build a compound check; use [`require_admin`] to gate an entry point.
///
/// Panics with `"Not initialized"` if the admin slot is empty.
pub fn is_admin<K>(env: &Env, caller: &Address, admin_key: &K) -> bool
where
    K: IntoVal<Env, Val>,
{
    *caller == read_authority(env, admin_key)
}

/// Requires that `caller` authorized this invocation and is the stored admin.
///
/// Panics with `"Unauthorized: admin required"` otherwise.
pub fn require_admin<K>(env: &Env, caller: &Address, admin_key: &K)
where
    K: IntoVal<Env, Val>,
{
    caller.require_auth();
    assert!(
        is_admin(env, caller, admin_key),
        "Unauthorized: admin required"
    );
}

/// Requires that `caller` authorized this invocation and is the address held in
/// a non-admin authority slot — a dispute arbiter, an oracle, a fee collector.
///
/// Panics with `"Unauthorized: authority required"` otherwise.
pub fn require_authority<K>(env: &Env, caller: &Address, authority_key: &K)
where
    K: IntoVal<Env, Val>,
{
    caller.require_auth();
    assert!(
        *caller == read_authority(env, authority_key),
        "Unauthorized: authority required"
    );
}

/// Requires that `caller` authorized this invocation and is either the stored
/// admin or `permitted` — e.g. an escrow that both its payer and the admin may
/// cancel.
///
/// Panics with `"Unauthorized: admin or permitted caller required"` otherwise.
pub fn require_admin_or<K>(env: &Env, caller: &Address, admin_key: &K, permitted: &Address)
where
    K: IntoVal<Env, Val>,
{
    caller.require_auth();
    assert!(
        caller == permitted || is_admin(env, caller, admin_key),
        "Unauthorized: admin or permitted caller required"
    );
}

/// Requires that `caller` authorized this invocation and owns the resource.
///
/// `owner` is read by the caller from whatever per-resource key the contract
/// uses (`DataKey::NFTOwner(id)`, a listing's `seller`, ...), so this helper
/// covers only the auth-and-compare half.
///
/// Panics with `"Unauthorized: owner required"` otherwise.
pub fn require_owner(caller: &Address, owner: &Address) {
    caller.require_auth();
    assert!(caller == owner, "Unauthorized: owner required");
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{contract, contractimpl, contracttype, testutils::Address as _};

    #[contracttype]
    enum TestKey {
        Admin,
        Arbiter,
    }

    /// Thin wrapper contract so the helpers are exercised through a real
    /// invocation frame — `require_auth` needs one.
    #[contract]
    struct AccessTestContract;

    #[contractimpl]
    impl AccessTestContract {
        pub fn init(env: Env, admin: Address) {
            env.storage().instance().set(&TestKey::Admin, &admin);
        }

        pub fn set_arbiter(env: Env, arbiter: Address) {
            env.storage().instance().set(&TestKey::Arbiter, &arbiter);
        }

        pub fn admin_only(env: Env, caller: Address) {
            require_admin(&env, &caller, &TestKey::Admin);
        }

        pub fn arbiter_only(env: Env, caller: Address) {
            require_authority(&env, &caller, &TestKey::Arbiter);
        }

        pub fn admin_or(env: Env, caller: Address, permitted: Address) {
            require_admin_or(&env, &caller, &TestKey::Admin, &permitted);
        }

        pub fn owner_only(_env: Env, caller: Address, owner: Address) {
            require_owner(&caller, &owner);
        }

        pub fn check_is_admin(env: Env, caller: Address) -> bool {
            is_admin(&env, &caller, &TestKey::Admin)
        }

        pub fn read_admin(env: Env) -> Address {
            read_authority(&env, &TestKey::Admin)
        }
    }

    fn setup() -> (Env, AccessTestContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, AccessTestContract);
        let client = AccessTestContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.init(&admin);
        (env, client, admin)
    }

    #[test]
    fn admin_passes_require_admin() {
        let (_, client, admin) = setup();
        client.admin_only(&admin);
        assert!(client.check_is_admin(&admin));
        assert_eq!(client.read_admin(), admin);
    }

    #[test]
    #[should_panic(expected = "Unauthorized: admin required")]
    fn non_admin_fails_require_admin() {
        let (env, client, _) = setup();
        let intruder = Address::generate(&env);
        client.admin_only(&intruder);
    }

    #[test]
    fn is_admin_is_false_for_other_address() {
        let (env, client, _) = setup();
        let other = Address::generate(&env);
        assert!(!client.check_is_admin(&other));
    }

    #[test]
    #[should_panic(expected = "Not initialized")]
    fn empty_slot_reports_not_initialized() {
        let (_, client, admin) = setup();
        // The `Arbiter` slot was never written.
        client.arbiter_only(&admin);
    }

    #[test]
    fn authority_slot_is_checked_independently_of_admin() {
        let (env, client, _) = setup();
        let arbiter = Address::generate(&env);
        client.set_arbiter(&arbiter);
        client.arbiter_only(&arbiter);
        // Holding the arbiter slot does not make an address the admin.
        assert!(!client.check_is_admin(&arbiter));
    }

    #[test]
    #[should_panic(expected = "Unauthorized: authority required")]
    fn admin_is_not_automatically_the_authority() {
        let (env, client, admin) = setup();
        let arbiter = Address::generate(&env);
        client.set_arbiter(&arbiter);
        client.arbiter_only(&admin);
    }

    #[test]
    fn require_admin_or_accepts_both_parties() {
        let (env, client, admin) = setup();
        let payer = Address::generate(&env);
        client.admin_or(&admin, &payer);
        client.admin_or(&payer, &payer);
    }

    #[test]
    #[should_panic(expected = "Unauthorized: admin or permitted caller required")]
    fn require_admin_or_rejects_third_party() {
        let (env, client, _) = setup();
        let payer = Address::generate(&env);
        let intruder = Address::generate(&env);
        client.admin_or(&intruder, &payer);
    }

    #[test]
    fn require_owner_accepts_owner() {
        let (env, client, _) = setup();
        let owner = Address::generate(&env);
        client.owner_only(&owner, &owner);
    }

    #[test]
    #[should_panic(expected = "Unauthorized: owner required")]
    fn require_owner_rejects_non_owner() {
        let (env, client, _) = setup();
        let owner = Address::generate(&env);
        let intruder = Address::generate(&env);
        client.owner_only(&intruder, &owner);
    }
}
