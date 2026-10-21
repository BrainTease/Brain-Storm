#![no_std]
use soroban_sdk::{
    contract, contractimpl, symbol_short, vec, Address, Env, IntoVal, String, Symbol, Vec,
};

mod types;
pub use types::*;

use brain_storm_shared::{access, validation};
use brain_storm_shared::constants::{
    STORAGE_TTL_EXTEND_TO as TTL_EXTEND_TO, STORAGE_TTL_THRESHOLD as TTL_THRESHOLD,
};

// =============================================================================
// Contract
// =============================================================================

#[contract]
pub struct GrantsContract;

#[contractimpl]
impl GrantsContract {
    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    pub fn initialize(env: Env, admin: Address, token_contract: Address) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "Already initialized"
        );
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::TokenContract, &token_contract);
        env.storage().instance().set(&DataKey::NextGrantId, &1_u64);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    // -------------------------------------------------------------------------
    // Grant Application
    // -------------------------------------------------------------------------

    pub fn apply_for_grant(
        env: Env,
        applicant: Address,
        title: String,
        description: String,
        total_amount: i128,
        milestone_count: u32,
    ) -> u64 {
        applicant.require_auth();
        validation::require_positive_amount(total_amount);
        assert!(milestone_count > 0, "Must have at least one milestone");

        let id: u64 = env.storage().instance().get(&DataKey::NextGrantId).unwrap();
        let grant = GrantRecord {
            id,
            applicant: applicant.clone(),
            title,
            description,
            total_amount,
            status: symbol_short!("pending"),
            created_at: env.ledger().timestamp(),
            approved_at: 0,
            milestone_count,
        };

        env.storage().persistent().set(&DataKey::Grant(id), &grant);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Grant(id), TTL_THRESHOLD, TTL_EXTEND_TO);

        // Add to applicant's grant list
        let index_key = DataKey::ApplicantGrants(applicant.clone());
        let mut grants: Vec<u64> = env
            .storage()
            .persistent()
            .get(&index_key)
            .unwrap_or_else(|| vec![&env]);
        grants.push_back(id);
        env.storage().persistent().set(&index_key, &grants);
        env.storage()
            .persistent()
            .extend_ttl(&index_key, TTL_THRESHOLD, TTL_EXTEND_TO);

        env.storage()
            .instance()
            .set(&DataKey::NextGrantId, &(id + 1));

        env.events().publish(
            (symbol_short!("grants"), symbol_short!("applied")),
            (id, applicant, total_amount),
        );

        id
    }

    // -------------------------------------------------------------------------
    // Grant Approval Workflow
    // -------------------------------------------------------------------------

    pub fn approve_grant(env: Env, admin: Address, grant_id: u64) {
        access::require_admin(&env, &admin, &DataKey::Admin);

        let mut grant: GrantRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Grant(grant_id))
            .expect("Grant not found");

        assert!(grant.status == symbol_short!("pending"), "Grant not pending");

        grant.status = symbol_short!("approved");
        grant.approved_at = env.ledger().timestamp();
        env.storage()
            .persistent()
            .set(&DataKey::Grant(grant_id), &grant);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Grant(grant_id), TTL_THRESHOLD, TTL_EXTEND_TO);

        env.events().publish(
            (symbol_short!("grants"), symbol_short!("approved")),
            (grant_id, grant.applicant),
        );
    }

    pub fn reject_grant(env: Env, admin: Address, grant_id: u64) {
        access::require_admin(&env, &admin, &DataKey::Admin);

        let mut grant: GrantRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Grant(grant_id))
            .expect("Grant not found");

        assert!(grant.status == symbol_short!("pending"), "Grant not pending");

        grant.status = symbol_short!("rejected");
        env.storage()
            .persistent()
            .set(&DataKey::Grant(grant_id), &grant);

        env.events().publish(
            (symbol_short!("grants"), symbol_short!("rejected")),
            (grant_id, grant.applicant),
        );
    }

    // -------------------------------------------------------------------------
    // Milestone-Based Fund Release
    // -------------------------------------------------------------------------

    pub fn set_milestone(
        env: Env,
        admin: Address,
        grant_id: u64,
        milestone_idx: u32,
        description: String,
        amount: i128,
    ) {
        access::require_admin(&env, &admin, &DataKey::Admin);

        let grant: GrantRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Grant(grant_id))
            .expect("Grant not found");

        assert!(milestone_idx < grant.milestone_count, "Invalid milestone index");
        validation::require_positive_amount(amount);

        let milestone = MilestoneRecord {
            grant_id,
            milestone_idx,
            description,
            amount,
            released: false,
            released_at: 0,
        };

        let key = DataKey::GrantMilestone(grant_id, milestone_idx);
        env.storage().persistent().set(&key, &milestone);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);

        env.events().publish(
            (symbol_short!("grants"), symbol_short!("milestone")),
            (grant_id, milestone_idx, amount),
        );
    }

    pub fn release_milestone_funds(env: Env, admin: Address, grant_id: u64, milestone_idx: u32) {
        access::require_admin(&env, &admin, &DataKey::Admin);

        let grant: GrantRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Grant(grant_id))
            .expect("Grant not found");

        assert!(grant.status == symbol_short!("approved"), "Grant not approved");

        let key = DataKey::GrantMilestone(grant_id, milestone_idx);
        let mut milestone: MilestoneRecord = env
            .storage()
            .persistent()
            .get(&key)
            .expect("Milestone not found");

        assert!(!milestone.released, "Milestone already released");

        milestone.released = true;
        milestone.released_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &milestone);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);

        // Transfer tokens to applicant
        let token_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenContract)
            .unwrap();
        let _: () = env.invoke_contract(
            &token_contract,
            &symbol_short!("transfer"),
            soroban_sdk::vec![
                &env,
                admin.into_val(&env),
                grant.applicant.clone().into_val(&env),
                milestone.amount.into_val(&env)
            ],
        );

        env.events().publish(
            (symbol_short!("grants"), symbol_short!("released")),
            (grant_id, milestone_idx, milestone.amount),
        );
    }

    // -------------------------------------------------------------------------
    // Grant Reporting
    // -------------------------------------------------------------------------

    pub fn submit_report(
        env: Env,
        applicant: Address,
        grant_id: u64,
        content: String,
    ) {
        applicant.require_auth();

        let grant: GrantRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Grant(grant_id))
            .expect("Grant not found");

        assert!(grant.applicant == applicant, "Only grant applicant can report");

        let report_key = DataKey::GrantReporting(grant_id);
        let mut reports: Vec<ReportRecord> = env
            .storage()
            .persistent()
            .get(&report_key)
            .unwrap_or_else(|| vec![&env]);

        let report = ReportRecord {
            grant_id,
            report_idx: reports.len(),
            content,
            submitted_at: env.ledger().timestamp(),
        };

        reports.push_back(report);
        env.storage().persistent().set(&report_key, &reports);
        env.storage()
            .persistent()
            .extend_ttl(&report_key, TTL_THRESHOLD, TTL_EXTEND_TO);

        env.events().publish(
            (symbol_short!("grants"), symbol_short!("report")),
            (grant_id, reports.len()),
        );
    }

    // -------------------------------------------------------------------------
    // Reading
    // -------------------------------------------------------------------------

    pub fn get_grant(env: Env, grant_id: u64) -> Option<GrantRecord> {
        let key = DataKey::Grant(grant_id);
        let grant = env.storage().persistent().get(&key)?;
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        Some(grant)
    }

    pub fn get_milestone(
        env: Env,
        grant_id: u64,
        milestone_idx: u32,
    ) -> Option<MilestoneRecord> {
        let key = DataKey::GrantMilestone(grant_id, milestone_idx);
        let milestone = env.storage().persistent().get(&key)?;
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        Some(milestone)
    }

    pub fn get_grant_reports(env: Env, grant_id: u64) -> Vec<ReportRecord> {
        let key = DataKey::GrantReporting(grant_id);
        match env.storage().persistent().get(&key) {
            Some(reports) => {
                env.storage()
                    .persistent()
                    .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
                reports
            }
            None => vec![&env],
        }
    }

    pub fn get_applicant_grants(env: Env, applicant: Address) -> Vec<u64> {
        let key = DataKey::ApplicantGrants(applicant);
        match env.storage().persistent().get(&key) {
            Some(grants) => {
                env.storage()
                    .persistent()
                    .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
                grants
            }
            None => vec![&env],
        }
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests_ext;

#[cfg(test)]
mod contract_tests;
