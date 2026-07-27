#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, IntoVal, String, Symbol,
};

pub mod voting;

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
// Storage keys (legacy + admin)
// =============================================================================

#[contracttype]
pub enum DataKey {
    Admin,
    TokenContract,
    Proposal(u64),
    Vote(u64, Address),
    NextProposalId,
    UpgradeProposal(u64),
    TimelockExpiry(u64),
}

// =============================================================================
// Legacy structs (kept for on-chain state backward compat)
// =============================================================================

#[contracttype]
#[derive(Clone)]
pub struct ProposalRecord {
    pub id: u64,
    pub proposer: Address,
    pub title: String,
    pub description: String,
    pub voting_end_ledger: u32,
    pub votes_for: i128,
    pub votes_against: i128,
    pub executed: bool,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct UpgradeProposalRecord {
    pub id: u64,
    pub proposer: Address,
    pub contract_address: Address,
    pub new_wasm_hash: Symbol,
    pub voting_end_ledger: u32,
    pub votes_for: i128,
    pub votes_against: i128,
    pub approved: bool,
    pub executed: bool,
    pub timelock_ledger: u32,
    pub created_at: u64,
}

// =============================================================================
// Events
// =============================================================================

const PROPOSAL_CREATED: Symbol = symbol_short!("prop_new");
const VOTE_CAST: Symbol = symbol_short!("vote");
const PROPOSAL_EXECUTED: Symbol = symbol_short!("exec");
const UPGRADE_PROPOSED: Symbol = symbol_short!("upg_prop");
const UPGRADE_APPROVED: Symbol = symbol_short!("upg_appr");
const UPGRADE_EXECUTED: Symbol = symbol_short!("upg_exec");

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
            .set(&GovernanceKey::QuorumPercentage, &20_i128);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    // -------------------------------------------------------------------------
    // Governance configuration (admin only)
    // -------------------------------------------------------------------------

    pub fn set_voting_delay(env: Env, admin: Address, delay: u32) {
        admin.require_auth();
        let stored: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored, "Only admin");
        env.storage()
            .instance()
            .set(&GovernanceKey::VotingDelay, &delay);
    }

    pub fn set_timelock_duration(env: Env, admin: Address, duration: u32) {
        admin.require_auth();
        let stored: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored, "Only admin");
        env.storage()
            .instance()
            .set(&GovernanceKey::TimelockDuration, &duration);
    }

    pub fn set_quorum_percentage(env: Env, admin: Address, percentage: i128) {
        admin.require_auth();
        let stored: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored, "Only admin");
        assert!(percentage > 0 && percentage <= 100, "Quorum must be 1-100");
        env.storage()
            .instance()
            .set(&GovernanceKey::QuorumPercentage, &percentage);
    }

    pub fn set_total_supply_snapshot(env: Env, admin: Address, supply: i128) {
        admin.require_auth();
        let stored: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored, "Only admin");
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
    pub fn get_vote_weight(env: Env, balance: i128, strategy: u32) -> i128 {
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
        proposer.require_auth();
        assert!(
            voting_end_ledger > env.ledger().sequence(),
            "Voting end must be in future"
        );

        let id: u64 = env.storage().instance().get(&DataKey::NextProposalId).unwrap();
        let proposal = ProposalRecord {
            id,
            proposer: proposer.clone(),
            title,
            description,
            voting_end_ledger,
            votes_for: 0,
            votes_against: 0,
            executed: false,
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(id), &proposal);
        env.storage()
            .instance()
            .set(&DataKey::NextProposalId, &(id + 1));

        env.events()
            .publish((PROPOSAL_CREATED, symbol_short!("id")), id);
        id
    }

    pub fn vote(env: Env, voter: Address, proposal_id: u64, support: bool) {
        voter.require_auth();

        let mut proposal: ProposalRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .expect("Proposal not found");

        assert!(
            env.ledger().sequence() < proposal.voting_end_ledger,
            "Voting period ended"
        );
        assert!(!proposal.executed, "Proposal already executed");

        let vote_key = DataKey::Vote(proposal_id, voter.clone());
        assert!(
            !env.storage().persistent().has(&vote_key),
            "Already voted"
        );

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
        assert!(balance > 0, "No voting power");

        env.storage().persistent().set(&vote_key, &support);

        if support {
            proposal.votes_for += balance;
        } else {
            proposal.votes_against += balance;
        }
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        env.events()
            .publish((VOTE_CAST, symbol_short!("voter")), (proposal_id, support));
    }

    pub fn execute_proposal(env: Env, proposal_id: u64) {
        let mut proposal: ProposalRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .expect("Proposal not found");

        assert!(
            env.ledger().sequence() >= proposal.voting_end_ledger,
            "Voting still ongoing"
        );
        assert!(!proposal.executed, "Already executed");
        assert!(
            proposal.votes_for > proposal.votes_against,
            "Proposal did not pass"
        );

        proposal.executed = true;
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        env.events()
            .publish((PROPOSAL_EXECUTED, symbol_short!("id")), proposal_id);
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Option<ProposalRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
    }

    pub fn has_voted(env: Env, proposal_id: u64, voter: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Vote(proposal_id, voter))
    }

    pub fn get_voting_power(env: Env, voter: Address) -> i128 {
        let token_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenContract)
            .unwrap();
        env.invoke_contract(
            &token_contract,
            &symbol_short!("balance"),
            soroban_sdk::vec![&env, voter.into_val(&env)],
        )
    }

    pub fn has_voting_power(env: Env, voter: Address, min_power: i128) -> bool {
        Self::get_voting_power(env, voter) >= min_power
    }

    pub fn get_vote_tally(env: Env, proposal_id: u64) -> (i128, i128, i128, bool) {
        let proposal: ProposalRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .expect("Proposal not found");
        let total = proposal.votes_for + proposal.votes_against;
        let quorum_met = proposal.votes_for > proposal.votes_against && total > 0;
        (proposal.votes_for, proposal.votes_against, total, quorum_met)
    }

    pub fn did_proposal_pass(env: Env, proposal_id: u64) -> bool {
        let proposal: ProposalRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .expect("Proposal not found");
        env.ledger().sequence() >= proposal.voting_end_ledger
            && proposal.votes_for > proposal.votes_against
    }

    pub fn is_voting_active(env: Env, proposal_id: u64) -> bool {
        let proposal: ProposalRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .expect("Proposal not found");
        env.ledger().sequence() < proposal.voting_end_ledger && !proposal.executed
    }

    pub fn get_next_proposal_id(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextProposalId)
            .unwrap_or(1)
    }

    pub fn get_vote(env: Env, proposal_id: u64, voter: Address) -> Option<bool> {
        env.storage()
            .persistent()
            .get(&DataKey::Vote(proposal_id, voter))
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
        proposer.require_auth();
        assert!(voting_end_ledger > env.ledger().sequence(), "Voting end must be in future");
        assert!(timelock_ledger > voting_end_ledger, "Timelock must be after voting");

        let id: u64 = env.storage().instance().get(&DataKey::NextProposalId).unwrap();
        let upgrade = UpgradeProposalRecord {
            id,
            proposer: proposer.clone(),
            contract_address: contract_address.clone(),
            new_wasm_hash: new_wasm_hash.clone(),
            voting_end_ledger,
            votes_for: 0,
            votes_against: 0,
            approved: false,
            executed: false,
            timelock_ledger,
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::UpgradeProposal(id), &upgrade);
        env.storage()
            .instance()
            .set(&DataKey::NextProposalId, &(id + 1));

        env.events().publish(
            (UPGRADE_PROPOSED, symbol_short!("id")),
            (id, contract_address, new_wasm_hash),
        );
        id
    }

    pub fn vote_upgrade(env: Env, voter: Address, upgrade_id: u64, support: bool) {
        voter.require_auth();

        let mut upgrade: UpgradeProposalRecord = env
            .storage()
            .persistent()
            .get(&DataKey::UpgradeProposal(upgrade_id))
            .expect("Upgrade proposal not found");

        assert!(env.ledger().sequence() < upgrade.voting_end_ledger, "Voting period ended");
        assert!(!upgrade.executed, "Upgrade already executed");

        let vote_key = DataKey::Vote(upgrade_id, voter.clone());
        assert!(!env.storage().persistent().has(&vote_key), "Already voted");

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
        assert!(balance > 0, "No voting power");

        env.storage().persistent().set(&vote_key, &support);
        if support { upgrade.votes_for += balance; } else { upgrade.votes_against += balance; }
        env.storage().persistent().set(&DataKey::UpgradeProposal(upgrade_id), &upgrade);
        env.events().publish((VOTE_CAST, symbol_short!("upg")), (upgrade_id, support));
    }

    pub fn approve_upgrade(env: Env, upgrade_id: u64) {
        let mut upgrade: UpgradeProposalRecord = env
            .storage()
            .persistent()
            .get(&DataKey::UpgradeProposal(upgrade_id))
            .expect("Upgrade proposal not found");

        assert!(env.ledger().sequence() >= upgrade.voting_end_ledger, "Voting still ongoing");
        assert!(!upgrade.executed, "Already executed");
        assert!(upgrade.votes_for > upgrade.votes_against, "Upgrade did not pass");

        upgrade.approved = true;
        env.storage().persistent().set(&DataKey::UpgradeProposal(upgrade_id), &upgrade);
        env.storage().persistent().set(&DataKey::TimelockExpiry(upgrade_id), &upgrade.timelock_ledger);

        env.events().publish((UPGRADE_APPROVED, symbol_short!("id")), (upgrade_id, upgrade.contract_address.clone()));
    }

    pub fn execute_upgrade(env: Env, upgrade_id: u64) {
        let mut upgrade: UpgradeProposalRecord = env
            .storage()
            .persistent()
            .get(&DataKey::UpgradeProposal(upgrade_id))
            .expect("Upgrade proposal not found");

        assert!(upgrade.approved, "Upgrade not approved");
        assert!(!upgrade.executed, "Already executed");

        let timelock_expiry: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::TimelockExpiry(upgrade_id))
            .expect("Timelock not found");

        assert!(env.ledger().sequence() >= timelock_expiry, "Timelock not expired");

        upgrade.executed = true;
        env.storage().persistent().set(&DataKey::UpgradeProposal(upgrade_id), &upgrade);
        env.events().publish((UPGRADE_EXECUTED, symbol_short!("id")), (upgrade_id, upgrade.contract_address.clone()));
    }

    pub fn get_upgrade_proposal(env: Env, upgrade_id: u64) -> Option<UpgradeProposalRecord> {
        env.storage().persistent().get(&DataKey::UpgradeProposal(upgrade_id))
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger, LedgerInfo};
    use soroban_sdk::{symbol_short, Env};

    fn set_ledger(env: &Env, seq: u32) {
        env.ledger().set(LedgerInfo {
            sequence_number: seq,
            timestamp: seq as u64 * 5,
            protocol_version: 21,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 1000,
            min_persistent_entry_ttl: 1000,
            max_entry_ttl: 100_000,
        });
    }

    fn setup() -> (Env, GovernanceContractClient<'static>, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, GovernanceContract);
        let client = GovernanceContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        client.initialize(&admin, &token);
        (env, client, admin, token)
    }

    #[test]
    fn test_initialize_sets_admin() {
        let (_, client, admin, _) = setup();
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_panics() {
        let (_, client, admin, token) = setup();
        client.initialize(&admin, &token);
    }

    #[test]
    fn test_create_proposal() {
        let (env, client, _, _) = setup();
        let proposer = Address::generate(&env);
        let title = String::from_str(&env, "New Course Category");
        let desc = String::from_str(&env, "Add blockchain category");
        let end = env.ledger().sequence() + 100;

        let id = client.create_proposal(&proposer, &title, &desc, &end);
        assert_eq!(id, 1);

        let prop = client.get_proposal(&id).unwrap();
        assert_eq!(prop.proposer, proposer);
        assert!(!prop.executed);
    }

    #[test]
    #[should_panic(expected = "Voting end must be in future")]
    fn test_create_proposal_past_end_panics() {
        let (env, client, _, _) = setup();
        let proposer = Address::generate(&env);
        let title = String::from_str(&env, "Test");
        let desc = String::from_str(&env, "Test");
        client.create_proposal(&proposer, &title, &desc, &0_u32);
    }

    #[test]
    #[should_panic(expected = "Voting period ended")]
    fn test_vote_after_voting_end_panics() {
        let (env, client, _, _) = setup();
        let proposer = Address::generate(&env);
        let voter = Address::generate(&env);
        let title = String::from_str(&env, "Test");
        let desc = String::from_str(&env, "Test");
        let end = env.ledger().sequence() + 10;
        let id = client.create_proposal(&proposer, &title, &desc, &end);
        set_ledger(&env, end + 1);
        client.vote(&voter, &id, &true);
    }

    #[test]
    #[should_panic(expected = "Voting still ongoing")]
    fn test_execute_before_voting_end_panics() {
        let (env, client, _, _) = setup();
        let proposer = Address::generate(&env);
        let title = String::from_str(&env, "Test");
        let desc = String::from_str(&env, "Test");
        let end = env.ledger().sequence() + 100;
        let id = client.create_proposal(&proposer, &title, &desc, &end);
        client.execute_proposal(&id);
    }

    #[test]
    #[should_panic(expected = "Proposal did not pass")]
    fn test_execute_without_quorum_panics() {
        let (env, client, _, _) = setup();
        let proposer = Address::generate(&env);
        let title = String::from_str(&env, "Test");
        let desc = String::from_str(&env, "Test");
        let end = env.ledger().sequence() + 10;
        let id = client.create_proposal(&proposer, &title, &desc, &end);
        set_ledger(&env, end + 1);
        client.execute_proposal(&id);
    }

    // ── Advanced voting strategy tests ────────────────────────────────────────

    #[test]
    fn test_get_vote_weight_weighted() {
        let (env, client, _, _) = setup();
        let _ = env;
        // Weighted: weight = balance
        assert_eq!(client.get_vote_weight(&1_000_i128, &0_u32), 1_000);
    }

    #[test]
    fn test_get_vote_weight_quadratic() {
        let (env, client, _, _) = setup();
        let _ = env;
        // Quadratic: weight = sqrt(balance)
        assert_eq!(client.get_vote_weight(&100_i128, &1_u32), 10);
        assert_eq!(client.get_vote_weight(&10_000_i128, &1_u32), 100);
    }

    #[test]
    fn test_get_vote_weight_flat() {
        let (env, client, _, _) = setup();
        let _ = env;
        // Flat: weight = 1 regardless of balance
        assert_eq!(client.get_vote_weight(&1_000_000_i128, &2_u32), 1);
        assert_eq!(client.get_vote_weight(&1_i128, &2_u32), 1);
        assert_eq!(client.get_vote_weight(&0_i128, &2_u32), 0);
    }

    #[test]
    fn test_sqrt_utility() {
        let (env, client, _, _) = setup();
        let _ = env;
        assert_eq!(client.sqrt(&9_i128), 3);
        assert_eq!(client.sqrt(&10_000_i128), 100);
        assert_eq!(client.sqrt(&0_i128), 0);
    }

    #[test]
    fn test_admin_set_quorum_percentage() {
        let (_, client, admin, _) = setup();
        client.set_quorum_percentage(&admin, &30_i128);
        // No panic means success; config stored
    }

    #[test]
    #[should_panic(expected = "Quorum must be 1-100")]
    fn test_invalid_quorum_panics() {
        let (_, client, admin, _) = setup();
        client.set_quorum_percentage(&admin, &0_i128);
    }

    #[test]
    fn test_set_voting_delay() {
        let (_, client, admin, _) = setup();
        client.set_voting_delay(&admin, &5_u32);
    }

    #[test]
    fn test_set_timelock_duration() {
        let (_, client, admin, _) = setup();
        client.set_timelock_duration(&admin, &20_u32);
    }
}
