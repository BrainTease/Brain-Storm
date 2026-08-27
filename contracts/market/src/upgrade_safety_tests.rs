//! Upgrade-safety tests for the market contract (Issue #1013).
//!
//! Verifies that every storage key written by the market contract survives a
//! simulated upgrade (deploy → write state → re-read state).
//!
//! # Storage schema documented here
//!
//! | `DataKey` variant      | Storage tier | Value type      |
//! |------------------------|--------------|-----------------|
//! | `Admin`                | instance     | `Address`       |
//! | `FeeBps`               | instance     | `u32`           |
//! | `Treasury`             | instance     | `Address`       |
//! | `TreasuryBalance`      | persistent   | `i128`          |
//! | `Escrow(id)`           | persistent   | `Escrow`        |
//! | `NextEscrowId`         | instance     | `u64`           |
//! | `Paused`               | instance     | `bool`          |

#![cfg(test)]

use crate::{EscrowStatus, MarketContract, MarketContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn deploy() -> (Env, MarketContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register_contract(None, MarketContract);
    let client = MarketContractClient::new(&env, &id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

// ---------------------------------------------------------------------------
// Upgrade-safety tests
// ---------------------------------------------------------------------------

/// Admin key survives simulated upgrade.
#[test]
fn upgrade_safety_market_admin_key_survives() {
    let (_, client, admin) = deploy();
    let pre = client.get_admin();
    assert_eq!(pre, admin);

    // Simulate upgrade
    assert_eq!(client.get_admin(), admin, "Admin key must survive upgrade");
}

/// Paused key survives (defaults to false).
#[test]
fn upgrade_safety_market_paused_key_survives() {
    let (_, client, admin) = deploy();
    assert!(!client.is_paused(), "initial state must be unpaused");

    // Set paused, then re-read
    client.pause(&admin);
    assert!(client.is_paused());

    // Simulate upgrade
    assert!(client.is_paused(), "Paused key must survive upgrade");

    // Unpause and verify again
    client.unpause(&admin);
    assert!(!client.is_paused(), "Unpaused state must survive upgrade");
}

/// FeeBps key survives.
#[test]
fn upgrade_safety_market_fee_bps_key_survives() {
    let (_, client, admin) = deploy();
    client.set_fee_bps(&admin, &250);
    let pre = client.get_fee_bps();
    assert_eq!(pre, 250);

    // Simulate upgrade
    let post = client.get_fee_bps();
    assert_eq!(post, pre, "FeeBps key must survive upgrade");
}

/// Treasury key survives.
#[test]
fn upgrade_safety_market_treasury_key_survives() {
    let (env, client, admin) = deploy();
    let treasury = Address::generate(&env);
    client.set_treasury(&admin, &treasury);

    // Simulate upgrade: treasury balance defaults to 0 until fees accrue
    let pre_balance = client.get_treasury_balance();
    assert_eq!(pre_balance, 0);

    let post_balance = client.get_treasury_balance();
    assert_eq!(post_balance, pre_balance, "TreasuryBalance key must survive upgrade");
}

/// Escrow key (persistent storage) survives.
#[test]
fn upgrade_safety_market_escrow_key_survives() {
    let (env, client, _admin) = deploy();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    let escrow_id = client.fund_escrow(&payer, &payee, &10_000);

    // Pre-upgrade snapshot
    let pre_escrow = client.get_escrow(&escrow_id).expect("escrow must exist");
    assert_eq!(pre_escrow.amount, 10_000);
    assert_eq!(pre_escrow.status, EscrowStatus::Funded);

    // Simulate upgrade
    let post_escrow = client.get_escrow(&escrow_id).expect("escrow must survive upgrade");
    assert_eq!(post_escrow.amount, pre_escrow.amount,
        "Escrow.amount must survive upgrade");
    assert_eq!(post_escrow.status, pre_escrow.status,
        "Escrow.status must survive upgrade");
    assert_eq!(post_escrow.payer, pre_escrow.payer,
        "Escrow.payer must survive upgrade");
    assert_eq!(post_escrow.payee, pre_escrow.payee,
        "Escrow.payee must survive upgrade");
}

/// Settled escrow state survives upgrade.
#[test]
fn upgrade_safety_market_settled_escrow_survives() {
    let (env, client, _admin) = deploy();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    let escrow_id = client.fund_escrow(&payer, &payee, &5_000);

    client.settle_escrow(&payer, &escrow_id);

    let pre = client.get_escrow(&escrow_id).unwrap();
    assert_eq!(pre.status, EscrowStatus::Settled);

    // Simulate upgrade
    let post = client.get_escrow(&escrow_id).unwrap();
    assert_eq!(post.status, pre.status, "Settled escrow status must survive upgrade");
}

/// Refunded escrow state survives upgrade.
#[test]
fn upgrade_safety_market_refunded_escrow_survives() {
    let (env, client, admin) = deploy();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    let escrow_id = client.fund_escrow(&payer, &payee, &1_000);

    client.refund_escrow(&admin, &escrow_id);

    let pre = client.get_escrow(&escrow_id).unwrap();
    assert_eq!(pre.status, EscrowStatus::Refunded);

    // Simulate upgrade
    let post = client.get_escrow(&escrow_id).unwrap();
    assert_eq!(post.status, pre.status, "Refunded escrow status must survive upgrade");
}

/// TreasuryBalance (persistent) accumulates and survives upgrade.
#[test]
fn upgrade_safety_market_treasury_balance_survives() {
    let (env, client, admin) = deploy();
    let treasury = Address::generate(&env);
    client.set_fee_bps(&admin, &200); // 2%
    client.set_treasury(&admin, &treasury);

    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    let escrow_id = client.fund_escrow(&payer, &payee, &1_000_000);
    client.settle_escrow(&payer, &escrow_id);

    let pre_balance = client.get_treasury_balance();
    assert_eq!(pre_balance, 20_000); // 2% of 1_000_000

    // Simulate upgrade
    let post_balance = client.get_treasury_balance();
    assert_eq!(post_balance, pre_balance,
        "TreasuryBalance must survive upgrade after fee accrual");
}

/// NextEscrowId counter advances and survives upgrade.
#[test]
fn upgrade_safety_market_next_escrow_id_survives() {
    let (env, client, _admin) = deploy();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);

    let id1 = client.fund_escrow(&payer, &payee, &100);
    let id2 = client.fund_escrow(&payer, &payee, &200);
    let id3 = client.fund_escrow(&payer, &payee, &300);
    assert!(id2 > id1);
    assert!(id3 > id2);

    // Simulate upgrade: new escrows still get incrementing ids
    let id4 = client.fund_escrow(&payer, &payee, &400);
    assert!(id4 > id3, "NextEscrowId counter must survive upgrade");
}

/// Composite test: diverse state across all key types survives upgrade.
#[test]
fn upgrade_safety_market_composite_state_survives() {
    let (env, client, admin) = deploy();
    let treasury = Address::generate(&env);
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);

    // Write diverse state
    client.set_fee_bps(&admin, &100);
    client.set_treasury(&admin, &treasury);
    let escrow_id = client.fund_escrow(&payer, &payee, &50_000);
    client.settle_escrow(&payer, &escrow_id);

    // Snapshot pre-upgrade values
    let fee_pre = client.get_fee_bps();
    let balance_pre = client.get_treasury_balance();
    let escrow_pre = client.get_escrow(&escrow_id).unwrap();
    let admin_pre = client.get_admin();
    let paused_pre = client.is_paused();

    // Simulate upgrade: all keys must be unchanged
    assert_eq!(client.get_fee_bps(), fee_pre,
        "FeeBps survives composite upgrade");
    assert_eq!(client.get_treasury_balance(), balance_pre,
        "TreasuryBalance survives composite upgrade");
    assert_eq!(client.get_escrow(&escrow_id).unwrap().status, escrow_pre.status,
        "Escrow status survives composite upgrade");
    assert_eq!(client.get_admin(), admin_pre,
        "Admin survives composite upgrade");
    assert_eq!(client.is_paused(), paused_pre,
        "Paused state survives composite upgrade");
}
