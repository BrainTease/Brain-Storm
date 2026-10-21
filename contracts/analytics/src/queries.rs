//! Read-side analytics queries.
//!
//! Split out of `lib.rs` (issue #1324) so the contract entry points in
//! `lib.rs` stay short and the read paths live in one place.

use soroban_sdk::{symbol_short, vec, Address, Env, Symbol, Vec};

use brain_storm_shared::access;
use brain_storm_shared::constants::{
    STORAGE_TTL_EXTEND_TO as TTL_EXTEND_TO, STORAGE_TTL_THRESHOLD as TTL_THRESHOLD,
};
use brain_storm_shared::pagination::paginate;

use crate::types::{
    CompletionStats, DataKey, MilestoneRecord, ProgressRecord, TimeBasedStats, TopPerformer,
    PROGRESS_MAX,
};
pub fn get_progress(env: Env, student: Address, course_id: Symbol) -> Option<ProgressRecord> {
    let key = DataKey::Progress(student, course_id);
    let record = env.storage().persistent().get(&key)?;
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    Some(record)
}

pub fn get_all_progress(env: Env, student: Address) -> Vec<ProgressRecord> {
    let index_key = DataKey::StudentCourses(student.clone());
    let courses: Vec<Symbol> = match env.storage().persistent().get(&index_key) {
        Some(c) => {
            env.storage()
                .persistent()
                .extend_ttl(&index_key, TTL_THRESHOLD, TTL_EXTEND_TO);
            c
        }
        None => return vec![&env],
    };

    let mut results = vec![&env];
    for course_id in courses.iter() {
        let key = DataKey::Progress(student.clone(), course_id.clone());
        if let Some(record) = env.storage().persistent().get::<DataKey, ProgressRecord>(&key) {
            env.storage()
                .persistent()
                .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
            results.push_back(record);
        }
    }
    results
}

pub fn get_milestone(
    env: Env,
    student: Address,
    course_id: Symbol,
    milestone_pct: u32,
) -> Option<MilestoneRecord> {
    let key = DataKey::Milestone(student, course_id, milestone_pct);
    let record = env.storage().persistent().get(&key)?;
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    Some(record)
}

pub fn get_achieved_milestones(env: Env, student: Address, course_id: Symbol) -> Vec<u32> {
    let key = DataKey::StudentMilestones(student, course_id);
    match env.storage().persistent().get(&key) {
        Some(milestones) => {
            env.storage()
                .persistent()
                .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
            milestones
        }
        None => vec![&env],
    }
}

pub fn get_total_students(env: Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::TotalStudents)
        .unwrap_or(0)
}

pub fn get_total_courses(env: Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::TotalCourses)
        .unwrap_or(0)
}

pub fn get_completion_stats(env: Env) -> CompletionStats {
    env.storage()
        .instance()
        .get(&DataKey::CompletionStats)
        .unwrap_or(CompletionStats {
            total_completions: 0,
            avg_completion_rate: 0,
        })
}

pub fn get_daily_stats(env: Env, day: u64) -> Option<TimeBasedStats> {
    env.storage()
        .instance()
        .get(&DataKey::DailyStats(day))
}

pub fn get_weekly_stats(env: Env, week: u64) -> Option<TimeBasedStats> {
    env.storage()
        .instance()
        .get(&DataKey::WeeklyStats(week))
}

pub fn get_monthly_stats(env: Env, month: u64) -> Option<TimeBasedStats> {
    env.storage()
        .instance()
        .get(&DataKey::MonthlyStats(month))
}

pub fn get_top_performers(env: Env, limit: u32) -> Vec<TopPerformer> {
    let performers: Vec<TopPerformer> = env
        .storage()
        .instance()
        .get(&DataKey::TopPerformers)
        .unwrap_or_else(|| vec![&env]);

    let mut result = vec![&env];
    for (i, performer) in performers.iter().enumerate() {
        if i >= limit as usize {
            break;
        }
        result.push_back(performer.clone());
    }
    result
}

pub fn update_aggregates(env: Env, admin: Address) {
    access::require_admin(&env, &admin, &DataKey::Admin);

    // Update completion stats
    let stats = CompletionStats {
        total_completions: 0,
        avg_completion_rate: 0,
    };

    // In production, this would iterate through all students and courses
    // For now, we store the aggregated values
    env.storage()
        .instance()
        .set(&DataKey::CompletionStats, &stats);

    env.events().publish(
        (symbol_short!("analytics"), symbol_short!("agg_upd")),
        stats.total_completions,
    );
}

pub fn get_students_by_course(env: Env, course_id: Symbol) -> Vec<Address> {
    let key = DataKey::CourseStudents(course_id);
    match env.storage().persistent().get(&key) {
        Some(students) => {
            env.storage()
                .persistent()
                .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
            students
        }
        None => vec![&env],
    }
}

pub fn get_course_progress(env: Env, course_id: Symbol) -> Vec<ProgressRecord> {
    let students = get_students_by_course(env.clone(), course_id.clone());
    let mut results = vec![&env];
    for student in students.iter() {
        let key = DataKey::Progress(student.clone(), course_id.clone());
        if let Some(record) = env.storage().persistent().get::<DataKey, ProgressRecord>(&key) {
            env.storage()
                .persistent()
                .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
            results.push_back(record);
        }
    }
    results
}

pub fn get_course_completion_count(env: Env, course_id: Symbol) -> u32 {
    let records = get_course_progress(env, course_id);
    let mut count: u32 = 0;
    for record in records.iter() {
        if record.completed {
            count += 1;
        }
    }
    count
}

pub fn get_course_average_progress(env: Env, course_id: Symbol) -> u32 {
    let records = get_course_progress(env, course_id);
    if records.is_empty() {
        return 0;
    }
    let mut total: u64 = 0;
    for record in records.iter() {
        total += record.progress_pct as u64;
    }
    (total / records.len() as u64) as u32
}

pub fn get_completed_courses(env: Env, student: Address) -> Vec<ProgressRecord> {
    let all_progress = get_all_progress(env.clone(), student);
    let mut completed = vec![&env];

    for record in all_progress.iter() {
        if record.completed {
            completed.push_back(record.clone());
        }
    }
    completed
}

pub fn get_in_progress_courses(env: Env, student: Address) -> Vec<ProgressRecord> {
    let all_progress = get_all_progress(env.clone(), student);
    let mut in_progress = vec![&env];

    for record in all_progress.iter() {
        if !record.completed {
            in_progress.push_back(record.clone());
        }
    }
    in_progress
}

pub fn get_progress_paginated(
    env: Env,
    student: Address,
    offset: u32,
    limit: u32,
) -> Vec<ProgressRecord> {
    let all_progress = get_all_progress(env.clone(), student);
    paginate(&env, &all_progress, offset, limit)
}

pub fn get_progress_above_threshold(
    env: Env,
    student: Address,
    min_progress_pct: u32,
) -> Vec<ProgressRecord> {
    assert!(min_progress_pct <= PROGRESS_MAX, "Threshold must be 0-100");
    let all_progress = get_all_progress(env.clone(), student);
    let mut filtered = vec![&env];
    
    for record in all_progress.iter() {
        if record.progress_pct >= min_progress_pct {
            filtered.push_back(record.clone());
        }
    }
    filtered
}

pub fn count_completed_courses(env: Env, student: Address) -> u32 {
    let completed = get_completed_courses(env, student);
    completed.len()
}

pub fn get_average_progress(env: Env, student: Address) -> u32 {
    let all_progress = get_all_progress(env, student);
    if all_progress.is_empty() {
        return 0;
    }
    
    let mut total: u64 = 0;
    for record in all_progress.iter() {
        total += record.progress_pct as u64;
    }
    (total / all_progress.len() as u64) as u32
}
