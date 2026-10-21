//! Governance storage keys, legacy record types and event topics.
//!
//! Split out of `lib.rs` (issue #1324).

use soroban_sdk::{contracttype, symbol_short, Address, String, Symbol};

// =============================================================================
// Storage keys (legacy + admin)
// =============================================================================

#[contracttype]
pub enum DataKey {
    Admin,
    TokenContract,
    Proposal(u64),
    Vote(u64, Address),
    NextProposalId,
    UpgradeProposal(u64),
    TimelockExpiry(u64),
}

// =============================================================================
// Legacy structs (kept for on-chain state backward compat)
// =============================================================================

#[contracttype]
#[derive(Clone)]
pub struct ProposalRecord {
    pub id: u64,
    pub proposer: Address,
    pub title: String,
    pub description: String,
    pub voting_end_ledger: u32,
    pub votes_for: i128,
    pub votes_against: i128,
    pub executed: bool,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct UpgradeProposalRecord {
    pub id: u64,
    pub proposer: Address,
    pub contract_address: Address,
    pub new_wasm_hash: Symbol,
    pub voting_end_ledger: u32,
    pub votes_for: i128,
    pub votes_against: i128,
    pub approved: bool,
    pub executed: bool,
    pub timelock_ledger: u32,
    pub created_at: u64,
}

// =============================================================================
// Events
// =============================================================================

pub const PROPOSAL_CREATED: Symbol = symbol_short!("prop_new");
pub const VOTE_CAST: Symbol = symbol_short!("vote");
pub const PROPOSAL_EXECUTED: Symbol = symbol_short!("exec");
pub const UPGRADE_PROPOSED: Symbol = symbol_short!("upg_prop");
pub const UPGRADE_APPROVED: Symbol = symbol_short!("upg_appr");
pub const UPGRADE_EXECUTED: Symbol = symbol_short!("upg_exec");
