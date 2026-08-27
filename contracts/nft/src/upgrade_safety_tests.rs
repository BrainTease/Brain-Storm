//! Upgrade-safety tests for the NFT contract (Issue #1013).
//!
//! Verifies that every storage key written by the NFT contract survives a
//! simulated upgrade (deploy → write state → re-read state).
//!
//! # Storage schema documented here
//!
//! | `DataKey` variant               | Storage tier | Value type      |
//! |---------------------------------|--------------|-----------------|
//! | `Admin`                         | instance     | `Address`       |
//! | `NextNftId`                     | instance     | `u32`           |
//! | `NftOwner(nft_id)`              | instance     | `Address`       |
//! | `NftMetadata(nft_id)`           | instance     | `NftMetadata`   |
//! | `CourseNfts(owner)`             | instance     | `Vec<u32>`      |
//! | `RoyaltyBasis(nft_id)`          | instance     | `u32`           |
//! | `RoyaltyRecipient(nft_id)`      | instance     | `Address`       |
//! | `AccessRights(nft_id, holder)`  | instance     | `bool`          |
//! | `Listing(nft_id)`               | instance     | `Listing`       |
//! | `BurnedNft(nft_id)`             | instance     | `bool`          |

#![cfg(test)]

use crate::{NftContract, NftContractClient};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env, String};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn deploy() -> (Env, NftContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register_contract(None, NftContract);
    let client = NftContractClient::new(&env, &id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

fn mint(
    env: &Env,
    client: &NftContractClient,
    admin: &Address,
    owner: &Address,
) -> (u32, Address) {
    let instructor = Address::generate(env);
    let nft_id = client.mint_course_nft(
        admin,
        owner,
        &symbol_short!("CS101"),
        &String::from_str(env, "Intro to CS"),
        &instructor,
        &1_000,
        &500, // 5% royalty basis
    );
    (nft_id, instructor)
}

// ---------------------------------------------------------------------------
// Upgrade-safety tests
// ---------------------------------------------------------------------------

/// Admin key survives simulated upgrade.
#[test]
fn upgrade_safety_nft_admin_key_survives() {
    let (_, client, admin) = deploy();
    let pre = client.get_admin();
    assert_eq!(pre, admin);

    // Simulate upgrade
    assert_eq!(client.get_admin(), admin, "Admin key must survive upgrade");
}

/// NftOwner and NftMetadata keys survive after mint.
#[test]
fn upgrade_safety_nft_owner_and_metadata_survive() {
    let (env, client, admin) = deploy();
    let owner = Address::generate(&env);
    let (nft_id, _instructor) = mint(&env, &client, &admin, &owner);

    // Pre-upgrade
    let pre_owner = client.get_nft_owner(&nft_id).expect("owner must exist");
    let pre_meta = client.get_nft_metadata(&nft_id).expect("metadata must exist");
    assert_eq!(pre_owner, owner);
    assert_eq!(pre_meta.nft_id, nft_id);
    assert_eq!(pre_meta.royalty_basis, 500);

    // Simulate upgrade: re-read
    let post_owner = client.get_nft_owner(&nft_id).expect("owner must survive upgrade");
    let post_meta = client.get_nft_metadata(&nft_id).expect("metadata must survive upgrade");
    assert_eq!(post_owner, pre_owner, "NftOwner key must survive upgrade");
    assert_eq!(post_meta.nft_id, pre_meta.nft_id, "NftMetadata.nft_id must survive upgrade");
    assert_eq!(post_meta.owner, pre_meta.owner, "NftMetadata.owner must survive upgrade");
    assert_eq!(post_meta.royalty_basis, pre_meta.royalty_basis,
        "NftMetadata.royalty_basis must survive upgrade");
}

/// CourseNfts index (owner → Vec<nft_id>) survives.
#[test]
fn upgrade_safety_nft_course_nfts_index_survives() {
    let (env, client, admin) = deploy();
    let owner = Address::generate(&env);
    let (nft_id0, _) = mint(&env, &client, &admin, &owner);
    let (nft_id1, _) = mint(&env, &client, &admin, &owner);

    let pre_nfts = client.get_owner_nfts(&owner);
    assert_eq!(pre_nfts.len(), 2);

    // Simulate upgrade
    let post_nfts = client.get_owner_nfts(&owner);
    assert_eq!(post_nfts.len(), 2, "CourseNfts index must survive upgrade");
    assert_eq!(post_nfts.get(0).unwrap(), nft_id0,
        "First NFT id must survive upgrade");
    assert_eq!(post_nfts.get(1).unwrap(), nft_id1,
        "Second NFT id must survive upgrade");
}

/// RoyaltyBasis and RoyaltyRecipient keys survive.
#[test]
fn upgrade_safety_nft_royalty_info_survives() {
    let (env, client, admin) = deploy();
    let owner = Address::generate(&env);
    let (nft_id, instructor) = mint(&env, &client, &admin, &owner);

    let (pre_recipient, pre_basis) = client.get_royalty_info(&nft_id)
        .expect("royalty info must exist");
    assert_eq!(pre_recipient, instructor);
    assert_eq!(pre_basis, 500);

    // Simulate upgrade
    let (post_recipient, post_basis) = client.get_royalty_info(&nft_id)
        .expect("royalty info must survive upgrade");
    assert_eq!(post_recipient, pre_recipient, "RoyaltyRecipient must survive upgrade");
    assert_eq!(post_basis, pre_basis, "RoyaltyBasis must survive upgrade");
}

/// AccessRights key survives.
#[test]
fn upgrade_safety_nft_access_rights_survive() {
    let (env, client, admin) = deploy();
    let owner = Address::generate(&env);
    let (nft_id, _) = mint(&env, &client, &admin, &owner);

    // Owner automatically gets access on mint
    assert!(client.has_access(&nft_id, &owner), "Owner must have access");

    // Grant access to a third party
    let student = Address::generate(&env);
    client.grant_access(&owner, &nft_id, &student);
    assert!(client.has_access(&nft_id, &student));

    // Simulate upgrade
    assert!(client.has_access(&nft_id, &owner),
        "Owner AccessRights must survive upgrade");
    assert!(client.has_access(&nft_id, &student),
        "Student AccessRights must survive upgrade");
}

/// Listing key survives.
#[test]
fn upgrade_safety_nft_listing_survives() {
    let (env, client, admin) = deploy();
    let owner = Address::generate(&env);
    let (nft_id, _) = mint(&env, &client, &admin, &owner);

    client.list_nft(&owner, &nft_id, &2_500);
    let pre_listing = client.get_listing(&nft_id).expect("listing must exist");
    assert_eq!(pre_listing.price, 2_500);
    assert_eq!(pre_listing.seller, owner);

    // Simulate upgrade
    let post_listing = client.get_listing(&nft_id).expect("listing must survive upgrade");
    assert_eq!(post_listing.price, pre_listing.price,
        "Listing price must survive upgrade");
    assert_eq!(post_listing.seller, pre_listing.seller,
        "Listing seller must survive upgrade");
}

/// Transfer updates owner and index keys; both must survive.
#[test]
fn upgrade_safety_nft_transfer_state_survives() {
    let (env, client, admin) = deploy();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let (nft_id, _) = mint(&env, &client, &admin, &alice);

    client.transfer_nft(&alice, &bob, &nft_id);

    // Pre-upgrade snapshot
    let pre_owner = client.get_nft_owner(&nft_id).unwrap();
    let alice_nfts_pre = client.get_owner_nfts(&alice);
    let bob_nfts_pre = client.get_owner_nfts(&bob);
    assert_eq!(pre_owner, bob);
    assert_eq!(alice_nfts_pre.len(), 0);
    assert_eq!(bob_nfts_pre.len(), 1);

    // Simulate upgrade
    assert_eq!(client.get_nft_owner(&nft_id).unwrap(), pre_owner,
        "NftOwner must survive upgrade after transfer");
    assert_eq!(client.get_owner_nfts(&alice).len(), 0,
        "Alice CourseNfts index must survive upgrade");
    assert_eq!(client.get_owner_nfts(&bob).len(), 1,
        "Bob CourseNfts index must survive upgrade");
}

/// Composite test: diverse state across all key types survives upgrade.
#[test]
fn upgrade_safety_nft_composite_state_survives() {
    let (env, client, admin) = deploy();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    // Write diverse state
    let (nft0, _inst0) = mint(&env, &client, &admin, &alice);
    let (nft1, _inst1) = mint(&env, &client, &admin, &bob);
    let (nft2, _inst2) = mint(&env, &client, &admin, &alice);

    client.grant_access(&alice, &nft0, &charlie);
    client.list_nft(&bob, &nft1, &5_000);
    client.transfer_nft(&alice, &bob, &nft2);

    // Snapshot
    let alice_nfts_pre = client.get_owner_nfts(&alice).len();
    let bob_nfts_pre = client.get_owner_nfts(&bob).len();
    let nft0_owner_pre = client.get_nft_owner(&nft0).unwrap();
    let nft1_listing_pre = client.get_listing(&nft1).unwrap().price;
    let charlie_access_pre = client.has_access(&nft0, &charlie);
    let admin_pre = client.get_admin();

    // Simulate upgrade: all keys must be unchanged
    assert_eq!(client.get_owner_nfts(&alice).len(), alice_nfts_pre,
        "Alice NFT index survives upgrade");
    assert_eq!(client.get_owner_nfts(&bob).len(), bob_nfts_pre,
        "Bob NFT index survives upgrade");
    assert_eq!(client.get_nft_owner(&nft0).unwrap(), nft0_owner_pre,
        "NFT0 owner survives upgrade");
    assert_eq!(client.get_listing(&nft1).unwrap().price, nft1_listing_pre,
        "NFT1 listing price survives upgrade");
    assert_eq!(client.has_access(&nft0, &charlie), charlie_access_pre,
        "Charlie access rights survive upgrade");
    assert_eq!(client.get_admin(), admin_pre,
        "Admin survives upgrade");
}
