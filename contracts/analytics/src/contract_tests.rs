//! Dedicated tests for every public `AnalyticsContract` function (#1363).
//!
//! The inline `tests` module in `lib.rs` covers the progress recording happy
//! paths. This module covers the remaining public surface — access control for
//! authorised callers, milestones, the aggregation counters, the course-level
//! queries and the filtered/paginated reads — so every exported entry point of
//! the contract has at least one dedicated test.
//!
//! The contract never writes the aggregate counters itself, so these tests
//! seed the relevant storage slots directly through the contract's own
//! storage context (the same technique used elsewhere in the workspace) and
//! then read them back through the public API.

use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Events},
    Address, Env, FromVal, Symbol, Vec,
};

use crate::{
    AnalyticsContract, AnalyticsContractClient, CompletionStats, DataKey, MilestoneRecord,
    ProgressRecord, TimeBasedStats, TopPerformer,
};

/// Returns true when an event with the given two leading topics was published.
fn has_event(env: &Env, topic1: &str, topic2: &str) -> bool {
    let t1 = Symbol::new(env, topic1);
    let t2 = Symbol::new(env, topic2);
    env.events().all().iter().any(|e| {
        let topics = e.1;
        if topics.len() < 2 {
            return false;
        }
        let s0 = Symbol::from_val(env, &topics.get(0).unwrap());
        let s1 = Symbol::from_val(env, &topics.get(1).unwrap());
        s0 == t1 && s1 == t2
    })
}

fn setup() -> (Env, AnalyticsContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let student = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin, student)
}

/// Write a value into the contract's instance storage from inside the
/// contract's own storage context.
fn seed_instance<T>(env: &Env, client: &AnalyticsContractClient, key: &DataKey, value: &T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
{
    env.as_contract(&client.address, || {
        env.storage().instance().set(key, value);
    });
}

/// Write a value into the contract's persistent storage from inside the
/// contract's own storage context.
fn seed_persistent<T>(env: &Env, client: &AnalyticsContractClient, key: &DataKey, value: &T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
{
    env.as_contract(&client.address, || {
        env.storage().persistent().set(key, value);
    });
}

// =============================================================================
// Authorised callers (access control)
// =============================================================================

#[test]
fn test_authorize_caller_grants_permission() {
    let (env, client, admin, _student) = setup();
    let caller = Address::generate(&env);

    assert!(!client.is_authorized_caller(&caller));
    client.authorize_caller(&admin, &caller);
    assert!(client.is_authorized_caller(&caller));
}

#[test]
fn test_authorized_caller_can_record_progress_for_student() {
    let (env, client, admin, student) = setup();
    let caller = Address::generate(&env);
    client.authorize_caller(&admin, &caller);

    let course = symbol_short!("C1");
    client.record_progress(&caller, &student, &course, &40);

    let rec = client.get_progress(&student, &course).unwrap();
    assert_eq!(rec.progress_pct, 40);
}

#[test]
fn test_revoke_caller_removes_permission() {
    let (env, client, admin, _student) = setup();
    let caller = Address::generate(&env);

    client.authorize_caller(&admin, &caller);
    assert!(client.is_authorized_caller(&caller));

    client.revoke_caller(&admin, &caller);
    assert!(!client.is_authorized_caller(&caller));
}

#[test]
fn test_revoked_caller_can_no_longer_record_progress() {
    let (env, client, admin, student) = setup();
    let caller = Address::generate(&env);
    let course = symbol_short!("C1");

    client.authorize_caller(&admin, &caller);
    client.revoke_caller(&admin, &caller);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.record_progress(&caller, &student, &course, &40);
    }));
    assert!(result.is_err());
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_authorize_caller_rejects_non_admin() {
    let (env, client, _admin, _student) = setup();
    let caller = Address::generate(&env);
    let impostor = Address::generate(&env);

    client.authorize_caller(&impostor, &caller);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_revoke_caller_rejects_non_admin() {
    let (env, client, admin, _student) = setup();
    let caller = Address::generate(&env);
    let impostor = Address::generate(&env);

    client.authorize_caller(&admin, &caller);
    client.revoke_caller(&impostor, &caller);
}

// =============================================================================
// Milestones
// =============================================================================

#[test]
fn test_get_milestone_returns_record_for_achieved_milestone() {
    let (_env, client, _admin, student) = setup();
    let course = symbol_short!("C1");

    client.record_progress(&student, &student, &course, &50);

    let milestone = client.get_milestone(&student, &course, &50).unwrap();
    assert_eq!(milestone.milestone_pct, 50);
    assert_eq!(milestone.student, student);
    assert_eq!(milestone.course_id, course);
}

#[test]
fn test_get_milestone_returns_none_for_unachieved_milestone() {
    let (_env, client, _admin, student) = setup();
    let course = symbol_short!("C1");

    client.record_progress(&student, &student, &course, &10);

    assert!(client.get_milestone(&student, &course, &75).is_none());
}

#[test]
fn test_get_achieved_milestones_lists_every_crossed_threshold() {
    let (_env, client, _admin, student) = setup();
    let course = symbol_short!("C1");

    client.record_progress(&student, &student, &course, &80);

    let achieved = client.get_achieved_milestones(&student, &course);
    assert_eq!(achieved.len(), 3);
    assert!(achieved.contains(&25));
    assert!(achieved.contains(&50));
    assert!(achieved.contains(&75));
}

#[test]
fn test_get_achieved_milestones_is_empty_without_progress() {
    let (_env, client, _admin, student) = setup();
    let course = symbol_short!("C1");

    assert!(client.get_achieved_milestones(&student, &course).is_empty());
}

#[test]
fn test_milestone_is_recorded_only_once_per_threshold() {
    let (_env, client, _admin, student) = setup();
    let course = symbol_short!("C1");

    client.record_progress(&student, &student, &course, &50);
    client.record_progress(&student, &student, &course, &60);

    let achieved = client.get_achieved_milestones(&student, &course);
    assert_eq!(achieved.len(), 2);
    assert!(achieved.contains(&25));
    assert!(achieved.contains(&50));
}

#[test]
fn test_milestone_record_is_readable_from_storage() {
    let (env, client, _admin, student) = setup();
    let course = symbol_short!("C1");
    let key = DataKey::Milestone(student.clone(), course.clone(), 25);

    let record = MilestoneRecord {
        student: student.clone(),
        course_id: course.clone(),
        milestone_pct: 25,
        achieved_at: 42,
    };
    seed_persistent(&env, &client, &key, &record);

    let read = client.get_milestone(&student, &course, &25).unwrap();
    assert_eq!(read.achieved_at, 42);
    assert_eq!(read.milestone_pct, 25);
}

// =============================================================================
// Aggregate counters
// =============================================================================

#[test]
fn test_get_total_students_defaults_to_zero() {
    let (_env, client, _admin, _student) = setup();
    assert_eq!(client.get_total_students(), 0);
}

#[test]
fn test_get_total_students_returns_seeded_value() {
    let (env, client, _admin, _student) = setup();
    seed_instance(&env, &client, &DataKey::TotalStudents, &7_u32);

    assert_eq!(client.get_total_students(), 7);
}

#[test]
fn test_get_total_courses_defaults_to_zero() {
    let (_env, client, _admin, _student) = setup();
    assert_eq!(client.get_total_courses(), 0);
}

#[test]
fn test_get_total_courses_returns_seeded_value() {
    let (env, client, _admin, _student) = setup();
    seed_instance(&env, &client, &DataKey::TotalCourses, &3_u32);

    assert_eq!(client.get_total_courses(), 3);
}

#[test]
fn test_get_completion_stats_defaults_to_zeroed_stats() {
    let (_env, client, _admin, _student) = setup();

    let stats = client.get_completion_stats();
    assert_eq!(stats.total_completions, 0);
    assert_eq!(stats.avg_completion_rate, 0);
}

#[test]
fn test_get_completion_stats_returns_seeded_stats() {
    let (env, client, _admin, _student) = setup();
    let stats = CompletionStats {
        total_completions: 4,
        avg_completion_rate: 80,
    };
    seed_instance(&env, &client, &DataKey::CompletionStats, &stats);

    let read = client.get_completion_stats();
    assert_eq!(read.total_completions, 4);
    assert_eq!(read.avg_completion_rate, 80);
}

#[test]
fn test_get_daily_stats_returns_none_when_missing() {
    let (_env, client, _admin, _student) = setup();
    assert!(client.get_daily_stats(&1).is_none());
}

#[test]
fn test_get_daily_stats_returns_seeded_stats() {
    let (env, client, _admin, _student) = setup();
    let stats = TimeBasedStats {
        period: 1,
        completions: 2,
        avg_progress: 55,
    };
    seed_instance(&env, &client, &DataKey::DailyStats(1), &stats);

    let read = client.get_daily_stats(&1).unwrap();
    assert_eq!(read.period, 1);
    assert_eq!(read.completions, 2);
    assert_eq!(read.avg_progress, 55);
}

#[test]
fn test_get_weekly_stats_returns_none_when_missing() {
    let (_env, client, _admin, _student) = setup();
    assert!(client.get_weekly_stats(&2).is_none());
}

#[test]
fn test_get_weekly_stats_returns_seeded_stats() {
    let (env, client, _admin, _student) = setup();
    let stats = TimeBasedStats {
        period: 2,
        completions: 5,
        avg_progress: 60,
    };
    seed_instance(&env, &client, &DataKey::WeeklyStats(2), &stats);

    let read = client.get_weekly_stats(&2).unwrap();
    assert_eq!(read.period, 2);
    assert_eq!(read.completions, 5);
}

#[test]
fn test_get_monthly_stats_returns_none_when_missing() {
    let (_env, client, _admin, _student) = setup();
    assert!(client.get_monthly_stats(&3).is_none());
}

#[test]
fn test_get_monthly_stats_returns_seeded_stats() {
    let (env, client, _admin, _student) = setup();
    let stats = TimeBasedStats {
        period: 3,
        completions: 9,
        avg_progress: 70,
    };
    seed_instance(&env, &client, &DataKey::MonthlyStats(3), &stats);

    let read = client.get_monthly_stats(&3).unwrap();
    assert_eq!(read.period, 3);
    assert_eq!(read.completions, 9);
}

#[test]
fn test_get_top_performers_is_empty_by_default() {
    let (_env, client, _admin, _student) = setup();
    assert!(client.get_top_performers(&10).is_empty());
}

#[test]
fn test_get_top_performers_returns_seeded_performers() {
    let (env, client, _admin, student) = setup();
    let performers = Vec::new(&env);
    let mut seeded = performers.clone();
    seeded.push_back(TopPerformer {
        student: student.clone(),
        completion_count: 5,
        avg_progress: 90,
    });
    seed_instance(&env, &client, &DataKey::TopPerformers, &seeded);

    let read = client.get_top_performers(&10);
    assert_eq!(read.len(), 1);
    assert_eq!(read.get(0).unwrap().student, student);
    assert_eq!(read.get(0).unwrap().completion_count, 5);
}

#[test]
fn test_get_top_performers_respects_the_limit() {
    let (env, client, _admin, student) = setup();
    let mut seeded: Vec<TopPerformer> = Vec::new(&env);
    for i in 0..5_u32 {
        seeded.push_back(TopPerformer {
            student: student.clone(),
            completion_count: i,
            avg_progress: 50,
        });
    }
    seed_instance(&env, &client, &DataKey::TopPerformers, &seeded);

    assert_eq!(client.get_top_performers(&2).len(), 2);
    assert_eq!(client.get_top_performers(&0).len(), 0);
}

#[test]
fn test_update_aggregates_stores_completion_stats() {
    let (_env, client, admin, _student) = setup();

    client.update_aggregates(&admin);

    let stats = client.get_completion_stats();
    assert_eq!(stats.total_completions, 0);
    assert_eq!(stats.avg_completion_rate, 0);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_update_aggregates_rejects_non_admin() {
    let (env, client, _admin, _student) = setup();
    let impostor = Address::generate(&env);

    client.update_aggregates(&impostor);
}

// =============================================================================
// Course-level queries
// =============================================================================

#[test]
fn test_get_students_by_course_is_empty_without_enrolment() {
    let (_env, client, _admin, _student) = setup();
    assert!(client.get_students_by_course(&symbol_short!("C1")).is_empty());
}

#[test]
fn test_get_students_by_course_returns_enrolled_students() {
    let (_env, client, _admin, student) = setup();
    let course = symbol_short!("C1");
    client.record_progress(&student, &student, &course, &30);

    let students = client.get_students_by_course(&course);
    assert_eq!(students.len(), 1);
    assert_eq!(students.get(0).unwrap(), student);
}

#[test]
fn test_get_course_progress_returns_records_for_enrolled_students() {
    let (_env, client, _admin, student) = setup();
    let course = symbol_short!("C1");
    client.record_progress(&student, &student, &course, &30);

    let records = client.get_course_progress(&course);
    assert_eq!(records.len(), 1);
    assert_eq!(records.get(0).unwrap().progress_pct, 30);
}

#[test]
fn test_get_course_progress_is_empty_without_enrolment() {
    let (_env, client, _admin, _student) = setup();
    assert!(client.get_course_progress(&symbol_short!("C1")).is_empty());
}

#[test]
fn test_get_course_completion_count_counts_completed_records() {
    let (_env, client, _admin, student) = setup();
    let course = symbol_short!("C1");
    client.record_progress(&student, &student, &course, &100);

    assert_eq!(client.get_course_completion_count(&course), 1);
}

#[test]
fn test_get_course_completion_count_is_zero_for_incomplete_records() {
    let (_env, client, _admin, student) = setup();
    let course = symbol_short!("C1");
    client.record_progress(&student, &student, &course, &40);

    assert_eq!(client.get_course_completion_count(&course), 0);
}

#[test]
fn test_get_course_average_progress_averages_records() {
    let (_env, client, _admin, student) = setup();
    let course = symbol_short!("C1");
    client.record_progress(&student, &student, &course, &40);

    assert_eq!(client.get_course_average_progress(&course), 40);
}

#[test]
fn test_get_course_average_progress_is_zero_without_records() {
    let (_env, client, _admin, _student) = setup();
    assert_eq!(
        client.get_course_average_progress(&symbol_short!("C1")),
        0
    );
}

// =============================================================================
// Filtered and paginated reads
// =============================================================================

#[test]
fn test_get_completed_courses_only_returns_completed_records() {
    let (_env, client, _admin, student) = setup();
    let done = symbol_short!("DONE");
    let wip = symbol_short!("WIP");

    client.record_progress(&student, &student, &done, &100);
    client.record_progress(&student, &student, &wip, &20);

    let completed = client.get_completed_courses(&student);
    assert_eq!(completed.len(), 1);
    assert_eq!(completed.get(0).unwrap().course_id, done);
}

#[test]
fn test_get_in_progress_courses_only_returns_unfinished_records() {
    let (_env, client, _admin, student) = setup();
    let done = symbol_short!("DONE");
    let wip = symbol_short!("WIP");

    client.record_progress(&student, &student, &done, &100);
    client.record_progress(&student, &student, &wip, &20);

    let in_progress = client.get_in_progress_courses(&student);
    assert_eq!(in_progress.len(), 1);
    assert_eq!(in_progress.get(0).unwrap().course_id, wip);
}

#[test]
fn test_get_progress_paginated_returns_requested_page() {
    let (_env, client, _admin, student) = setup();
    for course in [symbol_short!("A"), symbol_short!("B"), symbol_short!("C")] {
        client.record_progress(&student, &student, &course, &10);
    }

    let page = client.get_progress_paginated(&student, &0, &2);
    assert_eq!(page.len(), 2);

    let last = client.get_progress_paginated(&student, &2, &2);
    assert_eq!(last.len(), 1);
}

#[test]
fn test_get_progress_paginated_is_empty_past_the_end() {
    let (_env, client, _admin, student) = setup();
    let course = symbol_short!("C1");
    client.record_progress(&student, &student, &course, &10);

    assert!(client.get_progress_paginated(&student, &5, &10).is_empty());
}

#[test]
fn test_get_progress_above_threshold_filters_by_minimum() {
    let (_env, client, _admin, student) = setup();
    let high = symbol_short!("HIGH");
    let low = symbol_short!("LOW");

    client.record_progress(&student, &student, &high, &80);
    client.record_progress(&student, &student, &low, &10);

    let filtered = client.get_progress_above_threshold(&student, &50);
    assert_eq!(filtered.len(), 1);
    assert_eq!(filtered.get(0).unwrap().course_id, high);
}

#[test]
fn test_count_completed_courses_counts_only_completed() {
    let (_env, client, _admin, student) = setup();
    let done = symbol_short!("DONE");
    let wip = symbol_short!("WIP");

    client.record_progress(&student, &student, &done, &100);
    client.record_progress(&student, &student, &wip, &20);

    assert_eq!(client.count_completed_courses(&student), 1);
}

#[test]
fn test_get_average_progress_averages_all_records() {
    let (_env, client, _admin, student) = setup();
    let a = symbol_short!("A");
    let b = symbol_short!("B");

    client.record_progress(&student, &student, &a, &40);
    client.record_progress(&student, &student, &b, &60);

    assert_eq!(client.get_average_progress(&student), 50);
}

#[test]
fn test_get_average_progress_is_zero_without_records() {
    let (_env, client, _admin, student) = setup();
    assert_eq!(client.get_average_progress(&student), 0);
}

// =============================================================================
// Progress reads
// =============================================================================

#[test]
fn test_get_progress_returns_none_for_unknown_course() {
    let (_env, client, _admin, student) = setup();
    assert!(client.get_progress(&student, &symbol_short!("NOPE")).is_none());
}

#[test]
fn test_get_all_progress_is_empty_for_unknown_student() {
    let (_env, client, _admin, student) = setup();
    assert!(client.get_all_progress(&student).is_empty());
}

#[test]
fn test_get_all_progress_returns_every_record_for_the_student() {
    let (_env, client, _admin, student) = setup();
    let a = symbol_short!("A");
    let b = symbol_short!("B");

    client.record_progress(&student, &student, &a, &10);
    client.record_progress(&student, &student, &b, &20);

    let records = client.get_all_progress(&student);
    assert_eq!(records.len(), 2);
}

#[test]
fn test_reset_progress_removes_the_record_from_the_secondary_index() {
    let (_env, client, admin, student) = setup();
    let course = symbol_short!("C1");
    let other = symbol_short!("C2");

    client.record_progress(&student, &student, &course, &30);
    client.record_progress(&student, &student, &other, &40);

    client.reset_progress(&admin, &student, &course);

    assert!(client.get_progress(&student, &course).is_none());
    let remaining = client.get_all_progress(&student);
    assert_eq!(remaining.len(), 1);
    assert_eq!(remaining.get(0).unwrap().course_id, other);
}

#[test]
fn test_reset_progress_for_unknown_course_is_a_no_op() {
    let (_env, client, admin, student) = setup();
    let course = symbol_short!("C1");
    client.record_progress(&student, &student, &course, &30);

    client.reset_progress(&admin, &student, &symbol_short!("OTHER"));

    assert!(client.get_progress(&student, &course).is_some());
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_reset_progress_rejects_non_admin() {
    let (env, client, _admin, student) = setup();
    let course = symbol_short!("C1");
    let impostor = Address::generate(&env);

    client.record_progress(&student, &student, &course, &30);
    client.reset_progress(&impostor, &student, &course);
}

// =============================================================================
// Events
// =============================================================================

#[test]
fn test_authorize_caller_emits_an_event() {
    let (env, client, admin, _student) = setup();
    let caller = Address::generate(&env);

    client.authorize_caller(&admin, &caller);

    assert!(has_event(&env, "analytics", "auth_add"));
}

#[test]
fn test_revoke_caller_emits_an_event() {
    let (env, client, admin, _student) = setup();
    let caller = Address::generate(&env);
    client.authorize_caller(&admin, &caller);

    client.revoke_caller(&admin, &caller);

    assert!(has_event(&env, "analytics", "auth_rm"));
}

#[test]
fn test_update_aggregates_emits_an_event() {
    let (env, client, admin, _student) = setup();

    client.update_aggregates(&admin);

    assert!(has_event(&env, "analytics", "agg_upd"));
}

// =============================================================================
// Storage round-trip
// =============================================================================

#[test]
fn test_progress_record_round_trips_through_storage() {
    let (env, client, _admin, student) = setup();
    let course = symbol_short!("C1");
    let key = DataKey::Progress(student.clone(), course.clone());

    let record = ProgressRecord {
        student: student.clone(),
        course_id: course.clone(),
        progress_pct: 55,
        completed: false,
        timestamp: 123,
    };
    seed_persistent(&env, &client, &key, &record);

    let read = client.get_progress(&student, &course).unwrap();
    assert_eq!(read.progress_pct, 55);
    assert_eq!(read.timestamp, 123);
    assert!(!read.completed);
}

#[test]
fn test_authorized_caller_flag_round_trips_through_storage() {
    let (env, client, _admin, _student) = setup();
    let caller = Address::generate(&env);

    seed_instance(&env, &client, &DataKey::AuthorizedCaller(caller.clone()), &true);

    assert!(client.is_authorized_caller(&caller));
}

#[test]
fn test_symbol_topic_helpers_are_usable() {
    // Guards the `Symbol` import used by the event assertions above.
    let env = Env::default();
    let s: Symbol = symbol_short!("analytics");
    assert_eq!(s, symbol_short!("analytics"));
    assert_eq!(env.ledger().sequence(), 0);
}
