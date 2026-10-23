use soroban_sdk::{Address, Env, Vec};

use brain_storm_shared::access;
use brain_storm_shared::events::emit_contract_event;
use brain_storm_shared::validation;

use crate::fees;
use crate::storage::{self, DataKey};
use crate::types::{
    BatchEscrowResult, Escrow, EscrowStatus, EVT_DOMAIN, EVT_ESCROW_FUNDED, EVT_ESCROW_REFUNDED,
    EVT_ESCROW_SETTLED, EVT_TIP,
};

pub fn fund_escrow(env: &Env, payer: Address, payee: Address, amount: i128) -> u64 {
    storage::require_not_paused(env);
    payer.require_auth();
    validation::require_positive_amount(amount);

    let id: u64 = env
        .storage()
        .instance()
        .get(&DataKey::NextEscrowId)
        .unwrap_or(1);

    let escrow = Escrow {
        id,
        payer: payer.clone(),
        payee,
        amount,
        status: EscrowStatus::Funded,
    };

    env.storage()
        .persistent()
        .set(&DataKey::Escrow(id), &escrow);
    env.storage()
        .instance()
        .set(&DataKey::NextEscrowId, &(id + 1));

    emit_contract_event(env, EVT_DOMAIN, EVT_ESCROW_FUNDED, (id, payer, amount));
    id
}

pub fn settle_escrow(env: &Env, caller: Address, escrow_id: u64) -> (i128, i128) {
    storage::require_not_paused(env);
    caller.require_auth();

    let mut escrow: Escrow = env
        .storage()
        .persistent()
        .get(&DataKey::Escrow(escrow_id))
        .expect("Escrow not found");

    assert!(escrow.status == EscrowStatus::Funded, "Escrow not funded");

    access::require_admin_or(env, &caller, &DataKey::Admin, &escrow.payer);

    let fee_bps = fees::get_fee_bps(env);
    let (fee, net) = fees::compute_fee(escrow.amount, fee_bps);
    fees::accrue_fee(env, fee);

    escrow.status = EscrowStatus::Settled;
    env.storage()
        .persistent()
        .set(&DataKey::Escrow(escrow_id), &escrow);

    emit_contract_event(
        env,
        EVT_DOMAIN,
        EVT_ESCROW_SETTLED,
        (escrow_id, escrow.payee, net, fee),
    );
    (net, fee)
}

pub fn refund_escrow(env: &Env, admin: Address, escrow_id: u64) {
    storage::require_not_paused(env);
    storage::assert_admin_addr(env, &admin);

    let mut escrow: Escrow = env
        .storage()
        .persistent()
        .get(&DataKey::Escrow(escrow_id))
        .expect("Escrow not found");

    assert!(escrow.status == EscrowStatus::Funded, "Escrow not funded");
    escrow.status = EscrowStatus::Refunded;
    env.storage()
        .persistent()
        .set(&DataKey::Escrow(escrow_id), &escrow);

    emit_contract_event(
        env,
        EVT_DOMAIN,
        EVT_ESCROW_REFUNDED,
        (escrow_id, escrow.payer, escrow.amount),
    );
}

pub fn get_escrow(env: &Env, escrow_id: u64) -> Option<Escrow> {
    env.storage().persistent().get(&DataKey::Escrow(escrow_id))
}

pub fn tip(env: &Env, tipper: Address, amount: i128) -> (i128, i128) {
    storage::require_not_paused(env);
    tipper.require_auth();
    validation::require_positive_amount(amount);

    let fee_bps = fees::get_fee_bps(env);
    let (fee, net) = fees::compute_fee(amount, fee_bps);
    fees::accrue_fee(env, fee);

    emit_contract_event(env, EVT_DOMAIN, EVT_TIP, (tipper, amount, fee, net));
    (net, fee)
}

/// Settle multiple escrows in one transaction. Reads the whole batch first
/// (#1322), then applies each settlement.
pub fn batch_settle_escrows(
    env: &Env,
    caller: Address,
    escrow_ids: Vec<u64>,
) -> Vec<BatchEscrowResult> {
    storage::require_not_paused(env);
    caller.require_auth();

    let fee_bps = fees::get_fee_bps(env);
    let escrows = storage::read_escrows_batch(env, &escrow_ids);

    let mut results = Vec::new(env);
    for maybe_escrow in escrows.iter() {
        let mut escrow = maybe_escrow.expect("Escrow not found");
        assert!(escrow.status == EscrowStatus::Funded, "Escrow not funded");
        access::require_admin_or(env, &caller, &DataKey::Admin, &escrow.payer);

        let (fee, net) = fees::compute_fee(escrow.amount, fee_bps);
        fees::accrue_fee(env, fee);

        escrow.status = EscrowStatus::Settled;
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow.id), &escrow);

        emit_contract_event(
            env,
            EVT_DOMAIN,
            EVT_ESCROW_SETTLED,
            (escrow.id, escrow.payee, net, fee),
        );

        results.push_back(BatchEscrowResult {
            escrow_id: escrow.id,
            net,
            fee,
        });
    }
    results
}

/// Refund multiple escrows in one transaction. Reads the whole batch first.
pub fn batch_refund_escrows(env: &Env, admin: Address, escrow_ids: Vec<u64>) {
    storage::require_not_paused(env);
    storage::assert_admin_addr(env, &admin);

    let escrows = storage::read_escrows_batch(env, &escrow_ids);

    for maybe_escrow in escrows.iter() {
        let mut escrow = maybe_escrow.expect("Escrow not found");
        assert!(escrow.status == EscrowStatus::Funded, "Escrow not funded");

        escrow.status = EscrowStatus::Refunded;
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow.id), &escrow);

        emit_contract_event(
            env,
            EVT_DOMAIN,
            EVT_ESCROW_REFUNDED,
            (escrow.id, escrow.payer, escrow.amount),
        );
    }
}
