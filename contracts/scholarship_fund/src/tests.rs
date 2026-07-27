#[cfg(test)]
mod tests {
    use crate::{ScholarshipFundContract, ScholarshipFundContractClient};
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
    fn test_initialize_sets_zero_balance() {
        let (_, client, _) = setup();
        assert_eq!(client.get_fund_balance(), 0);
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_panics() {
        let (_, client, admin) = setup();
        client.initialize(&admin);
    }

    #[test]
    fn test_donate_increases_fund_balance() {
        let (env, client, _) = setup();
        let donor = Address::generate(&env);
        client.donate(&donor, &500);
        assert_eq!(client.get_fund_balance(), 500);
    }

    #[test]
    fn test_multiple_donations_accumulate() {
        let (env, client, _) = setup();
        let donor1 = Address::generate(&env);
        let donor2 = Address::generate(&env);
        client.donate(&donor1, &300);
        client.donate(&donor2, &200);
        assert_eq!(client.get_fund_balance(), 500);
    }

    #[test]
    #[should_panic(expected = "Donation must be positive")]
    fn test_donate_zero_panics() {
        let (env, client, _) = setup();
        let donor = Address::generate(&env);
        client.donate(&donor, &0);
    }

    #[test]
    #[should_panic(expected = "Donation must be positive")]
    fn test_donate_negative_panics() {
        let (env, client, _) = setup();
        let donor = Address::generate(&env);
        client.donate(&donor, &-1);
    }

    #[test]
    fn test_donor_total_tracked() {
        let (env, client, _) = setup();
        let donor = Address::generate(&env);
        client.donate(&donor, &300);
        client.donate(&donor, &200);
        assert_eq!(client.get_donor_total(&donor), 500);
    }

    #[test]
    fn test_apply_for_scholarship_creates_application() {
        let (env, client, _) = setup();
        let student = Address::generate(&env);
        let app_id = client.apply_for_scholarship(&student, &1000);
        let app = client.get_application(&app_id).unwrap();
        assert_eq!(app.student, student);
        assert_eq!(app.amount_requested, 1000);
        assert_eq!(app.status, 0); // pending
    }

    #[test]
    #[should_panic(expected = "Amount must be positive")]
    fn test_apply_zero_amount_panics() {
        let (env, client, _) = setup();
        let student = Address::generate(&env);
        client.apply_for_scholarship(&student, &0);
    }

    #[test]
    fn test_approve_application_changes_status() {
        let (env, client, admin) = setup();
        let donor = Address::generate(&env);
        client.donate(&donor, &5000);

        let student = Address::generate(&env);
        let app_id = client.apply_for_scholarship(&student, &1000);
        client.approve_application(&admin, &app_id);

        let app = client.get_application(&app_id).unwrap();
        assert_eq!(app.status, 1); // approved
    }

    #[test]
    fn test_reject_application_changes_status() {
        let (env, client, admin) = setup();
        let student = Address::generate(&env);
        let app_id = client.apply_for_scholarship(&student, &1000);
        client.reject_application(&admin, &app_id);

        let app = client.get_application(&app_id).unwrap();
        assert_eq!(app.status, 2); // rejected
    }

    #[test]
    fn test_distribute_scholarship_reduces_fund() {
        let (env, client, admin) = setup();
        let donor = Address::generate(&env);
        client.donate(&donor, &5000);

        let student = Address::generate(&env);
        let app_id = client.apply_for_scholarship(&student, &1000);
        client.approve_application(&admin, &app_id);
        client.distribute_scholarship(&admin, &app_id);

        assert_eq!(client.get_fund_balance(), 4000);
    }

    #[test]
    fn test_get_application_nonexistent_returns_none() {
        let (_, client, _) = setup();
        assert!(client.get_application(&999).is_none());
    }
}
