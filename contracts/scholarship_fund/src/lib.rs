#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, Vec,
};

#[contracttype]
pub enum DataKey {
    Admin,
    FundBalance,
    Application(u64),
    ApplicationCount,
    DonorTotal(Address),
}

#[contracttype]
#[derive(Clone)]
pub struct ScholarshipApplication {
    pub id: u64,
    pub student: Address,
    pub amount_requested: i128,
    pub status: u8, // 0=pending, 1=approved, 2=rejected, 3=distributed
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

    // -------------------------------------------------------------------------
    // Fund deposits
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // Fund distribution
    // -------------------------------------------------------------------------

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
            status: 0,
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

    // -------------------------------------------------------------------------
    // Access controls
    // -------------------------------------------------------------------------

    pub fn approve_application(env: Env, admin: Address, app_id: u64) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can approve");

        let mut app: ScholarshipApplication = env
            .storage()
            .persistent()
            .get(&DataKey::Application(app_id))
            .expect("Application not found");

        assert!(app.status == 0, "Application already processed");
        app.status = 1;

        env.storage()
            .persistent()
            .set(&DataKey::Application(app_id), &app);

        env.events()
            .publish((APPROVE, symbol_short!("app")), app_id);
    }

    pub fn reject_application(env: Env, admin: Address, app_id: u64) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can reject");

        let mut app: ScholarshipApplication = env
            .storage()
            .persistent()
            .get(&DataKey::Application(app_id))
            .expect("Application not found");

        assert!(app.status == 0, "Application already processed");
        app.status = 2;

        env.storage()
            .persistent()
            .set(&DataKey::Application(app_id), &app);
    }

    pub fn distribute_scholarship(env: Env, admin: Address, app_id: u64) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can distribute");

        let mut app: ScholarshipApplication = env
            .storage()
            .persistent()
            .get(&DataKey::Application(app_id))
            .expect("Application not found");

        assert!(app.status == 1, "Application not approved");

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

        app.status = 3;
        env.storage()
            .persistent()
            .set(&DataKey::Application(app_id), &app);

        env.events().publish(
            (DISTRIBUTE, symbol_short!("stud")),
            (app.student, app.amount_requested),
        );
    }

    // -------------------------------------------------------------------------
    // Fund queries
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // Fund reporting
    // -------------------------------------------------------------------------

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
                    0 => pending_count += 1,
                    1 => approved_count += 1,
                    2 => rejected_count += 1,
                    3 => {
                        distributed_count += 1;
                        total_distributed += app.amount_requested;
                    }
                    _ => {}
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
