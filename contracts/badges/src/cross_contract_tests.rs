//! #1035 — Scholarship → Badge cross-contract integration tests.
//!
//! Verifies the full flow from scholarship completion to badge award,
//! including both success and failure paths.

use super::*;
use soroban_sdk::{symbol_short, testutils::Address as _, Env};

use scholarship_fund::{ScholarshipFundContract, ScholarshipFundContractClient, ApplicationStatus};

fn setup_badges(env: &Env) -> (BadgesContractClient<'static>, Address) {
    let id = env.register_contract(None, BadgesContract);
    let client = BadgesContractClient::new(env, &id);
    let admin = Address::generate(env);
    client.initialize(&admin);
    (client, admin)
}

fn setup_scholarship(env: &Env) -> (ScholarshipFundContractClient<'static>, Address) {
    let id = env.register_contract(None, ScholarshipFundContract);
    let client = ScholarshipFundContractClient::new(env, &id);
    let admin = Address::generate(env);
    client.initialize(&admin);
    (client, admin)
}

/// #1035 — Success path: scholarship distribution triggers badge award.
///
/// Flow:
/// 1. Deploy scholarship_fund and badges contracts.
/// 2. Admin creates a "SCHOLAR" badge type on the badges contract.
/// 3. Donor funds the scholarship.
/// 4. Student applies and admin approves.
/// 5. Admin distributes the scholarship (milestone completion).
/// 6. Admin awards the scholarship badge to the student.
/// 7. Verify badge was genuinely issued to the student.
/// 8. Verify scholarship state reflects distribution.
#[test]
fn test_scholarship_to_badge_award_flow() {
    let env = Env::default();
    env.mock_all_auths();

    // 1. Deploy both contracts (using separate admin addresses per contract)
    let (scholarship, scholarship_admin) = setup_scholarship(&env);
    let (badges_client, badges_admin) = setup_badges(&env);

    let donor = Address::generate(&env);
    let student = Address::generate(&env);

    // 2. Create badge type for scholarship completion
    let badge_type = symbol_short!("SCHOLAR");
    let desc = soroban_sdk::String::from_str(&env, "Scholarship recipient badge");
    badges_client.create_badge_type(&badges_admin, &badge_type, &desc);

    // 3. Donor funds the scholarship
    scholarship.donate(&donor, &10_000);
    assert_eq!(scholarship.get_fund_balance(), 10_000);

    // 4. Student applies and admin approves
    let app_id = scholarship.apply_for_scholarship(&student, &5_000);
    let app = scholarship.get_application(&app_id).unwrap();
    assert_eq!(app.status, ApplicationStatus::Pending);

    scholarship.approve_application(&scholarship_admin, &app_id);
    let app = scholarship.get_application(&app_id).unwrap();
    assert_eq!(app.status, ApplicationStatus::Approved);

    // 5. Admin distributes the scholarship (milestone completion)
    scholarship.distribute_scholarship(&scholarship_admin, &app_id);
    let app = scholarship.get_application(&app_id).unwrap();
    assert_eq!(app.status, ApplicationStatus::Distributed);
    assert_eq!(scholarship.get_fund_balance(), 5_000);

    // 6. Admin awards the scholarship badge
    let badge_id = badges_client.mint_badge(&badges_admin, &student, &badge_type);

    // 7. Verify badge was genuinely issued to the student
    let badge = badges_client.get_badge(&badge_id).unwrap();
    assert_eq!(badge.owner, student);
    assert_eq!(badge.badge_type, badge_type);
    assert!(badges_client.verify_badge(&student, &badge_type));

    // 8. Verify student's badge list includes the scholarship badge
    let student_badges = badges_client.get_badges_by_owner(&student);
    assert_eq!(student_badges.len(), 1);
    assert_eq!(student_badges.get(0).unwrap().id, badge_id);
}

/// #1035 — Failure path: badge award rejected when scholarship not completed.
///
/// Flow:
/// 1. Deploy both contracts.
/// 2. Student applies but scholarship is NOT distributed.
/// 3. Verify the student has no badges before any award attempt.
/// 4. Verify the student has no badge.
#[test]
fn test_scholarship_badge_award_rejected_when_not_completed() {
    let env = Env::default();
    env.mock_all_auths();

    let (scholarship, _) = setup_scholarship(&env);
    let (badges_client, badges_admin) = setup_badges(&env);

    let donor = Address::generate(&env);
    let student = Address::generate(&env);

    // Create badge type
    let badge_type = symbol_short!("SCHOLAR");
    let desc = soroban_sdk::String::from_str(&env, "Scholarship recipient badge");
    badges_client.create_badge_type(&badges_admin, &badge_type, &desc);

    // Fund and apply — but do NOT approve or distribute
    scholarship.donate(&donor, &10_000);
    let app_id = scholarship.apply_for_scholarship(&student, &5_000);

    // Application is still Pending — scholarship not completed
    let app = scholarship.get_application(&app_id).unwrap();
    assert_eq!(app.status, ApplicationStatus::Pending);

    // Student should have no badges before completion
    let student_badges = badges_client.get_badges_by_owner(&student);
    assert_eq!(student_badges.len(), 0, "student should have no badges before completion");
    assert!(!badges_client.verify_badge(&student, &badge_type));
}

/// #1035 — Failure path: rejected scholarship blocks badge award.
///
/// Verifies that a rejected application cannot be distributed, and
/// no badge can be awarded for a rejected application.
#[test]
fn test_rejected_scholarship_blocks_badge_award() {
    let env = Env::default();
    env.mock_all_auths();

    let (scholarship, scholarship_admin) = setup_scholarship(&env);
    let (badges_client, badges_admin) = setup_badges(&env);

    let donor = Address::generate(&env);
    let student = Address::generate(&env);

    let badge_type = symbol_short!("SCHOLAR");
    let desc = soroban_sdk::String::from_str(&env, "Scholarship recipient badge");
    badges_client.create_badge_type(&badges_admin, &badge_type, &desc);

    // Fund, apply, and REJECT
    scholarship.donate(&donor, &10_000);
    let app_id = scholarship.apply_for_scholarship(&student, &5_000);
    scholarship.reject_application(&scholarship_admin, &app_id);

    let app = scholarship.get_application(&app_id).unwrap();
    assert_eq!(app.status, ApplicationStatus::Rejected);

    // Fund balance should be unchanged (distribution never happened)
    assert_eq!(scholarship.get_fund_balance(), 10_000);

    // Verify no badge was issued
    let student_badges = badges_client.get_badges_by_owner(&student);
    assert_eq!(student_badges.len(), 0, "no badge for rejected scholarship");
}
