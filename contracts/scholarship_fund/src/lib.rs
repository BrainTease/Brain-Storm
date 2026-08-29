#![no_std]

// Issue #1004: Dead Code Analysis
// ================================
// Verified via: `cargo clippy --all-targets -- -W dead_code`
// Result: ZERO dead code warnings
// All functions are actively used and tested:
// - initialize: Called in all test setups
// - donate: Called by test_donate* tests  
// - apply_for_scholarship: Called by test_apply* tests
// - approve/reject/distribute_scholarship: Called by approval workflow tests
// - get_fund_balance/report/application/donor_total: Query functions used in tests
// No dead code functions or feature-flagged code from earlier revisions found.

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, Vec,
};

use brain_storm_shared::access;

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum ApplicationStatus {
    Pending,
    Approved,
    Rejected,
    Distributed,
}

#[contracttype]
pub enum DataKey {
    /// Contract administrator address
    Admin,
    /// Current fund balance
    FundBalance,
    /// Individual scholarship application by ID
    Application(u64),
    /// Total number of applications submitted
    ApplicationCount,
    /// Total amount donated by address
    DonorTotal(Address),
}

#[contracttype]
#[derive(Clone)]
pub struct ScholarshipApplication {
    pub id: u64,
    pub student: Address,
    pub amount_requested: i128,
    /// Status using type-safe enum instead of u8
    pub status: ApplicationStatus,
    pub applied_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct FundReport {
    pub total_balance: i128,
    pub total_applications: u64,
    pub pending_count: u64,
    pub approved_count: u64,
    pub distributed_count: u64,
    pub rejected_count: u64,
    pub total_distributed: i128,
}

const DONATE: Symbol = symbol_short!("donate");
const APPLY: Symbol = symbol_short!("apply");
const APPROVE: Symbol = symbol_short!("appr");
const DISTRIBUTE: Symbol = symbol_short!("dist");

#[contract]
pub struct ScholarshipFundContract;

#[contractimpl]
impl ScholarshipFundContract {
    pub fn initialize(env: Env, admin: Address) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "Already initialized"
        );
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::FundBalance, &0_i128);
        env.storage()
            .instance()
            .set(&DataKey::ApplicationCount, &0_u64);
    }

    // ---- Fund deposits ----

    pub fn donate(env: Env, donor: Address, amount: i128) {
        donor.require_auth();
        assert!(amount > 0, "Donation must be positive");

        let mut balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::FundBalance)
            .unwrap_or(0);
        balance += amount;
        env.storage()
            .instance()
            .set(&DataKey::FundBalance, &balance);

        let mut donor_total: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::DonorTotal(donor.clone()))
            .unwrap_or(0);
        donor_total += amount;
        env.storage()
            .persistent()
            .set(&DataKey::DonorTotal(donor.clone()), &donor_total);

        env.events()
            .publish((DONATE, symbol_short!("fund")), (donor, amount));
    }

    // ---- Fund distribution ----

    pub fn apply_for_scholarship(env: Env, student: Address, amount_requested: i128) -> u64 {
        student.require_auth();
        assert!(amount_requested > 0, "Amount must be positive");

        let app_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ApplicationCount)
            .unwrap_or(0);

        let application = ScholarshipApplication {
            id: app_id,
            student: student.clone(),
            amount_requested,
            status: ApplicationStatus::Pending,
            applied_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Application(app_id), &application);
        env.storage()
            .instance()
            .set(&DataKey::ApplicationCount, &(app_id + 1));

        env.events()
            .publish((APPLY, symbol_short!("stud")), (student, app_id));

        app_id
    }

    // ---- Access controls ----

    pub fn approve_application(env: Env, admin: Address, app_id: u64) {
        access::require_admin(&env, &admin, &DataKey::Admin);

        let mut app: ScholarshipApplication = env
            .storage()
            .persistent()
            .get(&DataKey::Application(app_id))
            .expect("Application not found");

        assert!(
            app.status == ApplicationStatus::Pending,
            "Application already processed"
        );
        app.status = ApplicationStatus::Approved;

        env.storage()
            .persistent()
            .set(&DataKey::Application(app_id), &app);

        env.events()
            .publish((APPROVE, symbol_short!("app")), app_id);
    }

    pub fn reject_application(env: Env, admin: Address, app_id: u64) {
        access::require_admin(&env, &admin, &DataKey::Admin);

        let mut app: ScholarshipApplication = env
            .storage()
            .persistent()
            .get(&DataKey::Application(app_id))
            .expect("Application not found");

        assert!(
            app.status == ApplicationStatus::Pending,
            "Application already processed"
        );
        app.status = ApplicationStatus::Rejected;

        env.storage()
            .persistent()
            .set(&DataKey::Application(app_id), &app);
    }

    pub fn distribute_scholarship(env: Env, admin: Address, app_id: u64) {
        access::require_admin(&env, &admin, &DataKey::Admin);

        let mut app: ScholarshipApplication = env
            .storage()
            .persistent()
            .get(&DataKey::Application(app_id))
            .expect("Application not found");

        assert!(
            app.status == ApplicationStatus::Approved,
            "Application not approved"
        );

        let mut balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::FundBalance)
            .unwrap_or(0);
        assert!(balance >= app.amount_requested, "Insufficient fund balance");

        balance -= app.amount_requested;
        env.storage()
            .instance()
            .set(&DataKey::FundBalance, &balance);

        app.status = ApplicationStatus::Distributed;
        env.storage()
            .persistent()
            .set(&DataKey::Application(app_id), &app);

        env.events().publish(
            (DISTRIBUTE, symbol_short!("stud")),
            (app.student, app.amount_requested),
        );
    }

    // ---- Fund queries ----

    pub fn get_fund_balance(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::FundBalance)
            .unwrap_or(0)
    }

    pub fn get_application(env: Env, app_id: u64) -> Option<ScholarshipApplication> {
        env.storage()
            .persistent()
            .get(&DataKey::Application(app_id))
    }

    pub fn get_donor_total(env: Env, donor: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::DonorTotal(donor))
            .unwrap_or(0)
    }

    /// Returns the total number of scholarship applications submitted.
    pub fn get_application_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::ApplicationCount)
            .unwrap_or(0)
    }

    /// Returns all applications in the given index range [start, start+limit).
    pub fn get_all_applications(
        env: Env,
        start: u64,
        limit: u64,
    ) -> Vec<ScholarshipApplication> {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ApplicationCount)
            .unwrap_or(0);
        let mut result = Vec::new(&env);
        let end = (start + limit).min(count);
        for i in start..end {
            if let Some(app) = env
                .storage()
                .persistent()
                .get::<DataKey, ScholarshipApplication>(&DataKey::Application(i))
            {
                result.push_back(app);
            }
        }
        result
    }

    // ---- Fund reporting ----

    /// Returns a summary report of the fund's current state.
    pub fn get_fund_report(env: Env) -> FundReport {
        let total_balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::FundBalance)
            .unwrap_or(0);
        let total_applications: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ApplicationCount)
            .unwrap_or(0);

        let mut pending_count = 0_u64;
        let mut approved_count = 0_u64;
        let mut distributed_count = 0_u64;
        let mut rejected_count = 0_u64;
        let mut total_distributed = 0_i128;

        for i in 0..total_applications {
            if let Some(app) = env
                .storage()
                .persistent()
                .get::<DataKey, ScholarshipApplication>(&DataKey::Application(i))
            {
                match app.status {
                    ApplicationStatus::Pending => pending_count += 1,
                    ApplicationStatus::Approved => approved_count += 1,
                    ApplicationStatus::Rejected => rejected_count += 1,
                    ApplicationStatus::Distributed => {
                        distributed_count += 1;
                        total_distributed += app.amount_requested;
                    }
                }
            }
        }

        FundReport {
            total_balance,
            total_applications,
            pending_count,
            approved_count,
            distributed_count,
            rejected_count,
            total_distributed,
        }
    }
}

#[cfg(test)]
mod tests;

#[cfg(test)]
mod integration_tests;
