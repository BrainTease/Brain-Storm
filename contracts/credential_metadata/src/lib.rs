#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, Env, String, Symbol,
};

#[contracttype]
pub enum DataKey {
    Admin,
    Metadata(u64),
    MetadataHash(u64),
}

#[contracttype]
#[derive(Clone)]
pub struct MetadataRecord {
    pub credential_id: u64,
    pub course_name: String,
    pub completion_date: u64,
    pub grade: String,
    pub ipfs_hash: String,
}

const STORE: Symbol = symbol_short!("store");
const UPDATE: Symbol = symbol_short!("update");

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

    pub fn store_metadata(
        env: Env,
        admin: Address,
        credential_id: u64,
        course_name: String,
        completion_date: u64,
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
}
