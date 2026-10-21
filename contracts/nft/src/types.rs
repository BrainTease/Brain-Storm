//! NFT storage keys and metadata types.
//!
//! Split out of `lib.rs` (issue #1324).

use soroban_sdk::{contracttype, Address, String, Symbol};

#[contracttype]
pub enum DataKey {
    Admin,
    NftOwner(u32),                    // nft_id -> owner
    NftMetadata(u32),                 // nft_id -> metadata
    CourseNfts(Address),              // owner -> Vec<nft_id>
    NextNftId,
    RoyaltyBasis(u32),                // nft_id -> royalty basis points
    RoyaltyRecipient(u32),            // nft_id -> instructor address
    AccessRights(u32, Address),       // (nft_id, holder) -> has_access
    Listing(u32),                     // nft_id -> Listing
    BurnedNft(u32),                   // nft_id -> bool
}

#[contracttype]
#[derive(Clone)]
pub struct NftMetadata {
    pub nft_id: u32,
    pub course_id: Symbol,
    pub course_name: String,
    pub owner: Address,
    pub purchase_date: u64,
    pub royalty_basis: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct CourseNft {
    pub nft_id: u32,
    pub course_id: Symbol,
    pub owner: Address,
    pub instructor: Address,
    pub purchase_price: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct Listing {
    pub nft_id: u32,
    pub seller: Address,
    pub price: i128,
    pub listed_at: u64,
}
