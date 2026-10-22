//! Legacy proposal and upgrade paths for the governance contract.
//!
//! Split out of `lib.rs` (issue #1324). The `#[contractimpl]` entry points in
//! `lib.rs` delegate here so the contract surface stays small.

use soroban_sdk::{symbol_short, vec, Address, Env, IntoVal, String, Symbol};

use brain_storm_shared::access;

use crate::types::{
    DataKey, ProposalRecord, UpgradeProposalRecord, PROPOSAL_CREATED, PROPOSAL_EXECUTED,
    UPGRADE_APPROVED, UPGRADE_EXECUTED, UPGRADE_PROPOSED, VOTE_CAST,
};
use crate::validation_helpers::is_zero_address;

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
    let cached: Option<i128> = env
        .storage()
        .instance()
        .get(&GovernanceKey::VotingPowerCheckpoint(voter.clone()));
    if let Some(power) = cached {
        return power;
    }

    let token_contract: Address = env
        .storage()
        .instance()
        .get(&DataKey::TokenContract)
        .unwrap();
    let balance: i128 = env.invoke_contract(
        &token_contract,
        &symbol_short!("balance"),
        soroban_sdk::vec![&env, voter.into_val(&env)],
    );
    env.storage()
        .instance()
        .set(&GovernanceKey::VotingPowerCheckpoint(voter), &balance);
    balance
}

pub fn has_voting_power(env: Env, voter: Address, min_power: i128) -> bool {
    get_voting_power(env, voter) >= min_power
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

pub fn propose_upgrade(
    env: Env,
    proposer: Address,
    contract_address: Address,
    new_wasm_hash: Symbol,
    voting_end_ledger: u32,
    timelock_ledger: u32,
) -> u64 {
    proposer.require_auth();

    // Security (#1169): reject the all-zero target so an upgrade proposal
    // can never name an address that does not resolve to a real contract.
    assert!(
        !is_zero_address(&contract_address),
        "Contract address must not be zero"
    );

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

pub fn approve_upgrade(env: Env, admin: Address, upgrade_id: u64) {
    access::require_admin(&env, &admin, &DataKey::Admin);

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
