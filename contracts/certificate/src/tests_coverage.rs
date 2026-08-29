// Issue #1017 – Additional coverage tests for the certificate contract.
// Covers paths not exercised by tests_ext.rs:
//   - double-initialize guard
//   - revoke already-revoked certificate
//   - is_valid with expired metadata
//   - is_valid with active metadata
//   - set_metadata / get_metadata edge cases
//   - count_certificates
//   - transfer by non-owner panics
//   - get_certificates_by_owner returns empty list for unknown owner
//   - revoke non-existent certificate panics
//   - mint increments certificate counter correctly

#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, symbol_short, Env, String};

fn setup() -> (Env, CertificateContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register_contract(None, CertificateContract);
    let client = CertificateContractClient::new(&env, &id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

fn mint_one(env: &Env, client: &CertificateContractClient, admin: &Address) -> (Address, u64) {
    let owner = Address::generate(env);
    let course = symbol_short!("RUST101");
    let url = String::from_str(env, "https://example.com/cert");
    let id = client.mint_certificate(admin, &owner, &course, &url);
    (owner, id)
}

// ── Initialization guards ────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialize_panics() {
    let (_, client, admin) = setup();
    client.initialize(&admin);
}

// ── Non-admin cannot mint ────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_mint() {
    let (env, client, _) = setup();
    let rando = Address::generate(&env);
    let owner = Address::generate(&env);
    let course = symbol_short!("RUST101");
    let url = String::from_str(&env, "https://example.com/cert");
    client.mint_certificate(&rando, &owner, &course, &url);
}

// ── Certificate IDs are sequential ──────────────────────────────────────────

#[test]
fn test_certificate_ids_are_sequential() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    let course = symbol_short!("RUST101");
    let url = String::from_str(&env, "https://example.com/cert");

    let id1 = client.mint_certificate(&admin, &owner, &course, &url);
    let id2 = client.mint_certificate(&admin, &owner, &course, &url);
    let id3 = client.mint_certificate(&admin, &owner, &course, &url);

    assert!(id2 > id1);
    assert!(id3 > id2);
}

// ── Revoke already-revoked certificate ───────────────────────────────────────

#[test]
#[should_panic(expected = "Certificate already revoked")]
fn test_revoke_already_revoked_panics() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);
    let reason = String::from_str(&env, "fraud");
    client.revoke_certificate(&admin, &cert_id, &reason);
    client.revoke_certificate(&admin, &cert_id, &reason);
}

// ── Revoke non-existent certificate ─────────────────────────────────────────

#[test]
#[should_panic(expected = "Certificate not found")]
fn test_revoke_nonexistent_certificate_panics() {
    let (env, client, admin) = setup();
    let reason = String::from_str(&env, "fraud");
    client.revoke_certificate(&admin, &9999, &reason);
}

// ── Non-admin cannot revoke ──────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_revoke() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);
    let rando = Address::generate(&env);
    let reason = String::from_str(&env, "fraud");
    client.revoke_certificate(&rando, &cert_id, &reason);
}

// ── is_valid ─────────────────────────────────────────────────────────────────

#[test]
fn test_is_valid_returns_true_for_fresh_cert() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);
    assert!(client.is_valid(&cert_id));
}

#[test]
fn test_is_valid_returns_false_for_revoked_cert() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);
    let reason = String::from_str(&env, "fraud");
    client.revoke_certificate(&admin, &cert_id, &reason);
    assert!(!client.is_valid(&cert_id));
}

#[test]
fn test_is_valid_returns_false_for_nonexistent_cert() {
    let (_, client, _) = setup();
    assert!(!client.is_valid(&9999));
}

// ── set_metadata / get_metadata ──────────────────────────────────────────────

#[test]
fn test_set_and_get_metadata_round_trips() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);

    let issuer = String::from_str(&env, "Brain-Storm Academy");
    let skills = String::from_str(&env, "Rust,Soroban");
    let grade = String::from_str(&env, "A");

    client.set_metadata(&admin, &cert_id, &issuer, &skills, &grade, &0);

    let meta = client.get_metadata(&cert_id).unwrap();
    assert_eq!(meta.certificate_id, cert_id);
    assert_eq!(meta.grade, grade);
}

#[test]
fn test_get_metadata_returns_none_when_not_set() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);
    assert!(client.get_metadata(&cert_id).is_none());
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_set_metadata() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);
    let rando = Address::generate(&env);
    let issuer = String::from_str(&env, "Fake");
    let skills = String::from_str(&env, "None");
    let grade = String::from_str(&env, "F");
    client.set_metadata(&rando, &cert_id, &issuer, &skills, &grade, &0);
}

// ── Expired certificate ───────────────────────────────────────────────────────

#[test]
fn test_is_valid_returns_false_when_expired() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);

    let issuer = String::from_str(&env, "Brain-Storm Academy");
    let skills = String::from_str(&env, "Rust");
    let grade = String::from_str(&env, "A");

    // Set expiry in the past (timestamp 1 = long ago)
    client.set_metadata(&admin, &cert_id, &issuer, &skills, &grade, &1);

    // Advance the ledger time past the expiry timestamp
    env.ledger().with_mut(|l| l.timestamp = 1_000_000);

    assert!(!client.is_valid(&cert_id));
}

#[test]
fn test_is_valid_returns_true_when_expiry_is_zero() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);

    let issuer = String::from_str(&env, "Brain-Storm Academy");
    let skills = String::from_str(&env, "Rust");
    let grade = String::from_str(&env, "A");

    // 0 means no expiry
    client.set_metadata(&admin, &cert_id, &issuer, &skills, &grade, &0);

    env.ledger().with_mut(|l| l.timestamp = 9_999_999_999);
    assert!(client.is_valid(&cert_id));
}

// ── get_certificates_by_owner ─────────────────────────────────────────────────

#[test]
fn test_get_certificates_by_owner_returns_empty_for_unknown_owner() {
    let (env, client, _) = setup();
    let unknown = Address::generate(&env);
    let certs = client.get_certificates_by_owner(&unknown);
    assert_eq!(certs.len(), 0);
}

#[test]
fn test_get_certificates_by_owner_returns_multiple_certs() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    let course = symbol_short!("RUST101");
    let url = String::from_str(&env, "https://example.com/cert");

    let id1 = client.mint_certificate(&admin, &owner, &course, &url);
    let id2 = client.mint_certificate(&admin, &owner, &course, &url);

    let certs = client.get_certificates_by_owner(&owner);
    assert_eq!(certs.len(), 2);
    assert_eq!(certs.get(0).unwrap().id, id1);
    assert_eq!(certs.get(1).unwrap().id, id2);
}

// ── count_certificates ────────────────────────────────────────────────────────

#[test]
fn test_count_certificates_increments() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    let course = symbol_short!("RUST101");
    let url = String::from_str(&env, "https://example.com/cert");

    assert_eq!(client.count_certificates(&owner), 0);
    client.mint_certificate(&admin, &owner, &course, &url);
    assert_eq!(client.count_certificates(&owner), 1);
    client.mint_certificate(&admin, &owner, &course, &url);
    assert_eq!(client.count_certificates(&owner), 2);
}

// ── Transfer by non-owner ─────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Caller is not the certificate owner")]
fn test_transfer_by_non_owner_panics() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);
    client.enable_transfer(&admin, &cert_id);

    let rando = Address::generate(&env);
    let recipient = Address::generate(&env);
    client.transfer(&rando, &recipient, &cert_id);
}

// ── Metadata update overwrites previous values ───────────────────────────────

#[test]
fn test_set_metadata_overwrites_previous() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);

    let issuer = String::from_str(&env, "v1 Issuer");
    let skills = String::from_str(&env, "Rust");
    let grade = String::from_str(&env, "B");
    client.set_metadata(&admin, &cert_id, &issuer, &skills, &grade, &0);

    let issuer2 = String::from_str(&env, "v2 Issuer");
    let skills2 = String::from_str(&env, "Rust,Soroban");
    let grade2 = String::from_str(&env, "A");
    client.set_metadata(&admin, &cert_id, &issuer2, &skills2, &grade2, &0);

    let meta = client.get_metadata(&cert_id).unwrap();
    assert_eq!(meta.issuer_name, issuer2);
    assert_eq!(meta.grade, grade2);
}
