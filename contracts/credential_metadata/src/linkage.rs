//! Credential ↔ NFT linkage — Issue #635
//!
//! Atomic cross-contract linkage: issuing a credential mints a linked NFT.
//! On failure in either operation no partial state is left.

use soroban_sdk::{contracttype, Address, Env, String, Symbol, symbol_short};

use shared::ttl::{bump_persistent, bump_instance, TtlConfig};

// ── Events ────────────────────────────────────────────────────────────────────

pub const LINKED: Symbol    = symbol_short!("linked");
pub const UNLINKED: Symbol  = symbol_short!("unlinked");

// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
pub enum LinkageKey {
    /// credential_id → nft_id
    CredentialNft(u64),
    /// nft_id → credential_id (reverse lookup)
    NftCredential(u32),
    /// Address of the deployed NFT contract.
    NftContract,
}

// ── Types ─────────────────────────────────────────────────────────────────────

/// A link record storing both IDs.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CredentialNftLink {
    pub credential_id: u64,
    pub nft_id: u32,
    pub nft_contract: Address,
    pub linked_at: u64,
}

// ── Internal ──────────────────────────────────────────────────────────────────

/// Register the NFT contract address (admin only, called once at init).
pub fn set_nft_contract(env: &Env, nft_contract: Address) {
    env.storage().instance().set(&LinkageKey::NftContract, &nft_contract);
    bump_instance(env, &TtlConfig::default());
}

pub fn get_nft_contract(env: &Env) -> Option<Address> {
    let value = env.storage().instance().get(&LinkageKey::NftContract);
    if value.is_some() {
        bump_instance(env, &TtlConfig::default());
    }
    value
}

// ── Core linkage ──────────────────────────────────────────────────────────────

/// Issue a credential and atomically mint a linked NFT.
///
/// This function is called from `CredentialMetadataContract::issue_with_nft`.
/// It performs both operations and stores the bi-directional link.
///
/// # Arguments
/// * `env`           — Soroban environment.
/// * `admin`         — Admin address (must have already been authorised by caller).
/// * `credential_id` — Unique credential ID.
/// * `owner`         — Address receiving the NFT.
/// * `course_id`     — Course symbol for the NFT.
/// * `course_name`   — Human-readable course name.
/// * `instructor`    — Instructor address (royalty recipient).
/// * `royalty_basis` — Royalty basis points (0–10000).
///
/// # Returns
/// The minted NFT ID.
///
/// # Panics
/// - `"NFT contract not set"` if `set_nft_contract` was not called.
/// - `"Credential already has a linked NFT"` if already linked.
/// - Any panic from the NFT contract cross-call rolls back atomically.
pub fn issue_and_mint_nft(
    env: &Env,
    admin: &Address,
    credential_id: u64,
    owner: Address,
    course_id: Symbol,
    course_name: String,
    instructor: Address,
    royalty_basis: u32,
) -> u32 {
    // Ensure not already linked
    assert!(
        !env.storage().persistent().has(&LinkageKey::CredentialNft(credential_id)),
        "Credential already has a linked NFT"
    );

    let nft_contract: Address = env.storage().instance()
        .get(&LinkageKey::NftContract)
        .expect("NFT contract not set");

    // Cross-contract call to NFT contract's mint_course_nft.
    // If this panics, the whole invocation rolls back — no partial state.
    let nft_client = nft_contract_client::Client::new(env, &nft_contract);
    let nft_id = nft_client.mint_course_nft(
        admin,
        &owner,
        &course_id,
        &course_name,
        &instructor,
        &0_i128, // purchase_price — free for credential NFTs
        &royalty_basis,
    );

    // Store bi-directional link
    let link = CredentialNftLink {
        credential_id,
        nft_id,
        nft_contract: nft_contract.clone(),
        linked_at: env.ledger().timestamp(),
    };

    let ttl = TtlConfig::default();
    let cred_key = LinkageKey::CredentialNft(credential_id);
    let nft_key = LinkageKey::NftCredential(nft_id);
    env.storage().persistent().set(&cred_key, &link);
    env.storage().persistent().set(&nft_key, &credential_id);
    bump_persistent(env, &cred_key, &ttl);
    bump_persistent(env, &nft_key, &ttl);

    env.events().publish(
        (LINKED, symbol_short!("cred")),
        (credential_id, nft_id, owner),
    );

    nft_id
}

/// Remove the linkage between a credential and its NFT (admin only).
pub fn unlink(env: &Env, _admin: &Address, credential_id: u64) {
    let link: CredentialNftLink = env.storage().persistent()
        .get(&LinkageKey::CredentialNft(credential_id))
        .expect("No NFT link found for credential");

    env.storage().persistent().remove(&LinkageKey::CredentialNft(credential_id));
    env.storage().persistent().remove(&LinkageKey::NftCredential(link.nft_id));
    bump_instance(env, &TtlConfig::default());

    env.events().publish(
        (UNLINKED, symbol_short!("cred")),
        (credential_id, link.nft_id),
    );
}

// ── Getters ───────────────────────────────────────────────────────────────────

/// Get the NFT link for a credential.
pub fn get_credential_nft_link(env: &Env, credential_id: u64) -> Option<CredentialNftLink> {
    let key = LinkageKey::CredentialNft(credential_id);
    let value = env.storage().persistent().get(&key);
    if value.is_some() {
        bump_persistent(env, &key, &TtlConfig::default());
    }
    value
}

/// Get the credential ID for an NFT (reverse lookup).
pub fn get_nft_credential(env: &Env, nft_id: u32) -> Option<u64> {
    let key = LinkageKey::NftCredential(nft_id);
    let value = env.storage().persistent().get(&key);
    if value.is_some() {
        bump_persistent(env, &key, &TtlConfig::default());
    }
    value
}

/// Returns true if the credential has a linked NFT.
pub fn is_linked(env: &Env, credential_id: u64) -> bool {
    env.storage().persistent().has(&LinkageKey::CredentialNft(credential_id))
}

// ── NFT contract client stub ─────────────────────────────────────────────────
// In production this is auto-generated by `soroban contract bindings`.
// We declare a minimal stub here so the credential_metadata crate compiles
// without depending on the nft crate directly.

mod nft_contract_client {
    use soroban_sdk::{contractclient, Address, Env, String, Symbol};

    #[allow(dead_code)]
    #[contractclient(name = "Client")]
    pub trait NftContract {
        fn mint_course_nft(
            env: Env,
            admin: Address,
            owner: Address,
            course_id: Symbol,
            course_name: String,
            instructor: Address,
            purchase_price: i128,
            royalty_basis: u32,
        ) -> u32;
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, symbol_short, String};

    #[test]
    fn test_set_and_get_nft_contract() {
        let env = Env::default();
        env.mock_all_auths();
        let nft = Address::generate(&env);
        set_nft_contract(&env, nft.clone());
        assert_eq!(get_nft_contract(&env), Some(nft));
    }

    #[test]
    fn test_get_credential_nft_link_returns_none_when_not_linked() {
        let env = Env::default();
        assert!(get_credential_nft_link(&env, 1).is_none());
    }

    #[test]
    fn test_get_nft_credential_returns_none_when_not_linked() {
        let env = Env::default();
        assert!(get_nft_credential(&env, 42).is_none());
    }

    #[test]
    fn test_is_linked_returns_false_when_not_linked() {
        let env = Env::default();
        assert!(!is_linked(&env, 99));
    }

    #[test]
    fn test_unlink_panics_when_no_link() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            unlink(&env, &admin, 1);
        }));
        assert!(result.is_err());
    }
}
