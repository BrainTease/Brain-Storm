//! Storage keys, on-chain types and event topics for the `certificate` contract.
//!
//! Split out of `lib.rs` (issue #1324) so the contract entry points live in a
//! single, readable file.

use soroban_sdk::{contracttype, symbol_short, Address, String, Symbol};

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

pub const MINT: Symbol = symbol_short!("mint");
pub const REVOKE: Symbol = symbol_short!("revoke");
pub const TRANSFER: Symbol = symbol_short!("transfer");
