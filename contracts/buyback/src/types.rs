//! Buyback storage keys, configuration types and event topics.
//!
//! Split out of `lib.rs` (issue #1324).

use soroban_sdk::{contracttype, symbol_short, BytesN, Symbol};

// =============================================================================
// Storage keys
// =============================================================================

#[contracttype]
pub enum DataKey {
    Admin,
    TokenContract,
    OracleContract,
    DexContract,
    BuybackConfig,
    BuybackHistory(u32),
    BuybackHistoryCount,
    LastBuybackLedger,
    TotalBuybackAmount,
    BuybackReserve,
}

// =============================================================================
// Types
// =============================================================================

#[contracttype]
#[derive(Clone)]
pub struct BuybackConfig {
    pub enabled: bool,
    pub price_threshold: i128,
    pub max_buyback_amount: i128,
    pub min_reserve_balance: i128,
    pub buyback_interval: u32,
    pub dex_pool_id: BytesN<32>,
}

#[contracttype]
#[derive(Clone)]
pub struct BuybackRecord {
    pub timestamp: u64,
    pub ledger: u32,
    pub bst_price: i128,
    pub amount_bought: i128,
    pub xlm_spent: i128,
    pub trigger_reason: Symbol,
}

#[contracttype]
#[derive(Clone)]
pub struct BuybackAnalytics {
    pub total_buybacks: u32,
    pub total_bst_bought: i128,
    pub total_xlm_spent: i128,
    pub average_price: i128,
    pub last_buyback_timestamp: u64,
}

// =============================================================================
// Events
// =============================================================================

pub const BUYBACK_EXECUTED: Symbol = symbol_short!("buyback");
pub const CONFIG_UPDATED: Symbol = symbol_short!("config_up");
