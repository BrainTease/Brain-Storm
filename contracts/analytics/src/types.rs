//! Analytics storage keys, record types and progress bounds.
//!
//! Split out of `lib.rs` (issue #1324) so the contract entry points live in a
//! single, readable file.

use soroban_sdk::{contracttype, Address, Symbol};

// Progress validation bounds
pub const PROGRESS_MAX: u32 = 100;
pub const PROGRESS_COMPLETE: u32 = 100;

// Milestone percentages at which achievements are recorded
pub const MILESTONE_25: u32 = 25;
pub const MILESTONE_50: u32 = 50;
pub const MILESTONE_75: u32 = 75;
pub const MILESTONE_100: u32 = 100;

// =============================================================================
// Storage keys
// =============================================================================

#[contracttype]
pub enum DataKey {
    Admin,
    Progress(Address, Symbol),   // persistent: ProgressRecord
    StudentCourses(Address),     // persistent: Vec<Symbol> — secondary index
    CourseStudents(Symbol),      // persistent: Vec<Address> — reverse index
    TotalStudents,
    TotalCourses,
    CompletionStats,
    DailyStats(u64),
    WeeklyStats(u64),
    MonthlyStats(u64),
    TopPerformers,
    Milestone(Address, Symbol, u32), // (student, course, milestone_pct) → MilestoneRecord
    StudentMilestones(Address, Symbol), // (student, course) → Vec<u32> (achieved milestones)
    AuthorizedCaller(Address),   // instance: bool — access control whitelist
}

// =============================================================================
// Types
// =============================================================================

#[contracttype]
#[derive(Clone)]
pub struct ProgressRecord {
    pub student: Address,
    pub course_id: Symbol,
    pub progress_pct: u32,
    pub completed: bool,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct CompletionStats {
    pub total_completions: u32,
    pub avg_completion_rate: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct TimeBasedStats {
    pub period: u64,
    pub completions: u32,
    pub avg_progress: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct TopPerformer {
    pub student: Address,
    pub completion_count: u32,
    pub avg_progress: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct MilestoneRecord {
    pub student: Address,
    pub course_id: Symbol,
    pub milestone_pct: u32,
    pub achieved_at: u64,
}
