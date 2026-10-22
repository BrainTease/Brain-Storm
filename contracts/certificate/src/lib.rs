#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, String, Symbol};

mod types;
pub use types::*;

use brain_storm_shared::access;

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
        access::require_admin(&env, &admin, &DataKey::Admin);

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
        access::require_admin(&env, &admin, &DataKey::Admin);
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
        access::require_admin(&env, &admin, &DataKey::Admin);
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
        let mut cert: CertificateRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Certificate(cert_id))
            .expect("Certificate not found");
        access::require_owner(&from, &cert.owner);

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
        access::require_admin(&env, &admin, &DataKey::Admin);
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
        ids.len()
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
mod tests_ext;

#[cfg(test)]
mod tests_coverage;

#[cfg(test)]
mod contract_tests;
