#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol,
};

// =============================================================================
// Storage keys
// =============================================================================

#[contracttype]
pub enum DataKey {
    Admin,
    Certificate(u64),                    // id → CertificateRecord
    OwnerCertificates(Address),          // owner → Vec<u64>
    NextId,                              // u64 counter
    Revocation(u64),                     // id → RevocationRecord
    Transferable(u64),                   // id → bool (opt-in transferability)
    CertificateMetadata(u64),            // id → CertificateMetadata (extended metadata)
}

// =============================================================================
// Types
// =============================================================================

#[contracttype]
#[derive(Clone)]
pub struct CertificateRecord {
    pub id: u64,
    pub owner: Address,
    pub course_id: Symbol,
    pub metadata_url: String,
    pub issued_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct RevocationRecord {
    pub certificate_id: u64,
    pub revoked_at: u64,
    pub reason: String,
}

/// Extended on-chain metadata for a certificate (optional, set by admin).
#[contracttype]
#[derive(Clone)]
pub struct CertificateMetadata {
    pub certificate_id: u64,
    pub issuer_name: String,
    pub skills: String,       // comma-separated skill tags
    pub grade: String,        // e.g. "A", "Pass", "Distinction"
    pub expiry_timestamp: u64, // 0 = no expiry
}

// =============================================================================
// Events
// =============================================================================

const MINT: Symbol = symbol_short!("mint");
const REVOKE: Symbol = symbol_short!("revoke");
const TRANSFER: Symbol = symbol_short!("transfer");

// =============================================================================
// Contract
// =============================================================================

#[contract]
pub struct CertificateContract;

#[contractimpl]
impl CertificateContract {
    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    pub fn initialize(env: Env, admin: Address) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "Already initialized"
        );
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextId, &1_u64);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    // -------------------------------------------------------------------------
    // Minting (admin only)
    // -------------------------------------------------------------------------

    pub fn mint_certificate(
        env: Env,
        admin: Address,
        recipient: Address,
        course_id: Symbol,
        metadata_url: String,
    ) -> u64 {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can mint");

        let id: u64 = env.storage().instance().get(&DataKey::NextId).unwrap();
        let cert = CertificateRecord {
            id,
            owner: recipient.clone(),
            course_id: course_id.clone(),
            metadata_url,
            issued_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Certificate(id), &cert);

        // Add to owner's certificate list
        let owner_key = DataKey::OwnerCertificates(recipient.clone());
        let mut certs: soroban_sdk::Vec<u64> = env
            .storage()
            .persistent()
            .get(&owner_key)
            .unwrap_or_else(|| soroban_sdk::vec![&env]);
        certs.push_back(id);
        env.storage().persistent().set(&owner_key, &certs);

        // Increment counter
        env.storage()
            .instance()
            .set(&DataKey::NextId, &(id + 1));

        env.events()
            .publish((MINT, symbol_short!("to"), recipient), (id, course_id));

        id
    }

    // -------------------------------------------------------------------------
    // Reading
    // -------------------------------------------------------------------------

    pub fn get_certificate(env: Env, id: u64) -> Option<CertificateRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Certificate(id))
    }

    pub fn get_certificates_by_owner(env: Env, owner: Address) -> soroban_sdk::Vec<CertificateRecord> {
        let owner_key = DataKey::OwnerCertificates(owner.clone());
        let ids: soroban_sdk::Vec<u64> = match env.storage().persistent().get(&owner_key) {
            Some(i) => i,
            None => return soroban_sdk::vec![&env],
        };

        let mut results = soroban_sdk::vec![&env];
        for id in ids.iter() {
            if let Some(cert) = env.storage().persistent().get(&DataKey::Certificate(id)) {
                results.push_back(cert);
            }
        }
        results
    }

    // -------------------------------------------------------------------------
    // Revocation (admin only)
    // -------------------------------------------------------------------------

    pub fn revoke_certificate(env: Env, admin: Address, cert_id: u64, reason: String) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can revoke");
        assert!(
            env.storage()
                .persistent()
                .has(&DataKey::Certificate(cert_id)),
            "Certificate not found"
        );
        assert!(
            !env.storage()
                .persistent()
                .has(&DataKey::Revocation(cert_id)),
            "Certificate already revoked"
        );

        let revocation = RevocationRecord {
            certificate_id: cert_id,
            revoked_at: env.ledger().timestamp(),
            reason: reason.clone(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Revocation(cert_id), &revocation);

        env.events()
            .publish((REVOKE, symbol_short!("cert_id")), (cert_id, reason));
    }

    pub fn is_revoked(env: Env, cert_id: u64) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Revocation(cert_id))
    }

    pub fn get_revocation(env: Env, cert_id: u64) -> Option<RevocationRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Revocation(cert_id))
    }

    // -------------------------------------------------------------------------
    // Transfer
    // -------------------------------------------------------------------------

    /// Enable transferability for a specific certificate (admin only).
    /// By default certificates are soulbound; this opt-in allows transfer.
    pub fn enable_transfer(env: Env, admin: Address, cert_id: u64) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can enable transfer");
        assert!(
            env.storage().persistent().has(&DataKey::Certificate(cert_id)),
            "Certificate not found"
        );
        env.storage()
            .persistent()
            .set(&DataKey::Transferable(cert_id), &true);
    }

    /// Transfer a certificate from `from` to `to`.
    /// Requires the certificate to have transferability enabled and not be revoked.
    pub fn transfer(env: Env, from: Address, to: Address, cert_id: u64) {
        from.require_auth();

        let transferable: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Transferable(cert_id))
            .unwrap_or(false);
        assert!(transferable, "Certificate is soulbound and cannot be transferred");
        assert!(
            !env.storage().persistent().has(&DataKey::Revocation(cert_id)),
            "Revoked certificate cannot be transferred"
        );

        let mut cert: CertificateRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Certificate(cert_id))
            .expect("Certificate not found");

        assert!(cert.owner == from, "Caller is not the certificate owner");

        // Remove from sender's list
        let from_key = DataKey::OwnerCertificates(from.clone());
        if let Some(mut ids) = env
            .storage()
            .persistent()
            .get::<DataKey, soroban_sdk::Vec<u64>>(&from_key)
        {
            let pos = ids.iter().position(|id| id == cert_id);
            if let Some(i) = pos {
                ids.remove(i as u32);
                env.storage().persistent().set(&from_key, &ids);
            }
        }

        // Add to recipient's list
        let to_key = DataKey::OwnerCertificates(to.clone());
        let mut to_ids: soroban_sdk::Vec<u64> = env
            .storage()
            .persistent()
            .get(&to_key)
            .unwrap_or_else(|| soroban_sdk::vec![&env]);
        to_ids.push_back(cert_id);
        env.storage().persistent().set(&to_key, &to_ids);

        // Update owner
        cert.owner = to.clone();
        env.storage()
            .persistent()
            .set(&DataKey::Certificate(cert_id), &cert);

        env.events()
            .publish((TRANSFER, symbol_short!("from"), from), (to, cert_id));
    }

    // -------------------------------------------------------------------------
    // Metadata storage
    // -------------------------------------------------------------------------

    /// Store extended metadata for a certificate (admin only).
    pub fn set_metadata(
        env: Env,
        admin: Address,
        cert_id: u64,
        issuer_name: String,
        skills: String,
        grade: String,
        expiry_timestamp: u64,
    ) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can set metadata");
        assert!(
            env.storage().persistent().has(&DataKey::Certificate(cert_id)),
            "Certificate not found"
        );

        let metadata = CertificateMetadata {
            certificate_id: cert_id,
            issuer_name,
            skills,
            grade,
            expiry_timestamp,
        };
        env.storage()
            .persistent()
            .set(&DataKey::CertificateMetadata(cert_id), &metadata);
    }

    pub fn get_metadata(env: Env, cert_id: u64) -> Option<CertificateMetadata> {
        env.storage()
            .persistent()
            .get(&DataKey::CertificateMetadata(cert_id))
    }

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    /// Check whether a certificate is valid (exists, not revoked, not expired).
    pub fn is_valid(env: Env, cert_id: u64) -> bool {
        if !env.storage().persistent().has(&DataKey::Certificate(cert_id)) {
            return false;
        }
        if env.storage().persistent().has(&DataKey::Revocation(cert_id)) {
            return false;
        }
        // Check expiry if metadata exists
        if let Some(meta) = env
            .storage()
            .persistent()
            .get::<DataKey, CertificateMetadata>(&DataKey::CertificateMetadata(cert_id))
        {
            if meta.expiry_timestamp > 0 && env.ledger().timestamp() > meta.expiry_timestamp {
                return false;
            }
        }
        true
    }

    /// Count certificates owned by an address.
    pub fn count_certificates(env: Env, owner: Address) -> u32 {
        let key = DataKey::OwnerCertificates(owner);
        let ids: soroban_sdk::Vec<u64> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| soroban_sdk::vec![&env]);
        ids.len() as u32
    }

    /// Check whether a certificate is transferable.
    pub fn is_transferable(env: Env, cert_id: u64) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Transferable(cert_id))
            .unwrap_or(false)
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod fuzz_tests;

#[cfg(test)]
mod tests {
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
    #[should_panic(expected = "Only admin can mint")]
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
    #[should_panic(expected = "Only admin can revoke")]
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
}
