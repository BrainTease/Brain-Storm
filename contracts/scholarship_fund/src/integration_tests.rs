#[cfg(test)]
mod integration_tests {
    use crate::{ApplicationStatus, ScholarshipFundContract, ScholarshipFundContractClient, FundReport};
    use soroban_sdk::{testutils::Address as _, Address, Env};

    fn setup() -> (Env, ScholarshipFundContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, ScholarshipFundContract);
        let client = ScholarshipFundContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin)
    }

    #[test]
    fn test_e2e_complete_disbursement_flow() {
        let (env, client, admin) = setup();

        // Step 1: Donors contribute to the fund
        let donor1 = Address::generate(&env);
        let donor2 = Address::generate(&env);
        client.donate(&donor1, &10_000);
        client.donate(&donor2, &5_000);
        assert_eq!(client.get_fund_balance(), 15_000);

        // Step 2: Students apply for scholarships
        let student1 = Address::generate(&env);
        let student2 = Address::generate(&env);
        let app1_id = client.apply_for_scholarship(&student1, &3_000);
        let app2_id = client.apply_for_scholarship(&student2, &2_000);

        let report = client.get_fund_report();
        assert_eq!(report.total_applications, 2);
        assert_eq!(report.pending_count, 2);
        assert_eq!(report.approved_count, 0);

        // Step 3: Admin approves applications
        client.approve_application(&admin, &app1_id);
        client.approve_application(&admin, &app2_id);

        let report = client.get_fund_report();
        assert_eq!(report.pending_count, 0);
        assert_eq!(report.approved_count, 2);

        // Step 4: Distribute scholarships
        client.distribute_scholarship(&admin, &app1_id);
        assert_eq!(client.get_fund_balance(), 12_000);

        let app1 = client.get_application(&app1_id).unwrap();
        assert_eq!(app1.status, ApplicationStatus::Distributed);

        client.distribute_scholarship(&admin, &app2_id);
        assert_eq!(client.get_fund_balance(), 10_000);

        let report = client.get_fund_report();
        assert_eq!(report.total_balance, 10_000);
        assert_eq!(report.distributed_count, 2);
        assert_eq!(report.total_distributed, 5_000);
    }

    #[test]
    fn test_multiple_students_mixed_outcomes() {
        let (env, client, admin) = setup();

        let donor = Address::generate(&env);
        client.donate(&donor, &10_000);

        // Create 5 applications
        let apps: Vec<u64> = (0..5)
            .map(|i| {
                let student = Address::generate(&env);
                client.apply_for_scholarship(&student, &(1000 * (i + 1)))
            })
            .collect();

        // Approve some, reject others
        client.approve_application(&admin, &apps[0]);
        client.approve_application(&admin, &apps[1]);
        client.reject_application(&admin, &apps[2]);
        client.approve_application(&admin, &apps[3]);

        // Distribute some approved
        client.distribute_scholarship(&admin, &apps[0]);
        client.distribute_scholarship(&admin, &apps[1]);

        let report = client.get_fund_report();
        assert_eq!(report.total_applications, 5);
        assert_eq!(report.approved_count, 3);
        assert_eq!(report.rejected_count, 1);
        assert_eq!(report.pending_count, 1);
        assert_eq!(report.distributed_count, 2);
        assert_eq!(report.total_distributed, 3_000);
        assert_eq!(report.total_balance, 7_000);
    }

    #[test]
    fn test_insufficient_funds_blocks_distribution() {
        let (env, client, admin) = setup();

        let donor = Address::generate(&env);
        client.donate(&donor, &1_000);

        let student = Address::generate(&env);
        let app_id = client.apply_for_scholarship(&student, &2_000);
        client.approve_application(&admin, &app_id);

        // Distribution should fail due to insufficient funds
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.distribute_scholarship(&admin, &app_id);
        }));

        assert!(result.is_err());
        assert_eq!(client.get_fund_balance(), 1_000);
    }

    #[test]
    fn test_partial_fund_distribution() {
        let (env, client, admin) = setup();

        let donor = Address::generate(&env);
        client.donate(&donor, &5_000);

        let students: Vec<u64> = (0..3)
            .map(|i| {
                let student = Address::generate(&env);
                let app_id = client.apply_for_scholarship(&student, &2_000);
                client.approve_application(&admin, &app_id);
                app_id
            })
            .collect();

        // Can distribute to first two but not third
        client.distribute_scholarship(&admin, &students[0]);
        assert_eq!(client.get_fund_balance(), 3_000);

        client.distribute_scholarship(&admin, &students[1]);
        assert_eq!(client.get_fund_balance(), 1_000);

        // Third cannot be distributed (insufficient funds)
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.distribute_scholarship(&admin, &students[2]);
        }));
        assert!(result.is_err());
    }

    #[test]
    fn test_fund_report_accuracy() {
        let (env, client, admin) = setup();

        let donor1 = Address::generate(&env);
        let donor2 = Address::generate(&env);
        client.donate(&donor1, &6_000);
        client.donate(&donor2, &4_000);

        let app_ids: Vec<u64> = (0..4)
            .map(|i| {
                let student = Address::generate(&env);
                client.apply_for_scholarship(&student, &1_000 + (i * 500) as i128)
            })
            .collect();

        client.approve_application(&admin, &app_ids[0]);
        client.approve_application(&admin, &app_ids[1]);
        client.reject_application(&admin, &app_ids[2]);

        client.distribute_scholarship(&admin, &app_ids[0]);

        let report = client.get_fund_report();
        assert_eq!(report.total_balance, 9_000);
        assert_eq!(report.total_applications, 4);
        assert_eq!(report.pending_count, 1);
        assert_eq!(report.approved_count, 1);
        assert_eq!(report.rejected_count, 1);
        assert_eq!(report.distributed_count, 1);
        assert_eq!(report.total_distributed, 1_000);
    }

    #[test]
    fn test_pagination_get_all_applications() {
        let (env, client, _admin) = setup();

        let donor = Address::generate(&env);
        client.donate(&donor, &100_000);

        for i in 0..10 {
            let student = Address::generate(&env);
            client.apply_for_scholarship(&student, &1_000 + (i as i128 * 100));
        }

        // Get first 5
        let first_batch = client.get_all_applications(&0, &5);
        assert_eq!(first_batch.len(), 5);

        // Get second 5
        let second_batch = client.get_all_applications(&5, &5);
        assert_eq!(second_batch.len(), 5);

        // Get beyond total
        let beyond = client.get_all_applications(&8, &5);
        assert_eq!(beyond.len(), 2);
    }

    #[test]
    fn test_donor_contributions_tracked_separately() {
        let (env, client, _) = setup();

        let donor1 = Address::generate(&env);
        let donor2 = Address::generate(&env);
        let donor3 = Address::generate(&env);

        client.donate(&donor1, &1_000);
        client.donate(&donor2, &2_000);
        client.donate(&donor1, &500);
        client.donate(&donor3, &1_500);
        client.donate(&donor2, &500);

        assert_eq!(client.get_donor_total(&donor1), 1_500);
        assert_eq!(client.get_donor_total(&donor2), 2_500);
        assert_eq!(client.get_donor_total(&donor3), 1_500);
        assert_eq!(client.get_fund_balance(), 5_500);
    }

    #[test]
    fn test_application_lifecycle_pending_approved_distributed() {
        let (env, client, admin) = setup();

        let donor = Address::generate(&env);
        client.donate(&donor, &5_000);

        let student = Address::generate(&env);
        let app_id = client.apply_for_scholarship(&student, &2_000);

        let app = client.get_application(&app_id).unwrap();
        assert_eq!(app.status, ApplicationStatus::Pending);

        client.approve_application(&admin, &app_id);
        let app = client.get_application(&app_id).unwrap();
        assert_eq!(app.status, ApplicationStatus::Approved);

        client.distribute_scholarship(&admin, &app_id);
        let app = client.get_application(&app_id).unwrap();
        assert_eq!(app.status, ApplicationStatus::Distributed);
    }

    #[test]
    fn test_cannot_process_already_processed_application() {
        let (env, client, admin) = setup();

        let donor = Address::generate(&env);
        client.donate(&donor, &5_000);

        let student = Address::generate(&env);
        let app_id = client.apply_for_scholarship(&student, &2_000);

        client.approve_application(&admin, &app_id);

        // Cannot approve again
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.approve_application(&admin, &app_id);
        }));
        assert!(result.is_err());
    }

    #[test]
    fn test_cannot_distribute_rejected_application() {
        let (env, client, admin) = setup();

        let donor = Address::generate(&env);
        client.donate(&donor, &5_000);

        let student = Address::generate(&env);
        let app_id = client.apply_for_scholarship(&student, &2_000);

        client.reject_application(&admin, &app_id);

        // Cannot distribute rejected app
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.distribute_scholarship(&admin, &app_id);
        }));
        assert!(result.is_err());
    }

    #[test]
    fn test_zero_applications_report() {
        let (_env, client, _) = setup();

        let report = client.get_fund_report();
        assert_eq!(report.total_applications, 0);
        assert_eq!(report.pending_count, 0);
        assert_eq!(report.approved_count, 0);
        assert_eq!(report.distributed_count, 0);
        assert_eq!(report.rejected_count, 0);
        assert_eq!(report.total_distributed, 0);
    }

    #[test]
    fn test_large_donation_and_distribution() {
        let (env, client, admin) = setup();

        let donor = Address::generate(&env);
        let large_amount = 1_000_000_000_i128;
        client.donate(&donor, &large_amount);

        let student = Address::generate(&env);
        let app_id = client.apply_for_scholarship(&student, &500_000_000);

        client.approve_application(&admin, &app_id);
        client.distribute_scholarship(&admin, &app_id);

        assert_eq!(client.get_fund_balance(), 500_000_000);
        let report = client.get_fund_report();
        assert_eq!(report.total_distributed, 500_000_000);
    }
}
