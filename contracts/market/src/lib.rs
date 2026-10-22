#![no_std]
//! Market contract — product listings, escrow, tips, protocol fees (#660),
//! multi-sig escrow (#658), pausable/emergency-stop (#663) and batch
//! operations (#662).
//!
//! Types live in [`types`], storage keys and batched reads in [`storage`],
//! and the three entry-point groups in `listing`, `offer` and `settlement`.

#[cfg(test)]
extern crate std;

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

use brain_storm_shared::events::emit_contract_event;

mod fees;
mod listing;
mod multisig_escrow;
mod offer;
mod settlement;
mod storage;
mod types;

pub use storage::DataKey;
pub use types::*;

#[contract]
pub struct MarketContract;

#[contractimpl]
impl MarketContract {
    // ── Init / admin ──────────────────────────────────────────────────────────

    pub fn initialize(env: Env, admin: Address) -> Result<(), MarketError> {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "Already initialized"
        );
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage()
            .instance()
            .set(&DataKey::ProductCounter, &0u32);
        env.storage()
            .instance()
            .set(&DataKey::NextEscrowId, &1u64);
        env.storage()
            .instance()
            .set(&DataKey::ReentrancyLock, &LockStatus::Unlocked);
        Ok(())
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    // ── Pausable (#663) ───────────────────────────────────────────────────────

    pub fn pause(env: Env, admin: Address) {
        admin.require_auth();
        storage::assert_admin_addr(&env, &admin);
        assert!(!storage::is_paused_internal(&env), "Already paused");
        env.storage().instance().set(&DataKey::Paused, &true);
        emit_contract_event(&env, EVT_DOMAIN, EVT_PAUSED, admin);
    }

    pub fn unpause(env: Env, admin: Address) {
        admin.require_auth();
        storage::assert_admin_addr(&env, &admin);
        assert!(storage::is_paused_internal(&env), "Not paused");
        env.storage().instance().set(&DataKey::Paused, &false);
        emit_contract_event(&env, EVT_DOMAIN, EVT_UNPAUSED, admin);
    }

    pub fn is_paused(env: Env) -> bool {
        storage::is_paused_internal(&env)
    }

    // ── Products ──────────────────────────────────────────────────────────────

    pub fn list_product(
        env: Env,
        seller: Address,
        price: i128,
        token_address: Address,
        metadata: String,
    ) -> Result<u32, MarketError> {
        listing::list_product(&env, seller, price, token_address, metadata)
    }

    pub fn purchase_product(
        env: Env,
        buyer: Address,
        product_id: u32,
    ) -> Result<(), MarketError> {
        offer::purchase_product(&env, buyer, product_id)
    }

    pub fn get_product(env: Env, product_id: u32) -> Result<Product, MarketError> {
        listing::get_product(&env, product_id)
    }

    pub fn get_listing(env: Env, product_id: u32) -> Result<ProductListing, MarketError> {
        listing::get_listing(&env, product_id)
    }

    pub fn get_purchase(env: Env, product_id: u32) -> Result<Purchase, MarketError> {
        offer::get_purchase(&env, product_id)
    }

    pub fn get_available_products(env: Env) -> Vec<Product> {
        listing::get_available_products(&env)
    }

    pub fn get_purchases_by_buyer(env: Env, buyer: Address) -> Vec<Purchase> {
        offer::get_purchases_by_buyer(&env, buyer)
    }

    // ── Fee configuration (#660) ──────────────────────────────────────────────

    pub fn set_fee_bps(env: Env, admin: Address, fee_bps: u32) {
        fees::set_fee_bps(&env, &admin, fee_bps);
    }

    pub fn get_fee_bps(env: Env) -> u32 {
        fees::get_fee_bps(&env)
    }

    pub fn set_treasury(env: Env, admin: Address, treasury: Address) {
        fees::set_treasury(&env, &admin, treasury);
    }

    pub fn get_treasury_balance(env: Env) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TreasuryBalance)
            .unwrap_or(0)
    }

    // ── Escrow (#660) ─────────────────────────────────────────────────────────

    pub fn fund_escrow(env: Env, payer: Address, payee: Address, amount: i128) -> u64 {
        settlement::fund_escrow(&env, payer, payee, amount)
    }

    pub fn settle_escrow(env: Env, caller: Address, escrow_id: u64) -> (i128, i128) {
        settlement::settle_escrow(&env, caller, escrow_id)
    }

    pub fn refund_escrow(env: Env, admin: Address, escrow_id: u64) {
        settlement::refund_escrow(&env, admin, escrow_id);
    }

    pub fn get_escrow(env: Env, escrow_id: u64) -> Option<Escrow> {
        settlement::get_escrow(&env, escrow_id)
    }

    // ── Tip (#660) ────────────────────────────────────────────────────────────

    pub fn tip(env: Env, tipper: Address, amount: i128) -> (i128, i128) {
        settlement::tip(&env, tipper, amount)
    }

    // ── Batch operations (#662) ───────────────────────────────────────────────

    pub fn batch_settle_escrows(
        env: Env,
        caller: Address,
        escrow_ids: Vec<u64>,
    ) -> Vec<BatchEscrowResult> {
        settlement::batch_settle_escrows(&env, caller, escrow_ids)
    }

    pub fn batch_refund_escrows(env: Env, admin: Address, escrow_ids: Vec<u64>) {
        settlement::batch_refund_escrows(&env, admin, escrow_ids);
    }

    // ── Multi-sig escrow (#658) ───────────────────────────────────────────────

    pub fn ms_fund_escrow(
        env: Env,
        payer: Address,
        payee: Address,
        amount: i128,
        signers: Vec<Address>,
        threshold: u32,
        timeout_ledgers: u32,
    ) -> u64 {
        multisig_escrow::create_ms_escrow(
            &env,
            payer,
            payee,
            amount,
            signers,
            threshold,
            timeout_ledgers,
        )
    }

    pub fn ms_approve_escrow(env: Env, escrow_id: u64, signer: Address) {
        multisig_escrow::approve_ms_escrow(&env, escrow_id, signer);
    }

    pub fn ms_timeout_escrow(env: Env, escrow_id: u64) -> bool {
        multisig_escrow::timeout_ms_escrow(&env, escrow_id)
    }

    pub fn ms_get_escrow(env: Env, escrow_id: u64) -> Option<multisig_escrow::MsEscrow> {
        multisig_escrow::get_ms_escrow(&env, escrow_id)
    }

    // ── Reentrancy view ───────────────────────────────────────────────────────

    pub fn is_locked(env: Env) -> bool {
        storage::is_locked(&env)
    }
}

#[cfg(test)]
mod fuzz_tests;

#[cfg(test)]
mod test;

#[cfg(test)]
mod tests_coverage;
