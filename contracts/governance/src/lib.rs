#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, IntoVal, String, Symbol};

use brain_storm_shared::access;
#[cfg(test)]
use brain_storm_shared::constants::{MAX_ENTRY_TTL, MIN_PERSISTENT_ENTRY_TTL, MIN_TEMP_ENTRY_TTL};

pub mod legacy;
pub mod types;
pub mod validation_helpers;
pub mod voting;

pub use types::*;

use crate::validation_helpers::{
    assert_valid_quorum_percentage, assert_valid_voting_period, DEFAULT_QUORUM_PERCENTAGE,
};
use voting::{
    VotingStrategy, VoteSupport,
    GovernanceKey, VotingProposal, VoteRecord,
    create_proposal as voting_create_proposal,
    cast_vote as voting_cast_vote,
    finalise_proposal as voting_finalise_proposal,
    execute_proposal as voting_execute_proposal,
    cancel_proposal as voting_cancel_proposal,
    delegate_vote as voting_delegate_vote,
    get_proposal as voting_get_proposal,
    get_vote_record as voting_get_vote_record,
    get_delegate as voting_get_delegate,
    compute_weight,
    integer_sqrt,
};


// =============================================================================
// Contract
// =============================================================================

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {
    // -------------------------------------------------------------------------
    // Admin / Initialization
    // -------------------------------------------------------------------------

    pub fn initialize(env: Env, admin: Address, token_contract: Address) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "Already initialized"
        );
        admin.require_auth();
        assert_valid_quorum_percentage(DEFAULT_QUORUM_PERCENTAGE);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::TokenContract, &token_contract);
        env.storage().instance().set(&DataKey::NextProposalId, &1_u64);
        // Defaults
        env.storage()
            .instance()
            .set(&GovernanceKey::VotingDelay, &0_u32);
        env.storage()
            .instance()
            .set(&GovernanceKey::TimelockDuration, &10_u32);
        env.storage()
            .instance()
            .set(&GovernanceKey::QuorumPercentage, &DEFAULT_QUORUM_PERCENTAGE);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    // -------------------------------------------------------------------------
    // Governance configuration (admin only)
    // -------------------------------------------------------------------------

    pub fn set_voting_delay(env: Env, admin: Address, delay: u32) {
        access::require_admin(&env, &admin, &DataKey::Admin);
        env.storage()
            .instance()
            .set(&GovernanceKey::VotingDelay, &delay);
    }

    pub fn set_timelock_duration(env: Env, admin: Address, duration: u32) {
        access::require_admin(&env, &admin, &DataKey::Admin);
        env.storage()
            .instance()
            .set(&GovernanceKey::TimelockDuration, &duration);
    }

    pub fn set_quorum_percentage(env: Env, admin: Address, percentage: i128) {
        access::require_admin(&env, &admin, &DataKey::Admin);
        assert_valid_quorum_percentage(percentage);
        env.storage()
            .instance()
            .set(&GovernanceKey::QuorumPercentage, &percentage);
    }

    pub fn set_total_supply_snapshot(env: Env, admin: Address, supply: i128) {
        access::require_admin(&env, &admin, &DataKey::Admin);
        env.storage()
            .instance()
            .set(&GovernanceKey::TotalSupply, &supply);
    }

    // -------------------------------------------------------------------------
    // Advanced proposal management (uses voting.rs strategies)
    // -------------------------------------------------------------------------

    /// Create a proposal with a configurable voting strategy.
    /// strategy: 0 = Weighted, 1 = Quadratic, 2 = Flat
    pub fn create_advanced_proposal(
        env: Env,
        proposer: Address,
        title: String,
        description: String,
        voting_end_ledger: u32,
        strategy: u32,
        timelock_delay: u32,
    ) -> u64 {
        assert_valid_voting_period(env.ledger().sequence(), voting_end_ledger);
        let strat = match strategy {
            1 => VotingStrategy::Quadratic,
            2 => VotingStrategy::Flat,
            _ => VotingStrategy::Weighted,
        };
        let execution_timelock = voting_end_ledger.saturating_add(timelock_delay);
        voting_create_proposal(
            &env, proposer, title, description, voting_end_ledger, strat, execution_timelock,
        )
    }

    /// Cast a vote with strategy-aware weight computation.
    /// support: 0 = For, 1 = Against, 2 = Abstain
    pub fn vote_advanced(env: Env, voter: Address, proposal_id: u64, support: u32) {
        let token_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenContract)
            .unwrap();
        let balance: i128 = env.invoke_contract(
            &token_contract,
            &symbol_short!("balance"),
            soroban_sdk::vec![&env, voter.clone().into_val(&env)],
        );

        let vote_support = match support {
            1 => VoteSupport::Against,
            2 => VoteSupport::Abstain,
            _ => VoteSupport::For,
        };

        voting_cast_vote(&env, proposal_id, voter, vote_support, balance);
    }

    /// Finalise a proposal after its voting window.
    pub fn finalise_advanced_proposal(env: Env, proposal_id: u64) -> bool {
        voting_finalise_proposal(&env, proposal_id)
    }

    /// Execute a succeeded proposal after the timelock.
    pub fn execute_advanced_proposal(env: Env, proposal_id: u64) {
        voting_execute_proposal(&env, proposal_id);
    }

    /// Cancel a proposal.
    pub fn cancel_advanced_proposal(env: Env, canceller: Address, proposal_id: u64) {
        voting_cancel_proposal(&env, canceller, proposal_id);
    }

    /// Delegate voting power to another address.
    pub fn delegate(env: Env, delegator: Address, delegate: Address) {
        voting_delegate_vote(&env, delegator, delegate);
    }

    /// Get an advanced proposal.
    pub fn get_advanced_proposal(env: Env, proposal_id: u64) -> Option<VotingProposal> {
        voting_get_proposal(&env, proposal_id)
    }

    /// Get a voter's vote record for a proposal.
    pub fn get_vote_record(env: Env, proposal_id: u64, voter: Address) -> Option<VoteRecord> {
        voting_get_vote_record(&env, proposal_id, voter)
    }

    /// Get the delegate for an address.
    pub fn get_delegate(env: Env, delegator: Address) -> Option<Address> {
        voting_get_delegate(&env, delegator)
    }

    /// Compute the effective vote weight for a balance under a given strategy.
    /// strategy: 0 = Weighted, 1 = Quadratic, 2 = Flat
    pub fn get_vote_weight(_env: Env, balance: i128, strategy: u32) -> i128 {
        let strat = match strategy {
            1 => VotingStrategy::Quadratic,
            2 => VotingStrategy::Flat,
            _ => VotingStrategy::Weighted,
        };
        compute_weight(&strat, balance)
    }

    /// Utility: integer square root (exposed for frontend tooling).
    pub fn sqrt(_env: Env, x: i128) -> i128 {
        integer_sqrt(x)
    }

    // -------------------------------------------------------------------------
    // Legacy proposal management (preserved for backward compat)
    // -------------------------------------------------------------------------

    pub fn create_proposal(
        env: Env,
        proposer: Address,
        title: String,
        description: String,
        voting_end_ledger: u32,
    ) -> u64 {
        legacy::create_proposal(env, proposer, title, description, voting_end_ledger)
    }

    pub fn vote(env: Env, voter: Address, proposal_id: u64, support: bool) {
        legacy::vote()
    }

    pub fn execute_proposal(env: Env, proposal_id: u64) {
        legacy::execute_proposal()
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Option<ProposalRecord> {
        legacy::get_proposal(env, proposal_id)
    }

    pub fn has_voted(env: Env, proposal_id: u64, voter: Address) -> bool {
        legacy::has_voted(env, proposal_id, voter)
    }

    pub fn get_voting_power(env: Env, voter: Address) -> i128 {
        legacy::get_voting_power(env, voter)
    }

    pub fn has_voting_power(env: Env, voter: Address, min_power: i128) -> bool {
        legacy::has_voting_power(env, voter, min_power)
    }

    pub fn get_vote_tally(env: Env, proposal_id: u64) -> (i128, i128, i128, bool) {
        legacy::get_vote_tally(env, proposal_id)
    }

    pub fn did_proposal_pass(env: Env, proposal_id: u64) -> bool {
        legacy::did_proposal_pass(env, proposal_id)
    }

    pub fn is_voting_active(env: Env, proposal_id: u64) -> bool {
        legacy::is_voting_active(env, proposal_id)
    }

    pub fn get_next_proposal_id(env: Env) -> u64 {
        legacy::get_next_proposal_id(env)
    }

    pub fn get_vote(env: Env, proposal_id: u64, voter: Address) -> Option<bool> {
        legacy::get_vote(env, proposal_id, voter)
    }

    // -------------------------------------------------------------------------
    // Contract upgrade governance (legacy)
    // -------------------------------------------------------------------------

    pub fn propose_upgrade(
        env: Env,
        proposer: Address,
        contract_address: Address,
        new_wasm_hash: Symbol,
        voting_end_ledger: u32,
        timelock_ledger: u32,
    ) -> u64 {
        legacy::propose_upgrade(env, proposer, contract_address, new_wasm_hash, voting_end_ledger, timelock_ledger)
    }

    pub fn vote_upgrade(env: Env, voter: Address, upgrade_id: u64, support: bool) {
        legacy::vote_upgrade()
    }

    /// Approve a passed upgrade proposal. **Stored admin only** (issue #1169):
    /// `docs/contract-interfaces.md` documents this as the admin approval gate,
    /// but the function previously took no caller at all, so anyone could flip
    /// `approved` on a proposal that had merely finished voting.
    pub fn approve_upgrade(env: Env, admin: Address, upgrade_id: u64) {
        legacy::approve_upgrade()
    }

    pub fn execute_upgrade(env: Env, upgrade_id: u64) {
        legacy::execute_upgrade()
    }

    pub fn get_upgrade_proposal(env: Env, upgrade_id: u64) -> Option<UpgradeProposalRecord> {
        legacy::get_upgrade_proposal(env, upgrade_id)
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod contract_tests;
