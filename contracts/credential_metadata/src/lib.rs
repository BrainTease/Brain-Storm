#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, Env, String, Symbol,
};

pub mod linkage;
pub use linkage::{
    set_nft_contract, get_credential_nft_link, get_nft_credential, is_linked,
    CredentialNftLink,
};

#[contracttype]
pub enum DataKey {
    Admin,
    Metadata(u64),
    MetadataHash(u64),
    MetadataHistory(u64, u32),
    HistoryCount(u64),
}

#[contracttype]
#[derive(Clone)]
pub struct MetadataRecord {
    pub credential_id: u64,
    pub course_name: String,
    pub completion_date: u64,
    pub expiry_timestamp: u64,
    pub grade: String,
    pub ipfs_hash: String,
}

#[contracttype]
#[derive(Clone)]
pub struct MetadataHistoryEntry {
    pub credential_id: u64,
    pub course_name: String,
    pub grade: String,
    pub recorded_at: u64,
}

const STORE: Symbol = symbol_short!("store");
const UPDATE: Symbol = symbol_short!("update");
const EXPIRE: Symbol = symbol_short!("expire");
const RENEW: Symbol = symbol_short!("renew");
const GRACE_PERIOD_SECONDS: u64 = 30 * 24 * 60 * 60;

#[contract]
pub struct CredentialMetadataContract;

#[contractimpl]
impl CredentialMetadataContract {
    pub fn initialize(env: Env, admin: Address) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "Already initialized"
        );
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Initialise with NFT contract address for credential↔NFT linkage (Issue #635).
    pub fn initialize_with_nft(env: Env, admin: Address, nft_contract: Address) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "Already initialized"
        );
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        linkage::set_nft_contract(&env, nft_contract);
    }

    /// Issue a credential AND atomically mint a linked NFT (Issue #635).
    ///
    /// Stores the credential metadata and calls the NFT contract cross-contract.
    /// If either operation fails the whole call is rolled back.
    ///
    /// # Returns
    /// The minted NFT ID.
    pub fn issue_with_nft(
        env: Env,
        admin: Address,
        credential_id: u64,
        course_name: String,
        completion_date: u64,
        expiry_timestamp: u64,
        grade: String,
        ipfs_hash: String,
        owner: Address,
        course_id: soroban_sdk::Symbol,
        instructor: Address,
        royalty_basis: u32,
    ) -> u32 {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can issue credentials");

        // Store credential metadata first
        let metadata = MetadataRecord {
            credential_id,
            course_name: course_name.clone(),
            completion_date,
            expiry_timestamp,
            grade,
            ipfs_hash,
        };
        env.storage().persistent().set(&DataKey::Metadata(credential_id), &metadata);
        env.events().publish((STORE, symbol_short!("cred")), credential_id);

        // Atomically mint linked NFT (rolls back everything on failure)
        linkage::issue_and_mint_nft(
            &env,
            &admin,
            credential_id,
            owner,
            course_id,
            course_name,
            instructor,
            royalty_basis,
        )
    }

    /// Get the NFT link for a credential (Issue #635).
    pub fn get_credential_link(env: Env, credential_id: u64) -> Option<linkage::CredentialNftLink> {
        linkage::get_credential_nft_link(&env, credential_id)
    }

    /// Reverse lookup: get credential ID from NFT ID (Issue #635).
    pub fn get_nft_credential_id(env: Env, nft_id: u32) -> Option<u64> {
        linkage::get_nft_credential(&env, nft_id)
    }

    /// Check whether a credential has a linked NFT (Issue #635).
    pub fn credential_is_linked(env: Env, credential_id: u64) -> bool {
        linkage::is_linked(&env, credential_id)
    }

    pub fn store_metadata(
        env: Env,
        admin: Address,
        credential_id: u64,
        course_name: String,
        completion_date: u64,
        expiry_timestamp: u64,
        grade: String,
        ipfs_hash: String,
    ) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can store metadata");

        let metadata = MetadataRecord {
            credential_id,
            course_name,
            completion_date,
            expiry_timestamp,
            grade,
            ipfs_hash,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Metadata(credential_id), &metadata);

        env.events()
            .publish((STORE, symbol_short!("cred")), credential_id);
    }

    pub fn update_metadata(
        env: Env,
        admin: Address,
        credential_id: u64,
        course_name: String,
        grade: String,
    ) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can update metadata");

        let mut metadata: MetadataRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Metadata(credential_id))
            .expect("Metadata not found");

        let history_count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::HistoryCount(credential_id))
            .unwrap_or(0);

        let history_entry = MetadataHistoryEntry {
            credential_id,
            course_name: metadata.course_name.clone(),
            grade: metadata.grade.clone(),
            recorded_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(
            &DataKey::MetadataHistory(credential_id, history_count),
            &history_entry,
        );
        env.storage()
            .persistent()
            .set(&DataKey::HistoryCount(credential_id), &(history_count + 1));

        metadata.course_name = course_name;
        metadata.grade = grade;

        env.storage()
            .persistent()
            .set(&DataKey::Metadata(credential_id), &metadata);

        env.events()
            .publish((UPDATE, symbol_short!("cred")), credential_id);
    }

    pub fn get_metadata(env: Env, credential_id: u64) -> Option<MetadataRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Metadata(credential_id))
    }

    pub fn is_expired(env: Env, credential_id: u64) -> bool {
        let metadata = Self::get_metadata(env.clone(), credential_id);
        match metadata {
            Some(record) => env.ledger().timestamp() > record.expiry_timestamp,
            None => false,
        }
    }

    pub fn is_valid(env: Env, credential_id: u64) -> bool {
        let metadata = Self::get_metadata(env.clone(), credential_id);
        match metadata {
            Some(record) => env.ledger().timestamp() <= record.expiry_timestamp,
            None => false,
        }
    }

    pub fn can_renew(env: Env, credential_id: u64) -> bool {
        let metadata = Self::get_metadata(env.clone(), credential_id);
        match metadata {
            Some(record) => {
                let current_time = env.ledger().timestamp();
                current_time <= record.expiry_timestamp + GRACE_PERIOD_SECONDS
            },
            None => false,
        }
    }

    pub fn renew_credential(
        env: Env,
        admin: Address,
        credential_id: u64,
        new_expiry_timestamp: u64,
    ) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can renew credentials");

        let mut metadata: MetadataRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Metadata(credential_id))
            .expect("Credential not found");

        assert!(
            Self::can_renew(env.clone(), credential_id),
            "Credential not eligible for renewal"
        );

        assert!(
            new_expiry_timestamp > env.ledger().timestamp(),
            "New expiry must be in the future"
        );

        metadata.expiry_timestamp = new_expiry_timestamp;

        env.storage()
            .persistent()
            .set(&DataKey::Metadata(credential_id), &metadata);

        env.events()
            .publish((RENEW, symbol_short!("cred")), credential_id);
    }

    pub fn emit_expiry_event(env: Env, credential_id: u64) {
        env.events()
            .publish((EXPIRE, symbol_short!("cred")), credential_id);
    }

    pub fn store_metadata_hash(env: Env, admin: Address, credential_id: u64, hash: Bytes) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can store hash");

        env.storage()
            .persistent()
            .set(&DataKey::MetadataHash(credential_id), &hash);
    }

    pub fn verify_metadata_hash(env: Env, credential_id: u64, hash: Bytes) -> bool {
        let stored_hash: Option<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::MetadataHash(credential_id));
        match stored_hash {
            Some(h) => h == hash,
            None => false,
        }
    }

    pub fn get_metadata_history(
        env: Env,
        credential_id: u64,
        index: u32,
    ) -> Option<MetadataHistoryEntry> {
        env.storage()
            .persistent()
            .get(&DataKey::MetadataHistory(credential_id, index))
    }

    pub fn get_history_count(env: Env, credential_id: u64) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::HistoryCount(credential_id))
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod tests;
