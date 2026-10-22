//! Credential metadata storage keys, record types and lifecycle topics.
//!
//! Split out of `lib.rs` (issue #1324).

use soroban_sdk::{contracttype, symbol_short, Address, String, Symbol};

#[contracttype]
pub enum DataKey {
    Admin,
    Metadata(u64),
    MetadataHash(u64),
    MetadataHistory(u64, u32),
    HistoryCount(u64),
    /// Compact storage: content-addressed hash + off-chain URI pointer only.
    /// Replaces a full `MetadataRecord` blob when the contract is operating
    /// in reduced-footprint mode.  Both variants may exist for the same
    /// `credential_id` during migration; `get_metadata_compact` prefers this
    /// key and falls back to `Metadata`.
    CompactMeta(u64),
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

/// Compact on-chain representation: stores only the content hash and a short
/// off-chain pointer.  All mutable human-readable fields live in IPFS (or
/// another content-addressed store) and are authenticated by `content_hash`.
///
/// Storage cost vs full `MetadataRecord`:
/// - Full record (Strings): ≈ 150–400 bytes depending on field lengths
/// - Compact record (fixed BytesN<32> + u64 timestamps): ≈ 56 bytes flat
#[contracttype]
#[derive(Clone)]
pub struct CompactMetadataRecord {
    pub credential_id: u64,
    /// SHA-256 / IPFS CIDv1 content hash (32 bytes, fixed size).
    pub content_hash: soroban_sdk::BytesN<32>,
    /// Timestamp at which the credential was issued.
    pub issued_at: u64,
    /// Timestamp at which the credential expires (0 = never).
    pub expiry_timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct MetadataHistoryEntry {
    pub credential_id: u64,
    pub course_name: String,
    pub grade: String,
    pub recorded_at: u64,
}

/// Input bundle for `issue_with_nft`. Soroban caps contract entry points at
/// ten parameters; bundling the issuance payload keeps the ABI within that
/// limit without dropping any field.
#[contracttype]
#[derive(Clone)]
pub struct IssueWithNftParams {
    pub admin: Address,
    pub credential_id: u64,
    pub course_name: String,
    pub completion_date: u64,
    pub expiry_timestamp: u64,
    pub grade: String,
    pub ipfs_hash: String,
    pub owner: Address,
    pub course_id: Symbol,
    pub instructor: Address,
    pub royalty_basis: u32,
}

pub const STORE: Symbol = symbol_short!("store");
pub const UPDATE: Symbol = symbol_short!("update");
pub const EXPIRE: Symbol = symbol_short!("expire");
pub const RENEW: Symbol = symbol_short!("renew");
pub const GRACE_PERIOD_SECONDS: u64 = 30 * 24 * 60 * 60;
