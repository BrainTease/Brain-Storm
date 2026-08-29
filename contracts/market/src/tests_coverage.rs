// Issue #1017 – Additional coverage tests for the market contract.
// Covers paths not yet exercised in the inline `tests` module:
//   - double-initialize guard
//   - negative / zero escrow amounts
//   - settle by admin (not payer)
//   - batch settle and batch refund happy-paths
//   - settle / refund non-existent escrows
//   - settle already-settled escrow
//   - refund already-refunded escrow
//   - Already-paused / already-unpaused guards
//   - multi-sig escrow create, approve, timeout paths
//   - treasury accrual across multiple escrows

#![cfg(test)]

use super::*;
use super::multisig_escrow;
use soroban_sdk::{testutils::Address as _, vec, Env};

fn setup() -> (Env, MarketContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register_contract(None, MarketContract);
    let client = MarketContractClient::new(&env, &id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

// ── Initialization guards ────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialize_panics() {
    let (_, client, admin) = setup();
    client.initialize(&admin);
}

// ── Escrow amount validation ─────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_fund_escrow_zero_amount_panics() {
    let (env, client, _) = setup();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    client.fund_escrow(&payer, &payee, &0);
}

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_fund_escrow_negative_amount_panics() {
    let (env, client, _) = setup();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    client.fund_escrow(&payer, &payee, &-1);
}

// ── Admin-authorised settle ──────────────────────────────────────────────────

#[test]
fn test_admin_can_settle_escrow() {
    let (env, client, admin) = setup();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    let id = client.fund_escrow(&payer, &payee, &200);
    let (net, fee) = client.settle_escrow(&admin, &id);
    assert_eq!(fee, 0);
    assert_eq!(net, 200);
}

// ── Settle already-settled escrow ────────────────────────────────────────────

#[test]
#[should_panic(expected = "Escrow not funded")]
fn test_settle_already_settled_panics() {
    let (env, client, _) = setup();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    let id = client.fund_escrow(&payer, &payee, &100);
    client.settle_escrow(&payer, &id);
    client.settle_escrow(&payer, &id);
}

// ── Settle non-existent escrow ───────────────────────────────────────────────

#[test]
#[should_panic(expected = "Escrow not found")]
fn test_settle_nonexistent_escrow_panics() {
    let (env, client, _) = setup();
    let payer = Address::generate(&env);
    client.settle_escrow(&payer, &9999);
}

// ── Unauthorised settle ──────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Unauthorized")]
fn test_non_payer_non_admin_cannot_settle() {
    let (env, client, _) = setup();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    let rando = Address::generate(&env);
    let id = client.fund_escrow(&payer, &payee, &100);
    client.settle_escrow(&rando, &id);
}

// ── Refund already-refunded escrow ───────────────────────────────────────────

#[test]
#[should_panic(expected = "Escrow not funded")]
fn test_refund_already_refunded_panics() {
    let (env, client, admin) = setup();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    let id = client.fund_escrow(&payer, &payee, &100);
    client.refund_escrow(&admin, &id);
    client.refund_escrow(&admin, &id);
}

// ── Refund non-existent escrow ────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Escrow not found")]
fn test_refund_nonexistent_escrow_panics() {
    let (_, client, admin) = setup();
    client.refund_escrow(&admin, &9999);
}

// ── Tip zero amount ───────────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_tip_zero_amount_panics() {
    let (env, client, _) = setup();
    let tipper = Address::generate(&env);
    client.tip(&tipper, &0);
}

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_tip_negative_amount_panics() {
    let (env, client, _) = setup();
    let tipper = Address::generate(&env);
    client.tip(&tipper, &-50);
}

// ── Pausable double-pause / double-unpause guards ────────────────────────────

#[test]
#[should_panic(expected = "Already paused")]
fn test_double_pause_panics() {
    let (_, client, admin) = setup();
    client.pause(&admin);
    client.pause(&admin);
}

#[test]
#[should_panic(expected = "Not paused")]
fn test_unpause_when_not_paused_panics() {
    let (_, client, admin) = setup();
    client.unpause(&admin);
}

// ── Batch settle ─────────────────────────────────────────────────────────────

#[test]
fn test_batch_settle_escrows() {
    let (env, client, admin) = setup();
    let treasury = Address::generate(&env);
    client.set_fee_bps(&admin, &100); // 1%
    client.set_treasury(&admin, &treasury);

    let payer = Address::generate(&env);
    let payee = Address::generate(&env);

    let id1 = client.fund_escrow(&payer, &payee, &1_000);
    let id2 = client.fund_escrow(&payer, &payee, &2_000);
    let id3 = client.fund_escrow(&payer, &payee, &4_000);

    let ids = vec![&env, id1, id2, id3];
    let results = client.batch_settle_escrows(&payer, &ids);

    assert_eq!(results.len(), 3);
    // 1% fee on each
    assert_eq!(results.get(0).unwrap().fee, 10);
    assert_eq!(results.get(0).unwrap().net, 990);
    assert_eq!(results.get(1).unwrap().fee, 20);
    assert_eq!(results.get(1).unwrap().net, 1_980);
    assert_eq!(results.get(2).unwrap().fee, 40);
    assert_eq!(results.get(2).unwrap().net, 3_960);

    // Treasury balance must accumulate all fees
    assert_eq!(client.get_treasury_balance(), 70);
}

// ── Batch refund ─────────────────────────────────────────────────────────────

#[test]
fn test_batch_refund_escrows() {
    let (env, client, admin) = setup();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);

    let id1 = client.fund_escrow(&payer, &payee, &100);
    let id2 = client.fund_escrow(&payer, &payee, &200);

    let ids = vec![&env, id1, id2];
    client.batch_refund_escrows(&admin, &ids);

    assert_eq!(client.get_escrow(&id1).unwrap().status, EscrowStatus::Refunded);
    assert_eq!(client.get_escrow(&id2).unwrap().status, EscrowStatus::Refunded);
}

// ── get_escrow returns None for missing ──────────────────────────────────────

#[test]
fn test_get_escrow_returns_none_for_missing() {
    let (_, client, _) = setup();
    assert!(client.get_escrow(&9999).is_none());
}

// ── Treasury accrues across multiple independent settles ─────────────────────

#[test]
fn test_treasury_accrues_across_multiple_settles() {
    let (env, client, admin) = setup();
    let treasury = Address::generate(&env);
    client.set_fee_bps(&admin, &200); // 2%
    client.set_treasury(&admin, &treasury);

    let payer = Address::generate(&env);
    let payee = Address::generate(&env);

    let id1 = client.fund_escrow(&payer, &payee, &5_000);
    let id2 = client.fund_escrow(&payer, &payee, &10_000);

    client.settle_escrow(&payer, &id1); // fee = 100
    client.settle_escrow(&payer, &id2); // fee = 200

    assert_eq!(client.get_treasury_balance(), 300);
}

// ── Escrow IDs are monotonically increasing ──────────────────────────────────

#[test]
fn test_escrow_ids_are_sequential() {
    let (env, client, _) = setup();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);

    let id1 = client.fund_escrow(&payer, &payee, &100);
    let id2 = client.fund_escrow(&payer, &payee, &100);
    let id3 = client.fund_escrow(&payer, &payee, &100);

    assert!(id2 > id1);
    assert!(id3 > id2);
}

// ── Multi-sig escrow ─────────────────────────────────────────────────────────

#[test]
fn test_ms_fund_and_approve_escrow() {
    let (env, client, _) = setup();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);

    let signers = vec![&env, signer1.clone(), signer2.clone()];
    let escrow_id = client.ms_fund_escrow(&payer, &payee, &1_000, &signers, &2, &100);

    let ms = client.ms_get_escrow(&escrow_id).unwrap();
    assert_eq!(ms.amount, 1_000);
    assert_eq!(ms.threshold, 2);
    assert_eq!(ms.approvals.len(), 0);
    assert_eq!(ms.status, multisig_escrow::MsEscrowStatus::Pending);

    // Approve with first signer — one approval, threshold not yet reached
    client.ms_approve_escrow(&escrow_id, &signer1);
    let ms = client.ms_get_escrow(&escrow_id).unwrap();
    assert_eq!(ms.approvals.len(), 1);
    assert_eq!(ms.status, multisig_escrow::MsEscrowStatus::Pending);

    // Approve with second signer — threshold reached → Released
    client.ms_approve_escrow(&escrow_id, &signer2);
    let ms = client.ms_get_escrow(&escrow_id).unwrap();
    assert_eq!(ms.approvals.len(), 2);
    assert_eq!(
        ms.status,
        multisig_escrow::MsEscrowStatus::Released,
        "Escrow should be released after threshold is reached"
    );
}

#[test]
fn test_ms_timeout_before_threshold() {
    let (env, client, _) = setup();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);

    let signers = vec![&env, signer1, signer2];
    let escrow_id = client.ms_fund_escrow(&payer, &payee, &500, &signers, &2, &5);

    // Advance ledger past timeout
    env.ledger().with_mut(|l| l.sequence_number += 10);

    let timed_out = client.ms_timeout_escrow(&escrow_id);
    assert!(timed_out, "Escrow should have timed out");

    let ms = client.ms_get_escrow(&escrow_id).unwrap();
    assert_eq!(
        ms.status,
        multisig_escrow::MsEscrowStatus::TimedOut,
        "Escrow status should be TimedOut"
    );
}

#[test]
fn test_ms_get_nonexistent_returns_none() {
    let (_, client, _) = setup();
    assert!(client.ms_get_escrow(&9999).is_none());
}

// ── Batch settle paused ───────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Contract is paused")]
fn test_batch_settle_blocked_when_paused() {
    let (env, client, admin) = setup();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    let id = client.fund_escrow(&payer, &payee, &100);
    client.pause(&admin);
    let ids = vec![&env, id];
    client.batch_settle_escrows(&payer, &ids);
}

#[test]
#[should_panic(expected = "Contract is paused")]
fn test_batch_refund_blocked_when_paused() {
    let (env, client, admin) = setup();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    let id = client.fund_escrow(&payer, &payee, &100);
    client.pause(&admin);
    let ids = vec![&env, id];
    client.batch_refund_escrows(&admin, &ids);
}

// ── Non-admin cannot refund ──────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Only admin")]
fn test_non_admin_cannot_refund() {
    let (env, client, _) = setup();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    let rando = Address::generate(&env);
    let id = client.fund_escrow(&payer, &payee, &100);
    client.refund_escrow(&rando, &id);
}

// ── Non-admin cannot batch refund ────────────────────────────────────────────

#[test]
#[should_panic(expected = "Only admin")]
fn test_non_admin_cannot_batch_refund() {
    let (env, client, _) = setup();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    let rando = Address::generate(&env);
    let id = client.fund_escrow(&payer, &payee, &100);
    let ids = vec![&env, id];
    client.batch_refund_escrows(&rando, &ids);
}

// ── get_admin ────────────────────────────────────────────────────────────────

#[test]
fn test_get_admin_returns_initialised_admin() {
    let (_, client, admin) = setup();
    assert_eq!(client.get_admin(), admin);
}
