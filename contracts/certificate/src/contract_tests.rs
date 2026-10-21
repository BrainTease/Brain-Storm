//! Contract test suite for `certificate`.
//!
//! Split out of `lib.rs` (issue #1324).

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{symbol_short, Env};

fn setup() -> (Env, CertificateContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

#[test]
fn test_initialize_sets_admin() {
    let (_, client, admin) = setup();
    assert_eq!(client.get_admin(), admin);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialize_panics() {
    let (_, client, admin) = setup();
    client.initialize(&admin);
}

#[test]
fn test_mint_certificate() {
    let (env, client, admin) = setup();
    let recipient = Address::generate(&env);
    let course = symbol_short!("RUST101");
    let url = String::from_str(&env, "https://example.com/cert/1");

    let id = client.mint_certificate(&admin, &recipient, &course, &url);
    assert_eq!(id, 1);

    let cert = client.get_certificate(&id).unwrap();
    assert_eq!(cert.owner, recipient);
    assert_eq!(cert.course_id, course);
    assert_eq!(cert.id, 1);
}

#[test]
fn test_mint_increments_id() {
    let (env, client, admin) = setup();
    let recipient = Address::generate(&env);
    let course = symbol_short!("RUST101");
    let url = String::from_str(&env, "https://example.com/cert");

    let id1 = client.mint_certificate(&admin, &recipient, &course, &url);
    let id2 = client.mint_certificate(&admin, &recipient, &course, &url);
    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_mint() {
    let (env, client, _) = setup();
    let rando = Address::generate(&env);
    let recipient = Address::generate(&env);
    let course = symbol_short!("RUST101");
    let url = String::from_str(&env, "https://example.com/cert");
    client.mint_certificate(&rando, &recipient, &course, &url);
}

#[test]
fn test_get_certificates_by_owner() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    let course1 = symbol_short!("RUST101");
    let course2 = symbol_short!("SOL201");
    let url = String::from_str(&env, "https://example.com/cert");

    client.mint_certificate(&admin, &owner, &course1, &url);
    client.mint_certificate(&admin, &owner, &course2, &url);

    let certs = client.get_certificates_by_owner(&owner);
    assert_eq!(certs.len(), 2);
    assert_eq!(certs.get(0).unwrap().course_id, course1);
    assert_eq!(certs.get(1).unwrap().course_id, course2);
}

#[test]
fn test_get_certificates_by_owner_empty() {
    let (env, client, _) = setup();
    let owner = Address::generate(&env);
    let certs = client.get_certificates_by_owner(&owner);
    assert_eq!(certs.len(), 0);
}

#[test]
#[should_panic(expected = "Certificate is soulbound and cannot be transferred")]
fn test_transfer_panics() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    let other = Address::generate(&env);
    let course = symbol_short!("RUST101");
    let url = String::from_str(&env, "https://example.com/cert");

    let id = client.mint_certificate(&admin, &owner, &course, &url);
    client.transfer(&owner, &other, &id);
}

#[test]
fn test_revoke_certificate() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    let course = symbol_short!("RUST101");
    let url = String::from_str(&env, "https://example.com/cert");
    let reason = String::from_str(&env, "Academic misconduct");

    let id = client.mint_certificate(&admin, &owner, &course, &url);
    assert!(!client.is_revoked(&id));

    client.revoke_certificate(&admin, &id, &reason);
    assert!(client.is_revoked(&id));

    let revocation = client.get_revocation(&id).unwrap();
    assert_eq!(revocation.certificate_id, id);
    assert_eq!(revocation.reason, reason);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_revoke() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    let rando = Address::generate(&env);
    let course = symbol_short!("RUST101");
    let url = String::from_str(&env, "https://example.com/cert");
    let reason = String::from_str(&env, "Test");

    let id = client.mint_certificate(&admin, &owner, &course, &url);
    client.revoke_certificate(&rando, &id, &reason);
}

#[test]
#[should_panic(expected = "Certificate not found")]
fn test_revoke_nonexistent_certificate_panics() {
    let (env, client, admin) = setup();
    let reason = String::from_str(&env, "Test");
    client.revoke_certificate(&admin, &999, &reason);
}

#[test]
#[should_panic(expected = "Certificate already revoked")]
fn test_revoke_twice_panics() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    let course = symbol_short!("RUST101");
    let url = String::from_str(&env, "https://example.com/cert");
    let reason = String::from_str(&env, "Test");

    let id = client.mint_certificate(&admin, &owner, &course, &url);
    client.revoke_certificate(&admin, &id, &reason);
    client.revoke_certificate(&admin, &id, &reason);
}
