use soroban_sdk::{contracttype, Address, Symbol};

// =============================================================================
// Storage keys
// =============================================================================

#[contracttype]
pub enum DataKey {
    Admin,
    TokenA,                               // BST token contract
    TokenB,                               // XLM (native asset)
    ReserveA,                             // BST reserve
    ReserveB,                             // XLM reserve
    TotalLiquidity,                       // Total LP tokens minted
    Liquidity(Address),                   // user → liquidity balance
    FeeCollector,                         // Address to collect fees
    PoolConfig,                          // PoolConfig
    SwapHistory(u32),                    // index → SwapRecord
    SwapHistoryCount,                    // u32
    MiningRewards(Address),              // user → accumulated rewards
    MiningConfig,                        // MiningConfig
    AccumulatedFees,                     // i128 — total fees not yet collected
    EmergencyDrained,                    // bool
}

// =============================================================================
// Types
// =============================================================================

#[contracttype]
#[derive(Clone)]
pub struct PoolConfig {
    pub fee_numerator: u32,               // Fee as fraction (e.g., 3 for 0.3%)
    pub fee_denominator: u32,             // Fee denominator (e.g., 1000)
    pub swap_enabled: bool,
    pub add_liquidity_enabled: bool,
    pub remove_liquidity_enabled: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct SwapRecord {
    pub timestamp: u64,
    pub user: Address,
    pub token_in: Symbol,                 // 'bst' or 'xlm'
    pub amount_in: i128,
    pub token_out: Symbol,
    pub amount_out: i128,
    pub fee: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct MiningConfig {
    pub enabled: bool,
    pub reward_rate: i128,                // BST tokens per ledger per liquidity unit
    pub reward_token: Address,            // BST token contract
}

#[contracttype]
#[derive(Clone)]
pub struct PoolStats {
    pub reserve_a: i128,
    pub reserve_b: i128,
    pub total_liquidity: i128,
    pub volume_24h: i128,
    pub fees_24h: i128,
    pub price_bst_xlm: i128,             // BST price in XLM (scaled)
}
