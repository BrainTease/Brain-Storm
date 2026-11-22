#![cfg(test)]
use soroban_sdk::{Address, Env};

use crate::test_helpers::{generate_address, TestContext};
use crate::{Permission, Role, SharedContract, SharedContractClient};

fn setup() -> (Env, Address, SharedContractClient<'static>) {
    let TestContext { env, admin } = TestContext::new();
    let contract_id = env.register_contract(None, SharedContract);
    let client = SharedContractClient::new(&env, &contract_id);
    client.initialize(&admin);
    (env, admin, client)
}

// ── has_role ─────────────────────────────────────────────────────────────────

#[test]
fn test_admin_has_admin_role() {
    let (_, admin, client) = setup();
    assert!(client.has_role(&admin, &Role::Admin));
}

#[test]
fn test_assign_instructor_role() {
    let (env, admin, client) = setup();
    let instructor = generate_address(&env);
    client.assign_role(&admin, &instructor, &Role::Instructor);
    assert!(client.has_role(&instructor, &Role::Instructor));
}

#[test]
fn test_assign_student_role() {
    let (env, admin, client) = setup();
    let student = generate_address(&env);
    client.assign_role(&admin, &student, &Role::Student);
    assert!(client.has_role(&student, &Role::Student));
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_assign_role() {
    let (env, _, client) = setup();
    let rando = generate_address(&env);
    let target = generate_address(&env);
    client.assign_role(&rando, &target, &Role::Instructor);
}

// ── has_permission — Admin ────────────────────────────────────────────────────

#[test]
fn test_admin_has_all_permissions() {
    let (_, admin, client) = setup();
    assert!(client.has_permission(&admin, &Permission::CreateCourse));
    assert!(client.has_permission(&admin, &Permission::EnrollStudent));
    assert!(client.has_permission(&admin, &Permission::IssueCredential));
    assert!(client.has_permission(&admin, &Permission::MintToken));
    assert!(client.has_permission(&admin, &Permission::ManageUsers));
}

// ── has_permission — Instructor ───────────────────────────────────────────────

#[test]
fn test_instructor_permissions() {
    let (env, admin, client) = setup();
    let instructor = generate_address(&env);
    client.assign_role(&admin, &instructor, &Role::Instructor);

    assert!(client.has_permission(&instructor, &Permission::CreateCourse));
    assert!(client.has_permission(&instructor, &Permission::EnrollStudent));
    assert!(!client.has_permission(&instructor, &Permission::IssueCredential));
    assert!(!client.has_permission(&instructor, &Permission::MintToken));
    assert!(!client.has_permission(&instructor, &Permission::ManageUsers));
}

// ── has_permission — Student ──────────────────────────────────────────────────

#[test]
fn test_student_has_no_permissions() {
    let (env, admin, client) = setup();
    let student = generate_address(&env);
    client.assign_role(&admin, &student, &Role::Student);

    assert!(!client.has_permission(&student, &Permission::CreateCourse));
    assert!(!client.has_permission(&student, &Permission::EnrollStudent));
    assert!(!client.has_permission(&student, &Permission::IssueCredential));
    assert!(!client.has_permission(&student, &Permission::MintToken));
    assert!(!client.has_permission(&student, &Permission::ManageUsers));
}

// ── has_permission — unassigned address ──────────────────────────────────────

#[test]
fn test_unassigned_address_has_no_permissions() {
    let (env, _, client) = setup();
    let stranger = generate_address(&env);
    assert!(!client.has_permission(&stranger, &Permission::CreateCourse));
}

// ── upgrade (Issue 4) ─────────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_upgrade() {
    use soroban_sdk::BytesN;
    let (env, _, client) = setup();
    let rando = generate_address(&env);
    let fake_hash = BytesN::from_array(&env, &[0u8; 32]);
    client.upgrade(&rando, &fake_hash);
}

// =============================================================================
// #696 — Auth, boundary, and cross-contract tests
// =============================================================================

// ── double-initialize guard ───────────────────────────────────────────────────

#[test]
#[should_panic]
fn test_double_initialize_rejected() {
    let (_, admin, client) = setup();
    // second initialize should panic
    client.initialize(&admin);
}

// ── assign_role: only admin ───────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_assign_admin_role() {
    let (env, _, client) = setup();
    let rando = generate_address(&env);
    let target = generate_address(&env);
    client.assign_role(&rando, &target, &Role::Admin);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_assign_instructor_role() {
    let (env, _, client) = setup();
    let rando = generate_address(&env);
    let target = generate_address(&env);
    client.assign_role(&rando, &target, &Role::Instructor);
}

// ── has_role: unassigned and wrong-role checks ───────────────────────────────

#[test]
fn test_newly_created_address_has_no_role() {
    let (env, _, client) = setup();
    let stranger = generate_address(&env);
    assert!(!client.has_role(&stranger, &Role::Admin));
    assert!(!client.has_role(&stranger, &Role::Instructor));
    assert!(!client.has_role(&stranger, &Role::Student));
}

#[test]
fn test_instructor_does_not_have_admin_role() {
    let (env, admin, client) = setup();
    let instructor = generate_address(&env);
    client.assign_role(&admin, &instructor, &Role::Instructor);
    assert!(!client.has_role(&instructor, &Role::Admin));
}

// ── permission boundary: each role ───────────────────────────────────────────

#[test]
fn test_student_lacks_all_gated_permissions() {
    let (env, admin, client) = setup();
    let student = generate_address(&env);
    client.assign_role(&admin, &student, &Role::Student);
    assert!(!client.has_permission(&student, &Permission::MintToken));
    assert!(!client.has_permission(&student, &Permission::IssueCredential));
    assert!(!client.has_permission(&student, &Permission::ManageUsers));
    assert!(!client.has_permission(&student, &Permission::CreateCourse));
    assert!(!client.has_permission(&student, &Permission::EnrollStudent));
}

#[test]
fn test_instructor_lacks_privileged_permissions() {
    let (env, admin, client) = setup();
    let instructor = generate_address(&env);
    client.assign_role(&admin, &instructor, &Role::Instructor);
    assert!(!client.has_permission(&instructor, &Permission::IssueCredential));
    assert!(!client.has_permission(&instructor, &Permission::MintToken));
    assert!(!client.has_permission(&instructor, &Permission::ManageUsers));
}

// ── authorize_caller: auth guard ─────────────────────────────────────────────

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_authorize_caller() {
    let (env, _, client) = setup();
    let rando = generate_address(&env);
    let target_contract = generate_address(&env);
    let caller = generate_address(&env);
    client.authorize_caller(&rando, &target_contract, &caller);
}

#[test]
fn test_authorized_caller_is_recognized() {
    let (env, admin, client) = setup();
    let target_contract = generate_address(&env);
    let caller = generate_address(&env);
    client.authorize_caller(&admin, &target_contract, &caller);
    assert!(client.is_caller_authorized(&target_contract, &caller));
}

#[test]
fn test_unauthorized_caller_is_not_recognized() {
    let (env, _, client) = setup();
    let target_contract = generate_address(&env);
    let stranger = generate_address(&env);
    assert!(!client.is_caller_authorized(&target_contract, &stranger));
}

// ── call_contract: unauthorized caller rejected ───────────────────────────────

#[test]
#[should_panic(expected = "Caller not authorized")]
fn test_call_contract_rejects_unauthorized_caller() {
    let (env, _, client) = setup();
    let caller = generate_address(&env);
    let target_contract = generate_address(&env);
    client.call_contract(&caller, &target_contract, &soroban_sdk::symbol_short!("fn"));
}

// ── upgrade: auth guard ───────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_upgrade_contract() {
    use soroban_sdk::BytesN;
    let (env, _, client) = setup();
    let rando = generate_address(&env);
    let hash = BytesN::from_array(&env, &[4u8; 32]);
    client.upgrade(&rando, &hash);
}

// ── schedule_upgrade: auth guard ─────────────────────────────────────────────

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_schedule_upgrade() {
    use soroban_sdk::BytesN;
    let (env, _, client) = setup();
    let rando = generate_address(&env);
    let hash = BytesN::from_array(&env, &[4u8; 32]);
    client.schedule_upgrade(&rando, &hash, &100);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_cancel_upgrade() {
    use soroban_sdk::BytesN;
    let (env, admin, client) = setup();
    // Schedule a real upgrade so the cancel path is reachable
    let hash = BytesN::from_array(&env, &[4u8; 32]);
    client.schedule_upgrade(&admin, &hash, &100);
    // Now try to cancel as a non-admin — should panic
    let rando = generate_address(&env);
    client.cancel_upgrade(&rando);
}

// =============================================================================
// TTL / bump-extension helpers
// =============================================================================

mod ttl_helpers {
    use super::*;
    use crate::ttl::{self, DEFAULT_BUMP_AMOUNT, DEFAULT_THRESHOLD};

    #[test]
    fn test_bump_instance_extends_ttl() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        env.as_contract(&contract_id, || {
            ttl::bump_instance(&env);
            let ttl = env.storage().instance().get_ttl();
            assert!(ttl >= DEFAULT_THRESHOLD);
        });
    }

    #[test]
    fn test_bump_instance_with_custom_values() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        env.as_contract(&contract_id, || {
            ttl::bump_instance_with(&env, 100, 1_000);
            let ttl = env.storage().instance().get_ttl();
            assert!(ttl >= 100);
        });
    }

    #[test]
    fn test_bump_persistent_extends_ttl() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        let key = soroban_sdk::symbol_short!("pkey");
        env.as_contract(&contract_id, || {
            env.storage().persistent().set(&key, &42u32);
            ttl::bump_persistent(&env, &key);
            let ttl = env.storage().persistent().get_ttl(&key);
            assert!(ttl >= DEFAULT_THRESHOLD);
        });
    }

    #[test]
    fn test_bump_persistent_with_custom_values() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        let key = soroban_sdk::symbol_short!("pkey2");
        env.as_contract(&contract_id, || {
            env.storage().persistent().set(&key, &7u32);
            ttl::bump_persistent_with(&env, &key, 200, 2_000);
            let ttl = env.storage().persistent().get_ttl(&key);
            assert!(ttl >= 200);
        });
    }

    #[test]
    fn test_bump_temporary_extends_ttl() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        let key = soroban_sdk::symbol_short!("tkey");
        env.as_contract(&contract_id, || {
            env.storage().temporary().set(&key, &1u32);
            ttl::bump_temporary(&env, &key);
            let ttl = env.storage().temporary().get_ttl(&key);
            assert!(ttl >= DEFAULT_THRESHOLD);
        });
    }

    #[test]
    fn test_bump_temporary_with_custom_values() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        let key = soroban_sdk::symbol_short!("tkey2");
        env.as_contract(&contract_id, || {
            env.storage().temporary().set(&key, &1u32);
            ttl::bump_temporary_with(&env, &key, 50, 500);
            let ttl = env.storage().temporary().get_ttl(&key);
            assert!(ttl >= 50);
        });
    }

    #[test]
    fn test_bump_persistent_missing_entry_is_noop() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        let key = soroban_sdk::symbol_short!("absent");
        env.as_contract(&contract_id, || {
            // Must not panic when the entry does not exist.
            ttl::bump_persistent(&env, &key);
            assert!(!env.storage().persistent().has(&key));
        });
    }

    #[test]
    fn test_bump_temporary_missing_entry_is_noop() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        let key = soroban_sdk::symbol_short!("absent2");
        env.as_contract(&contract_id, || {
            ttl::bump_temporary(&env, &key);
            assert!(!env.storage().temporary().has(&key));
        });
    }

    #[test]
    fn test_bump_persistent_fresh_entry_is_noop() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        let key = soroban_sdk::symbol_short!("fresh");
        env.as_contract(&contract_id, || {
            env.storage().persistent().set(&key, &1u32);
            let before = env.storage().persistent().get_ttl(&key);
            // A freshly written entry already has the maximum TTL, so the
            // helper should leave it untouched.
            ttl::bump_persistent(&env, &key);
            let after = env.storage().persistent().get_ttl(&key);
            assert_eq!(before, after);
        });
    }

    #[test]
    fn test_bump_instance_fresh_is_noop() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        env.as_contract(&contract_id, || {
            let before = env.storage().instance().get_ttl();
            ttl::bump_instance(&env);
            let after = env.storage().instance().get_ttl();
            assert_eq!(before, after);
        });
    }

    #[test]
    fn test_default_constants_are_sane() {
        assert!(DEFAULT_THRESHOLD > 0);
        assert!(DEFAULT_BUMP_AMOUNT >= DEFAULT_THRESHOLD);
    }
}

// =============================================================================
// Reentrancy guard
// =============================================================================

mod reentrancy_guard {
    use super::*;
    use crate::reentrancy::ReentrancyGuard;

    #[test]
    fn test_guard_acquire_and_release() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        env.as_contract(&contract_id, || {
            let guard = ReentrancyGuard::new(&env);
            assert!(!guard.is_locked());
            guard.acquire();
            assert!(guard.is_locked());
            guard.release();
            assert!(!guard.is_locked());
        });
    }

    #[test]
    fn test_guard_reentrant_acquire_panics() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        env.as_contract(&contract_id, || {
            let guard = ReentrancyGuard::new(&env);
            guard.acquire();
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                guard.acquire();
            }));
            assert!(result.is_err());
        });
    }

    #[test]
    fn test_guard_release_without_acquire_is_noop() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        env.as_contract(&contract_id, || {
            let guard = ReentrancyGuard::new(&env);
            guard.release();
            assert!(!guard.is_locked());
        });
    }

    #[test]
    fn test_guard_scope_releases_on_drop() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        env.as_contract(&contract_id, || {
            let guard = ReentrancyGuard::new(&env);
            {
                let _scope = guard.enter();
                assert!(guard.is_locked());
            }
            assert!(!guard.is_locked());
        });
    }

    #[test]
    fn test_guard_scope_releases_on_panic() {
        let TestContext { env, .. } = TestContext::new();
        let contract_id = env.register_contract(None, SharedContract);
        env.as_contract(&contract_id, || {
            let guard = ReentrancyGuard::new(&env);
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let _scope = guard.enter();
                panic!("boom");
            }));
            assert!(result.is_err());
            assert!(!guard.is_locked());
        });
    }
}
