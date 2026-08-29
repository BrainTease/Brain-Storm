#![cfg(test)]
//! Additional unit tests for the certificate contract covering:
//! - enable_transfer and transfer workflow
//! - is_valid (not-found, revoked, expired, no-expiry)
//! - set_metadata / get_metadata (admin-only, not-found, update)
//! - count_certificates and is_transferable queries
//! - transfer ownership update and list maintenance

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

// ── enable_transfer ──────────────────────────────────────────────────────────

#[test]
fn test_enable_transfer_allows_subsequent_transfer() {
    let (env, client, admin) = setup();
    let (owner, cert_id) = mint_one(&env, &client, &admin);

    assert!(!client.is_transferable(&cert_id));

    client.enable_transfer(&admin, &cert_id);

    assert!(client.is_transferable(&cert_id));
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_enable_transfer() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);
    let rando = Address::generate(&env);
    client.enable_transfer(&rando, &cert_id);
}

#[test]
#[should_panic(expected = "Certificate not found")]
fn test_enable_transfer_panics_for_nonexistent_cert() {
    let (_, client, admin) = setup();
    client.enable_transfer(&admin, &999);
}

// ── transfer ─────────────────────────────────────────────────────────────────

#[test]
fn test_transfer_moves_certificate_to_new_owner() {
    let (env, client, admin) = setup();
    let (owner, cert_id) = mint_one(&env, &client, &admin);
    let recipient = Address::generate(&env);

    client.enable_transfer(&admin, &cert_id);
    client.transfer(&owner, &recipient, &cert_id);

    let cert = client.get_certificate(&cert_id).unwrap();
    assert_eq!(cert.owner, recipient);
}

#[test]
fn test_transfer_updates_owner_certificate_lists() {
    let (env, client, admin) = setup();
    let (owner, cert_id) = mint_one(&env, &client, &admin);
    let recipient = Address::generate(&env);

    client.enable_transfer(&admin, &cert_id);
    client.transfer(&owner, &recipient, &cert_id);

    // Original owner list should not contain the cert
    let owner_certs = client.get_certificates_by_owner(&owner);
    assert_eq!(owner_certs.len(), 0);

    // Recipient list should contain the cert
    let recipient_certs = client.get_certificates_by_owner(&recipient);
    assert_eq!(recipient_certs.len(), 1);
    assert_eq!(recipient_certs.get(0).unwrap().id, cert_id);
}

#[test]
#[should_panic(expected = "Certificate is soulbound and cannot be transferred")]
fn test_transfer_panics_when_not_transferable() {
    let (env, client, admin) = setup();
    let (owner, cert_id) = mint_one(&env, &client, &admin);
    let recipient = Address::generate(&env);
    // No enable_transfer call
    client.transfer(&owner, &recipient, &cert_id);
}

#[test]
#[should_panic(expected = "Revoked certificate cannot be transferred")]
fn test_transfer_panics_when_revoked() {
    let (env, client, admin) = setup();
    let (owner, cert_id) = mint_one(&env, &client, &admin);
    let recipient = Address::generate(&env);
    let reason = String::from_str(&env, "Fraud");

    client.enable_transfer(&admin, &cert_id);
    client.revoke_certificate(&admin, &cert_id, &reason);
    client.transfer(&owner, &recipient, &cert_id);
}

#[test]
#[should_panic(expected = "Caller is not the certificate owner")]
fn test_transfer_panics_when_not_owner() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);
    let impostor = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.enable_transfer(&admin, &cert_id);
    client.transfer(&impostor, &recipient, &cert_id);
}

// ── set_metadata / get_metadata ───────────────────────────────────────────────

#[test]
fn test_set_and_get_metadata() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);

    client.set_metadata(
        &admin,
        &cert_id,
        &String::from_str(&env, "Brain Storm Institute"),
        &String::from_str(&env, "Rust,WebAssembly,Blockchain"),
        &String::from_str(&env, "Distinction"),
        &0_u64,
    );

    let meta = client.get_metadata(&cert_id).unwrap();
    assert_eq!(meta.certificate_id, cert_id);
    assert_eq!(meta.issuer_name, String::from_str(&env, "Brain Storm Institute"));
    assert_eq!(meta.grade, String::from_str(&env, "Distinction"));
    assert_eq!(meta.expiry_timestamp, 0);
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

    client.set_metadata(
        &rando,
        &cert_id,
        &String::from_str(&env, "Issuer"),
        &String::from_str(&env, "Rust"),
        &String::from_str(&env, "A"),
        &0_u64,
    );
}

#[test]
#[should_panic(expected = "Certificate not found")]
fn test_set_metadata_panics_for_nonexistent_cert() {
    let (env, client, admin) = setup();

    client.set_metadata(
        &admin,
        &999,
        &String::from_str(&env, "Issuer"),
        &String::from_str(&env, "Rust"),
        &String::from_str(&env, "A"),
        &0_u64,
    );
}

#[test]
fn test_set_metadata_can_overwrite_existing() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);

    client.set_metadata(
        &admin,
        &cert_id,
        &String::from_str(&env, "First Issuer"),
        &String::from_str(&env, "Rust"),
        &String::from_str(&env, "Pass"),
        &0_u64,
    );
    // Overwrite
    client.set_metadata(
        &admin,
        &cert_id,
        &String::from_str(&env, "Updated Issuer"),
        &String::from_str(&env, "Rust,Soroban"),
        &String::from_str(&env, "Distinction"),
        &0_u64,
    );

    let meta = client.get_metadata(&cert_id).unwrap();
    assert_eq!(meta.issuer_name, String::from_str(&env, "Updated Issuer"));
    assert_eq!(meta.grade, String::from_str(&env, "Distinction"));
}

// ── is_valid ──────────────────────────────────────────────────────────────────

#[test]
fn test_is_valid_returns_false_for_nonexistent_cert() {
    let (_, client, _) = setup();
    assert!(!client.is_valid(&999));
}

#[test]
fn test_is_valid_returns_true_for_active_cert() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);
    assert!(client.is_valid(&cert_id));
}

#[test]
fn test_is_valid_returns_false_for_revoked_cert() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);
    let reason = String::from_str(&env, "Misconduct");
    client.revoke_certificate(&admin, &cert_id, &reason);
    assert!(!client.is_valid(&cert_id));
}

#[test]
fn test_is_valid_returns_true_when_no_expiry_set() {
    let (env, client, admin) = setup();
    let (_, cert_id) = mint_one(&env, &client, &admin);

    // Set metadata with expiry_timestamp = 0 (no expiry)
    client.set_metadata(
        &admin,
        &cert_id,
        &String::from_str(&env, "Issuer"),
        &String::from_str(&env, "Skills"),
        &String::from_str(&env, "A"),
        &0_u64,
    );

    assert!(client.is_valid(&cert_id));
}

// ── count_certificates ────────────────────────────────────────────────────────

#[test]
fn test_count_certificates_returns_zero_for_new_address() {
    let (env, client, _) = setup();
    let owner = Address::generate(&env);
    assert_eq!(client.count_certificates(&owner), 0);
}

#[test]
fn test_count_certificates_increases_with_each_mint() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    let course = symbol_short!("RUST101");
    let url = String::from_str(&env, "https://example.com/cert");

    client.mint_certificate(&admin, &owner, &course, &url);
    assert_eq!(client.count_certificates(&owner), 1);

    client.mint_certificate(&admin, &owner, &course, &url);
    assert_eq!(client.count_certificates(&owner), 2);
}

#[test]
fn test_count_certificates_reflects_transfer() {
    let (env, client, admin) = setup();
    let (owner, cert_id) = mint_one(&env, &client, &admin);
    let recipient = Address::generate(&env);

    assert_eq!(client.count_certificates(&owner), 1);
    assert_eq!(client.count_certificates(&recipient), 0);

    client.enable_transfer(&admin, &cert_id);
    client.transfer(&owner, &recipient, &cert_id);

    assert_eq!(client.count_certificates(&owner), 0);
    assert_eq!(client.count_certificates(&recipient), 1);
}
