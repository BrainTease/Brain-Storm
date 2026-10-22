//! Contract test suite for `governance`.
//!
//! Split out of `lib.rs` (issue #1324).

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
        min_temp_entry_ttl: MIN_TEMP_ENTRY_TTL,
        min_persistent_entry_ttl: MIN_PERSISTENT_ENTRY_TTL,
        max_entry_ttl: MAX_ENTRY_TTL,
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
fn test_vote_power_benchmark_uses_cached_checkpoint() {
    let (env, client, _, _) = setup();
    let voter = Address::generate(&env);
    let delegate = Address::generate(&env);
    client.delegate(&voter, &delegate);

    env.budget().reset_default();
    let power = client.get_voting_power(&voter);
    let after = env.budget().cpu_instruction_cost();

    assert!(power >= 0);
    assert!(after > 0);
    assert_eq!(client.get_delegate(&voter).unwrap(), delegate);
}

#[test]
fn test_initialize_sets_admin() {
    let (_, client, admin, _) = setup();
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn test_initialize_sets_valid_default_quorum() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "Test");
    let end = env.ledger().sequence() + 1;

    let id = client.create_advanced_proposal(&proposer, &title, &desc, &end, &0, &0);
    let proposal = client.get_advanced_proposal(&id).unwrap();
    assert_eq!(proposal.quorum_required, 200_000_000_000_000);
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
fn test_create_proposal_accepts_maximum_voting_period() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "Test");
    let end = env.ledger().sequence() + 100_000;

    client.create_proposal(&proposer, &title, &desc, &end);
}

#[test]
#[should_panic(expected = "Voting period must be 1-100000 ledgers")]
fn test_create_proposal_rejects_voting_period_over_maximum() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "Test");
    let end = env.ledger().sequence() + 100_001;

    client.create_proposal(&proposer, &title, &desc, &end);
}

#[test]
#[should_panic(expected = "Voting period must be 1-100000 ledgers")]
fn test_create_advanced_proposal_rejects_voting_period_over_maximum() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "Test");
    let end = env.ledger().sequence() + 100_001;

    client.create_advanced_proposal(&proposer, &title, &desc, &end, &0, &0);
}

#[test]
#[should_panic(expected = "Voting period must be 1-100000 ledgers")]
fn test_propose_upgrade_rejects_voting_period_over_maximum() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let contract_addr = Address::generate(&env);
    let wasm_hash = symbol_short!("abc123");
    let end = env.ledger().sequence() + 100_001;
    let timelock = end + 1;

    client.propose_upgrade(&proposer, &contract_addr, &wasm_hash, &end, &timelock);
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
#[should_panic(expected = "Quorum must be 1-100")]
fn test_negative_quorum_panics() {
    let (_, client, admin, _) = setup();
    client.set_quorum_percentage(&admin, &-1_i128);
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

// ── Additional legacy proposal tests ─────────────────────────────────────

#[test]
fn test_get_next_proposal_id_starts_at_1() {
    let (_, client, _, _) = setup();
    assert_eq!(client.get_next_proposal_id(), 1);
}

#[test]
fn test_get_next_proposal_id_increments_after_create() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let title = String::from_str(&env, "P1");
    let desc = String::from_str(&env, "desc");
    let end = env.ledger().sequence() + 50;
    client.create_proposal(&proposer, &title, &desc, &end);
    assert_eq!(client.get_next_proposal_id(), 2);
}

#[test]
fn test_has_voted_returns_false_before_vote() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "desc");
    let end = env.ledger().sequence() + 50;
    let id = client.create_proposal(&proposer, &title, &desc, &end);
    assert!(!client.has_voted(&id, &voter));
}

#[test]
fn test_get_vote_returns_none_before_vote() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "desc");
    let end = env.ledger().sequence() + 50;
    let id = client.create_proposal(&proposer, &title, &desc, &end);
    assert!(client.get_vote(&id, &voter).is_none());
}

#[test]
fn test_get_vote_tally_all_zeros_before_votes() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "desc");
    let end = env.ledger().sequence() + 50;
    let id = client.create_proposal(&proposer, &title, &desc, &end);
    let (votes_for, votes_against, total, quorum_met) = client.get_vote_tally(&id);
    assert_eq!(votes_for, 0);
    assert_eq!(votes_against, 0);
    assert_eq!(total, 0);
    assert!(!quorum_met);
}

#[test]
fn test_did_proposal_pass_returns_false_during_voting() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "desc");
    let end = env.ledger().sequence() + 50;
    let id = client.create_proposal(&proposer, &title, &desc, &end);
    // still in voting window
    assert!(!client.did_proposal_pass(&id));
}

#[test]
fn test_is_voting_active_true_during_window() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "desc");
    let end = env.ledger().sequence() + 50;
    let id = client.create_proposal(&proposer, &title, &desc, &end);
    assert!(client.is_voting_active(&id));
}

#[test]
fn test_is_voting_active_false_after_window() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let title = String::from_str(&env, "Test");
    let desc = String::from_str(&env, "desc");
    let end = env.ledger().sequence() + 10;
    let id = client.create_proposal(&proposer, &title, &desc, &end);
    set_ledger(&env, end + 1);
    assert!(!client.is_voting_active(&id));
}

#[test]
fn test_get_proposal_returns_none_for_missing() {
    let (_, client, _, _) = setup();
    assert!(client.get_proposal(&9999).is_none());
}

// ── Upgrade proposal tests ────────────────────────────────────────────────

#[test]
fn test_propose_upgrade_returns_id() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let contract_addr = Address::generate(&env);
    let wasm_hash = symbol_short!("abc123");
    let end = env.ledger().sequence() + 10;
    let timelock = end + 10;
    let id = client.propose_upgrade(&proposer, &contract_addr, &wasm_hash, &end, &timelock);
    assert_eq!(id, 1);
}

#[test]
fn test_get_upgrade_proposal_returns_correct_record() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let contract_addr = Address::generate(&env);
    let wasm_hash = symbol_short!("abc123");
    let end = env.ledger().sequence() + 10;
    let timelock = end + 10;
    let id = client.propose_upgrade(&proposer, &contract_addr, &wasm_hash, &end, &timelock);
    let upgrade = client.get_upgrade_proposal(&id).unwrap();
    assert_eq!(upgrade.id, id);
    assert_eq!(upgrade.proposer, proposer);
    assert!(!upgrade.approved);
    assert!(!upgrade.executed);
}

#[test]
fn test_get_upgrade_proposal_returns_none_for_missing() {
    let (_, client, _, _) = setup();
    assert!(client.get_upgrade_proposal(&9999).is_none());
}

#[test]
#[should_panic(expected = "Voting end must be in future")]
fn test_propose_upgrade_past_end_panics() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let contract_addr = Address::generate(&env);
    let wasm_hash = symbol_short!("abc123");
    client.propose_upgrade(&proposer, &contract_addr, &wasm_hash, &0_u32, &100_u32);
}

#[test]
#[should_panic(expected = "Timelock must be after voting")]
fn test_propose_upgrade_timelock_before_voting_end_panics() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let contract_addr = Address::generate(&env);
    let wasm_hash = symbol_short!("abc123");
    let end = env.ledger().sequence() + 100;
    // timelock == end — not strictly after
    client.propose_upgrade(&proposer, &contract_addr, &wasm_hash, &end, &(end - 1));
}

#[test]
#[should_panic(expected = "Contract address must not be zero")]
fn test_propose_upgrade_zero_contract_target_panics() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let zero = Address::from_string(&String::from_str(&env, ZERO_CONTRACT_ADDRESS));
    let wasm_hash = symbol_short!("abc123");
    let end = env.ledger().sequence() + 10;
    let timelock = end + 10;
    client.propose_upgrade(&proposer, &zero, &wasm_hash, &end, &timelock);
}

#[test]
#[should_panic(expected = "Contract address must not be zero")]
fn test_propose_upgrade_zero_account_target_panics() {
    let (env, client, _, _) = setup();
    let proposer = Address::generate(&env);
    let zero = Address::from_string(&String::from_str(&env, ZERO_ACCOUNT_ADDRESS));
    let wasm_hash = symbol_short!("abc123");
    let end = env.ledger().sequence() + 10;
    let timelock = end + 10;
    client.propose_upgrade(&proposer, &zero, &wasm_hash, &end, &timelock);
}

// ── Upgrade approval / execution authorization (#1169) ────────────────────
//
// `approve_upgrade` is documented as the admin approval gate
// (docs/contract-interfaces.md); `execute_upgrade` is documented as
// permissionless but only after the approved proposal's timelock.

/// Minimal token contract so `vote_upgrade`'s balance lookup resolves.
#[contract]
struct MockToken;

#[contractimpl]
impl MockToken {
    pub fn balance(_env: Env, _addr: Address) -> i128 {
        1_000
    }
}

/// Governance wired to a token that reports a non-zero balance for everyone.
fn setup_with_token() -> (Env, GovernanceContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register_contract(None, GovernanceContract);
    let client = GovernanceContractClient::new(&env, &id);
    let admin = Address::generate(&env);
    let token = env.register_contract(None, MockToken);
    client.initialize(&admin, &token);
    (env, client, admin)
}

/// Proposes an upgrade, votes it through and closes the voting window.
/// Returns `(upgrade_id, voting_end_ledger)`.
fn passed_upgrade(env: &Env, client: &GovernanceContractClient, admin: &Address) -> (u64, u32) {
    let end = env.ledger().sequence() + 10;
    let target = Address::generate(env);
    let wasm_hash = symbol_short!("abc123");
    let id = client.propose_upgrade(admin, &target, &wasm_hash, &end, &(end + 10));
    let voter = Address::generate(env);
    client.vote_upgrade(&voter, &id, &true);
    set_ledger(env, end);
    (id, end)
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_approve_upgrade_rejects_non_admin() {
    let (env, client, admin) = setup_with_token();
    // The proposal has finished voting and passed — approval is still the
    // stored admin's call alone.
    let (id, _) = passed_upgrade(&env, &client, &admin);
    let rando = Address::generate(&env);
    client.approve_upgrade(&rando, &id);
}

#[test]
fn test_approve_upgrade_marks_passed_proposal_approved() {
    let (env, client, admin) = setup_with_token();
    let (id, _) = passed_upgrade(&env, &client, &admin);
    client.approve_upgrade(&admin, &id);
    let record = client.get_upgrade_proposal(&id).unwrap();
    assert!(record.approved);
    assert!(!record.executed);
}

#[test]
#[should_panic(expected = "Timelock not expired")]
fn test_execute_upgrade_rejected_before_timelock() {
    let (env, client, admin) = setup_with_token();
    let (id, end) = passed_upgrade(&env, &client, &admin);
    client.approve_upgrade(&admin, &id);
    // One ledger short of `timelock_ledger == end + 10`.
    set_ledger(&env, end + 9);
    client.execute_upgrade(&id);
}

#[test]
fn test_execute_upgrade_succeeds_after_timelock() {
    let (env, client, admin) = setup_with_token();
    let (id, end) = passed_upgrade(&env, &client, &admin);
    client.approve_upgrade(&admin, &id);
    set_ledger(&env, end + 10);
    client.execute_upgrade(&id);
    let record = client.get_upgrade_proposal(&id).unwrap();
    assert!(record.executed);
}

#[test]
#[should_panic(expected = "Already executed")]
fn test_execute_upgrade_cannot_run_twice() {
    let (env, client, admin) = setup_with_token();
    let (id, end) = passed_upgrade(&env, &client, &admin);
    client.approve_upgrade(&admin, &id);
    set_ledger(&env, end + 10);
    client.execute_upgrade(&id);
    client.execute_upgrade(&id);
}

#[test]
fn test_set_total_supply_snapshot() {
    let (_, client, admin, _) = setup();
    client.set_total_supply_snapshot(&admin, &1_000_000_i128);
    // No panic = stored correctly
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_set_total_supply() {
    let (env, client, _, _) = setup();
    let rando = Address::generate(&env);
    client.set_total_supply_snapshot(&rando, &1_000_000_i128);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_set_voting_delay() {
    let (env, client, _, _) = setup();
    let rando = Address::generate(&env);
    client.set_voting_delay(&rando, &5_u32);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_set_timelock_duration() {
    let (env, client, _, _) = setup();
    let rando = Address::generate(&env);
    client.set_timelock_duration(&rando, &20_u32);
}

#[test]
#[should_panic(expected = "Quorum must be 1-100")]
fn test_quorum_over_100_panics() {
    let (_, client, admin, _) = setup();
    client.set_quorum_percentage(&admin, &101_i128);
}
