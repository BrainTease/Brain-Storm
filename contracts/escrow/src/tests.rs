#![cfg(test)]
use super::*;
use proptest::prelude::*;
use soroban_sdk::testutils::{Address as _, Events};
use soroban_sdk::{Address, Env, FromVal};

/// Registers the escrow contract and authorizes every `require_auth` call,
/// so tests exercise the contract through its real invocation frame.
fn setup() -> (Env, EscrowContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &id);
    (env, client)
}

// ── create_escrow ───────────────────────────────────────────────────────────

#[test]
fn test_create_escrow_valid() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    let id = client.create_escrow(&payer, &agent, &1000).unwrap();
    assert_eq!(id, 1);
}

#[test]
fn test_create_escrow_assigns_increasing_ids() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    let first = client.create_escrow(&payer, &agent, &1000).unwrap();
    let second_payer = Address::generate(&env);
    let second_agent = Address::generate(&env);
    let second = client.create_escrow(&second_payer, &second_agent, &500).unwrap();
    assert_eq!(first, 1);
    assert_eq!(second, 2);
}

#[test]
fn test_create_escrow_invalid_amount() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    let err = client.create_escrow(&payer, &agent, &0).unwrap_err();
    assert_eq!(err, EscrowError::Shared(SharedError::InvalidAmount));
}

#[test]
fn test_create_escrow_negative_amount() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    let err = client.create_escrow(&payer, &agent, &(-1)).unwrap_err();
    assert_eq!(err, EscrowError::Shared(SharedError::InvalidAmount));
}

#[test]
fn test_create_escrow_client_equals_agent() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let err = client.create_escrow(&payer, &payer, &1000).unwrap_err();
    assert_eq!(err, EscrowError::Shared(SharedError::InvalidInput));
}

#[test]
fn test_create_escrow_emits_event() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    client.create_escrow(&payer, &agent, &1000).unwrap();
    let events = env.events().all();
    assert!(!events.is_empty());
    let last = events.get(events.len() - 1).unwrap();
    let topic = soroban_sdk::Symbol::from_val(&env, &last.1.get(0).unwrap());
    assert_eq!(topic, ESCROW_CREATED);
}

// ── fund_escrow ─────────────────────────────────────────────────────────────

#[test]
fn test_fund_escrow_success() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    let id = client.create_escrow(&payer, &agent, &1000).unwrap();
    client.fund_escrow(&id, &payer, &500).unwrap();
}

#[test]
fn test_fund_escrow_insufficient_balance() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    let id = client.create_escrow(&payer, &agent, &1000).unwrap();
    let err = client.fund_escrow(&id, &payer, &2000).unwrap_err();
    assert_eq!(err, EscrowError::Shared(SharedError::InsufficientBalance));
}

#[test]
fn test_fund_escrow_unauthorized_caller() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    let intruder = Address::generate(&env);
    let id = client.create_escrow(&payer, &agent, &1000).unwrap();
    let err = client.fund_escrow(&id, &intruder, &500).unwrap_err();
    assert_eq!(err, EscrowError::Shared(SharedError::Unauthorized));
}

#[test]
fn test_fund_escrow_not_found() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let err = client.fund_escrow(&999, &payer, &500).unwrap_err();
    assert_eq!(err, EscrowError::EscrowNotFound);
}

#[test]
fn test_fund_escrow_invalid_amount() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    let id = client.create_escrow(&payer, &agent, &1000).unwrap();
    let err = client.fund_escrow(&id, &payer, &0).unwrap_err();
    assert_eq!(err, EscrowError::Shared(SharedError::InvalidAmount));
}

#[test]
fn test_fund_escrow_already_funded() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    let id = client.create_escrow(&payer, &agent, &1000).unwrap();
    client.fund_escrow(&id, &payer, &500).unwrap();
    let err = client.fund_escrow(&id, &payer, &500).unwrap_err();
    assert_eq!(err, EscrowError::EscrowAlreadyFunded);
}

#[test]
fn test_fund_escrow_emits_event() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    let id = client.create_escrow(&payer, &agent, &1000).unwrap();
    let before = env.events().all().len();
    client.fund_escrow(&id, &payer, &500).unwrap();
    let events = env.events().all();
    assert_eq!(events.len(), before + 1);
    let last = events.get(events.len() - 1).unwrap();
    let topic = soroban_sdk::Symbol::from_val(&env, &last.1.get(0).unwrap());
    assert_eq!(topic, ESCROW_FUNDED);
}

// ── release_escrow ──────────────────────────────────────────────────────────

#[test]
fn test_release_escrow_success() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    let id = client.create_escrow(&payer, &agent, &1000).unwrap();
    client.fund_escrow(&id, &payer, &1000).unwrap();
    client.release_escrow(&id, &payer).unwrap();
}

#[test]
fn test_release_escrow_unauthorized_caller() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    let id = client.create_escrow(&payer, &agent, &1000).unwrap();
    // The agent may not release funds to themselves; only the client may.
    let err = client.release_escrow(&id, &agent).unwrap_err();
    assert_eq!(err, EscrowError::Shared(SharedError::Unauthorized));
}

#[test]
fn test_release_escrow_not_found() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let err = client.release_escrow(&999, &payer).unwrap_err();
    assert_eq!(err, EscrowError::EscrowNotFound);
}

#[test]
fn test_release_escrow_already_released() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    let id = client.create_escrow(&payer, &agent, &1000).unwrap();
    client.fund_escrow(&id, &payer, &1000).unwrap();
    client.release_escrow(&id, &payer).unwrap();
    let err = client.release_escrow(&id, &payer).unwrap_err();
    assert_eq!(err, EscrowError::EscrowAlreadyReleased);
}

#[test]
fn test_release_escrow_emits_event() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let agent = Address::generate(&env);
    let id = client.create_escrow(&payer, &agent, &1000).unwrap();
    client.fund_escrow(&id, &payer, &1000).unwrap();
    let before = env.events().all().len();
    client.release_escrow(&id, &payer).unwrap();
    let events = env.events().all();
    assert_eq!(events.len(), before + 1);
    let last = events.get(events.len() - 1).unwrap();
    let topic = soroban_sdk::Symbol::from_val(&env, &last.1.get(0).unwrap());
    assert_eq!(topic, ESCROW_RELEASED);
}

// ── property / fuzz tests ───────────────────────────────────────────────────

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    /// Any positive amount within the supported range can be escrowed and
    /// fully funded, and funding conserves the deposited amount exactly.
    #[test]
    fn prop_fund_conserves_amount(amount in 1i128..=i128::MAX / 2) {
        let (env, client) = setup();
        let payer = Address::generate(&env);
        let agent = Address::generate(&env);
        let id = client.create_escrow(&payer, &agent, &amount).unwrap();
        client.fund_escrow(&id, &payer, &amount).unwrap();
        let escrow = client.get_escrow(&id).unwrap();
        prop_assert_eq!(escrow.amount, amount);
        prop_assert_eq!(escrow.funded_amount, amount);
    }

    /// Funding more than the escrowed amount must fail with InsufficientBalance
    /// and must never mutate the stored escrow.
    #[test]
    fn prop_overfund_rejected(
        amount in 1i128..=i128::MAX / 4,
        extra in 1i128..=i128::MAX / 4,
    ) {
        let (env, client) = setup();
        let payer = Address::generate(&env);
        let agent = Address::generate(&env);
        let id = client.create_escrow(&payer, &agent, &amount).unwrap();
        let over = amount + extra;
        let err = client.fund_escrow(&id, &payer, &over).unwrap_err();
        prop_assert_eq!(err, EscrowError::Shared(SharedError::InsufficientBalance));
        let escrow = client.get_escrow(&id).unwrap();
        prop_assert_eq!(escrow.funded_amount, 0);
    }

    /// Zero and negative amounts are always rejected at creation.
    #[test]
    fn prop_non_positive_amount_rejected(amount in i128::MIN..=0) {
        let (env, client) = setup();
        let payer = Address::generate(&env);
        let agent = Address::generate(&env);
        let err = client.create_escrow(&payer, &agent, &amount).unwrap_err();
        prop_assert_eq!(err, EscrowError::Shared(SharedError::InvalidAmount));
    }

    /// Releasing is idempotent in the sense that a second release always fails
    /// and never double-pays; the escrow stays in the released state.
    #[test]
    fn prop_release_idempotent(amount in 1i128..=i128::MAX / 2) {
        let (env, client) = setup();
        let payer = Address::generate(&env);
        let agent = Address::generate(&env);
        let id = client.create_escrow(&payer, &agent, &amount).unwrap();
        client.fund_escrow(&id, &payer, &amount).unwrap();
        client.release_escrow(&id, &payer).unwrap();
        let err = client.release_escrow(&id, &payer).unwrap_err();
        prop_assert_eq!(err, EscrowError::EscrowAlreadyReleased);
        let escrow = client.get_escrow(&id).unwrap();
        prop_assert_eq!(escrow.funded_amount, amount);
    }

    /// Escrow ids are strictly increasing and never collide across creations.
    #[test]
    fn prop_ids_monotonic(count in 1usize..=16) {
        let (env, client) = setup();
        let mut last = 0u32;
        for _ in 0..count {
            let payer = Address::generate(&env);
            let agent = Address::generate(&env);
            let id = client.create_escrow(&payer, &agent, &100).unwrap();
            prop_assert!(id > last);
            last = id;
        }
    }
}
