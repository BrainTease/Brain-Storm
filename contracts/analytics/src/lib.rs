#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, vec, Address, Env, Symbol, Vec};

mod queries;
mod types;
pub use types::*;

use brain_storm_shared::access;
use brain_storm_shared::constants::{
    STORAGE_TTL_EXTEND_TO as TTL_EXTEND_TO, STORAGE_TTL_THRESHOLD as TTL_THRESHOLD,
};
#[cfg(test)]
use brain_storm_shared::constants::{MAX_ENTRY_TTL, MIN_PERSISTENT_ENTRY_TTL, MIN_TEMP_ENTRY_TTL};

// =============================================================================
// Contract
// =============================================================================

#[contract]
pub struct AnalyticsContract;

#[contractimpl]
impl AnalyticsContract {
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
    }

    pub fn set_admin(env: Env, new_admin: Address) {
        // The *current* admin authorizes the handover.
        let admin = access::read_authority(&env, &DataKey::Admin);
        access::require_admin(&env, &admin, &DataKey::Admin);
        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    // -------------------------------------------------------------------------
    // Access controls — authorized callers
    // -------------------------------------------------------------------------

    /// Grant a contract/address permission to record progress on behalf of students.
    pub fn authorize_caller(env: Env, admin: Address, caller: Address) {
        access::require_admin(&env, &admin, &DataKey::Admin);
        env.storage()
            .instance()
            .set(&DataKey::AuthorizedCaller(caller.clone()), &true);
        env.events().publish(
            (symbol_short!("analytics"), symbol_short!("auth_add")),
            caller,
        );
    }

    /// Revoke a previously authorized caller.
    pub fn revoke_caller(env: Env, admin: Address, caller: Address) {
        access::require_admin(&env, &admin, &DataKey::Admin);
        env.storage()
            .instance()
            .remove(&DataKey::AuthorizedCaller(caller.clone()));
        env.events().publish(
            (symbol_short!("analytics"), symbol_short!("auth_rm")),
            caller,
        );
    }

    /// Check whether an address is an authorized caller.
    pub fn is_authorized_caller(env: Env, caller: Address) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::AuthorizedCaller(caller))
            .unwrap_or(false)
    }

    // -------------------------------------------------------------------------
    // Progress
    // -------------------------------------------------------------------------

    /// Record or update a student's course progress.
    /// Callable by the student themselves, the admin, or an authorized caller.
    pub fn record_progress(
        env: Env,
        caller: Address,
        student: Address,
        course_id: Symbol,
        progress_pct: u32,
    ) {
        caller.require_auth();
        let is_authorized: bool = env
            .storage()
            .instance()
            .get(&DataKey::AuthorizedCaller(caller.clone()))
            .unwrap_or(false);
        assert!(
            caller == student || access::is_admin(&env, &caller, &DataKey::Admin) || is_authorized,
            "Unauthorized: must be student, admin, or authorized caller"
        );
        assert!(progress_pct <= PROGRESS_MAX, "Progress must be 0-100");

        let record = ProgressRecord {
            student: student.clone(),
            course_id: course_id.clone(),
            progress_pct,
            completed: progress_pct == PROGRESS_COMPLETE,
            timestamp: env.ledger().timestamp(),
        };

        // Write progress record to persistent storage
        let progress_key = DataKey::Progress(student.clone(), course_id.clone());
        env.storage().persistent().set(&progress_key, &record);
        env.storage()
            .persistent()
            .extend_ttl(&progress_key, TTL_THRESHOLD, TTL_EXTEND_TO);

        // Update secondary index: student → [course_ids]
        let index_key = DataKey::StudentCourses(student.clone());
        let mut courses: Vec<Symbol> = env
            .storage()
            .persistent()
            .get(&index_key)
            .unwrap_or_else(|| vec![&env]);

        if !courses.contains(&course_id) {
            courses.push_back(course_id.clone());
            env.storage().persistent().set(&index_key, &courses);
        }
        env.storage()
            .persistent()
            .extend_ttl(&index_key, TTL_THRESHOLD, TTL_EXTEND_TO);

        // Update reverse index: course → [students]
        let course_index_key = DataKey::CourseStudents(course_id.clone());
        let mut students: Vec<Address> = env
            .storage()
            .persistent()
            .get(&course_index_key)
            .unwrap_or_else(|| vec![&env]);
        if !students.contains(&student) {
            students.push_back(student.clone());
            env.storage().persistent().set(&course_index_key, &students);
            env.storage()
                .persistent()
                .extend_ttl(&course_index_key, TTL_THRESHOLD, TTL_EXTEND_TO);
        }

        // Check and record milestone achievements
        Self::check_milestones(&env, &student, &course_id, progress_pct);

        // Emit events
        env.events().publish(
            (symbol_short!("analytics"), symbol_short!("prog_upd")),
            (student.clone(), course_id.clone(), progress_pct),
        );
        if progress_pct == PROGRESS_COMPLETE {
            env.events().publish(
                (symbol_short!("analytics"), symbol_short!("completed")),
                (student, course_id),
            );
        }
    }

    /// Reset a student's progress for a specific course (admin only).
    pub fn reset_progress(env: Env, admin: Address, student: Address, course_id: Symbol) {
        access::require_admin(&env, &admin, &DataKey::Admin);

        let progress_key = DataKey::Progress(student.clone(), course_id.clone());
        env.storage().persistent().remove(&progress_key);

        // Remove from secondary index
        let index_key = DataKey::StudentCourses(student.clone());
        if let Some(mut courses) = env
            .storage()
            .persistent()
            .get::<DataKey, Vec<Symbol>>(&index_key)
        {
            let pos = courses.iter().position(|c| c == course_id);
            if let Some(i) = pos {
                courses.remove(i as u32);
                env.storage().persistent().set(&index_key, &courses);
                env.storage()
                    .persistent()
                    .extend_ttl(&index_key, TTL_THRESHOLD, TTL_EXTEND_TO);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Progress — read
    // -------------------------------------------------------------------------

    /// Get a student's progress for a specific course.
    pub fn get_progress(env: Env, student: Address, course_id: Symbol) -> Option<ProgressRecord> {
        queries::get_progress(env, student, course_id)
    }

    /// Get all progress records for a student via the secondary index.
    pub fn get_all_progress(env: Env, student: Address) -> Vec<ProgressRecord> {
        queries::get_all_progress(env, student)
    }

    // -------------------------------------------------------------------------
    // Milestones
    // -------------------------------------------------------------------------

    fn check_milestones(env: &Env, student: &Address, course_id: &Symbol, progress_pct: u32) {
        let milestones = vec![&env, MILESTONE_25, MILESTONE_50, MILESTONE_75, MILESTONE_100];
        let milestone_key = DataKey::StudentMilestones(student.clone(), course_id.clone());
        let mut achieved: Vec<u32> = env
            .storage()
            .persistent()
            .get(&milestone_key)
            .unwrap_or_else(|| vec![&env]);

        for milestone in milestones.iter() {
            if progress_pct >= milestone && !achieved.contains(milestone) {
                achieved.push_back(milestone);
                let record = MilestoneRecord {
                    student: student.clone(),
                    course_id: course_id.clone(),
                    milestone_pct: milestone,
                    achieved_at: env.ledger().timestamp(),
                };
                let key = DataKey::Milestone(student.clone(), course_id.clone(), milestone);
                env.storage().persistent().set(&key, &record);
                env.storage()
                    .persistent()
                    .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);

                env.events().publish(
                    (symbol_short!("analytics"), symbol_short!("milestone")),
                    (student.clone(), course_id.clone(), milestone),
                );
            }
        }

        env.storage().persistent().set(&milestone_key, &achieved);
        env.storage()
            .persistent()
            .extend_ttl(&milestone_key, TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    pub fn get_milestone(
        env: Env,
        student: Address,
        course_id: Symbol,
        milestone_pct: u32,
    ) -> Option<MilestoneRecord> {
        queries::get_milestone(env, student, course_id, milestone_pct)
    }

    pub fn get_achieved_milestones(env: Env, student: Address, course_id: Symbol) -> Vec<u32> {
        queries::get_achieved_milestones(env, student, course_id)
    }

    // -------------------------------------------------------------------------
    // Analytics Aggregation
    // -------------------------------------------------------------------------

    pub fn get_total_students(env: Env) -> u32 {
        queries::get_total_students(env)
    }

    pub fn get_total_courses(env: Env) -> u32 {
        queries::get_total_courses(env)
    }

    pub fn get_completion_stats(env: Env) -> CompletionStats {
        queries::get_completion_stats(env)
    }

    pub fn get_daily_stats(env: Env, day: u64) -> Option<TimeBasedStats> {
        queries::get_daily_stats(env, day)
    }

    pub fn get_weekly_stats(env: Env, week: u64) -> Option<TimeBasedStats> {
        queries::get_weekly_stats(env, week)
    }

    pub fn get_monthly_stats(env: Env, month: u64) -> Option<TimeBasedStats> {
        queries::get_monthly_stats(env, month)
    }

    pub fn get_top_performers(env: Env, limit: u32) -> Vec<TopPerformer> {
        queries::get_top_performers(env, limit)
    }

    pub fn update_aggregates(env: Env, admin: Address) {
        queries::update_aggregates(env, admin)
    }

    // -------------------------------------------------------------------------
    // Course-level aggregation queries
    // -------------------------------------------------------------------------

    /// Get all students enrolled in a course (via reverse index).
    pub fn get_students_by_course(env: Env, course_id: Symbol) -> Vec<Address> {
        queries::get_students_by_course(env, course_id)
    }

    /// Get all progress records for a specific course across all enrolled students.
    pub fn get_course_progress(env: Env, course_id: Symbol) -> Vec<ProgressRecord> {
        queries::get_course_progress(env, course_id)
    }

    /// Get the number of students who completed a course.
    pub fn get_course_completion_count(env: Env, course_id: Symbol) -> u32 {
        queries::get_course_completion_count(env, course_id)
    }

    /// Get the average progress percentage across all students in a course.
    pub fn get_course_average_progress(env: Env, course_id: Symbol) -> u32 {
        queries::get_course_average_progress(env, course_id)
    }

    // -------------------------------------------------------------------------
    // Event Filtering & Pagination
    // -------------------------------------------------------------------------

    /// Get completed courses for a student (filtered by completion status).
    pub fn get_completed_courses(env: Env, student: Address) -> Vec<ProgressRecord> {
        queries::get_completed_courses(env, student)
    }

    /// Get in-progress courses for a student (filtered by completion status).
    pub fn get_in_progress_courses(env: Env, student: Address) -> Vec<ProgressRecord> {
        queries::get_in_progress_courses(env, student)
    }

    /// Get paginated progress records for a student.
    /// offset: starting index, limit: max records to return
    pub fn get_progress_paginated(
        env: Env,
        student: Address,
        offset: u32,
        limit: u32,
    ) -> Vec<ProgressRecord> {
        queries::get_progress_paginated(env, student, offset, limit)
    }

    /// Get progress records for a student filtered by minimum progress percentage.
    pub fn get_progress_above_threshold(
        env: Env,
        student: Address,
        min_progress_pct: u32,
    ) -> Vec<ProgressRecord> {
        queries::get_progress_above_threshold(env, student, min_progress_pct)
    }

    /// Count total completed courses for a student.
    pub fn count_completed_courses(env: Env, student: Address) -> u32 {
        queries::count_completed_courses(env, student)
    }

    /// Get average progress across all courses for a student.
    pub fn get_average_progress(env: Env, student: Address) -> u32 {
        queries::get_average_progress(env, student)
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod fuzz_tests;

// Dedicated per-function tests for every public entry point (#1363).
#[cfg(test)]
mod contract_tests;
