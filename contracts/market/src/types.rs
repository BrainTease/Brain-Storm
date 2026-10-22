use soroban_sdk::{contracterror, contracttype, symbol_short, Address, String, Symbol};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum MarketError {
    /// Contract is currently locked (reentrancy attempt detected)
    ReentrancyLocked = 1,
    /// Product not found
    ProductNotFound = 2,
    /// Insufficient balance for purchase
    InsufficientBalance = 3,
    /// Unauthorized action
    Unauthorized = 4,
    /// Invalid product state
    InvalidProductState = 5,
    /// Purchase already completed
    AlreadyPurchased = 6,
    /// Call during reentrant attempt
    ReentrantCall = 7,
    /// Payment failed
    PaymentFailed = 8,
    /// Royalty distribution failed
    RoyaltyDistributionFailed = 9,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Product {
    pub id: u32,
    pub seller: Address,
    pub price: i128,
    pub token_address: Address,
    pub metadata: String,
    pub sold: bool,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Purchase {
    pub product_id: u32,
    pub buyer: Address,
    pub amount: i128,
    pub timestamp: u64,
    pub completed: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProductListing {
    pub product_id: u32,
    pub seller: Address,
    pub price: i128,
    pub token_address: Address,
    pub metadata: String,
    pub status: ProductStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProductStatus {
    Available,
    Sold,
    Cancelled,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum EscrowStatus {
    Funded,
    Settled,
    Refunded,
}

#[contracttype]
#[derive(Clone)]
pub struct Escrow {
    pub id: u64,
    pub payer: Address,
    pub payee: Address,
    pub amount: i128,
    pub status: EscrowStatus,
}

#[contracttype]
#[derive(Clone)]
pub struct BatchEscrowResult {
    pub escrow_id: u64,
    pub net: i128,
    pub fee: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum LockStatus {
    Unlocked,
    Locked,
}

pub const EVT_DOMAIN: Symbol = symbol_short!("market");
pub const EVT_PRODUCT_LISTED: Symbol = symbol_short!("prod_list");
pub const EVT_PRODUCT_SOLD: Symbol = symbol_short!("prod_sold");
pub const EVT_ESCROW_FUNDED: Symbol = symbol_short!("es_fund");
pub const EVT_ESCROW_SETTLED: Symbol = symbol_short!("es_settl");
pub const EVT_ESCROW_REFUNDED: Symbol = symbol_short!("es_refnd");
pub const EVT_TIP: Symbol = symbol_short!("tip");
pub const EVT_PAUSED: Symbol = symbol_short!("paused");
pub const EVT_UNPAUSED: Symbol = symbol_short!("unpaused");
