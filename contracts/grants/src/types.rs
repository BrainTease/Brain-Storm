//! Grant storage keys and record types.
//!
//! Split out of `lib.rs` (issue #1324).

use soroban_sdk::{contracttype, Address, String, Symbol};

// =============================================================================
// Storage keys
// =============================================================================

#[contracttype]
pub enum DataKey {
    Admin,
    TokenContract,
    Grant(u64),                          // id → GrantRecord
    GrantMilestone(u64, u32),            // (grant_id, milestone_idx) → MilestoneRecord
    GrantReporting(u64),                 // id → Vec<ReportRecord>
    NextGrantId,                         // u64 counter
    ApplicantGrants(Address),            // address → Vec<u64>
}

// =============================================================================
// Types
// =============================================================================

#[contracttype]
#[derive(Clone)]
pub struct GrantRecord {
    pub id: u64,
    pub applicant: Address,
    pub title: String,
    pub description: String,
    pub total_amount: i128,
    pub status: Symbol,                  // "pending", "approved", "active", "completed", "rejected"
    pub created_at: u64,
    pub approved_at: u64,
    pub milestone_count: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct MilestoneRecord {
    pub grant_id: u64,
    pub milestone_idx: u32,
    pub description: String,
    pub amount: i128,
    pub released: bool,
    pub released_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct ReportRecord {
    pub grant_id: u64,
    pub report_idx: u32,
    pub content: String,
    pub submitted_at: u64,
}
