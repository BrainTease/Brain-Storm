#[cfg(test)]
mod tests {
    use crate::{NFTContract, NFTContractClient};
    use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env, String};

    fn setup() -> (Env, NFTContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, NFTContract);
        let client = NFTContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin)
    }

    fn mint_nft(
        env: &Env,
        client: &NFTContractClient,
        admin: &Address,
        owner: &Address,
    ) -> u32 {
        let instructor = Address::generate(env);
        client.mint_course_nft(
            admin,
            owner,
            &symbol_short!("RUST101"),
            &String::from_str(env, "Rust Fundamentals"),
            &instructor,
            &1000,
            &500,
        )
    }

    #[test]
    fn test_initialize_sets_admin() {
        let (_, client, admin) = setup();
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_panics() {
        let (_, client, admin) = setup();
        client.initialize(&admin);
    }

    #[test]
    fn test_mint_course_nft_returns_id() {
        let (env, client, admin) = setup();
        let owner = Address::generate(&env);
        let nft_id = mint_nft(&env, &client, &admin, &owner);
        assert_eq!(nft_id, 0);
    }

    #[test]
    fn test_mint_increments_id() {
        let (env, client, admin) = setup();
        let owner = Address::generate(&env);
        let id1 = mint_nft(&env, &client, &admin, &owner);
        let id2 = mint_nft(&env, &client, &admin, &owner);
        assert_eq!(id1, 0);
        assert_eq!(id2, 1);
    }

    #[test]
    #[should_panic(expected = "Only admin can mint")]
    fn test_non_admin_cannot_mint() {
        let (env, client, _) = setup();
        let rando = Address::generate(&env);
        let owner = Address::generate(&env);
        mint_nft(&env, &client, &rando, &owner);
    }

    #[test]
    #[should_panic(expected = "Royalty basis must be <= 10000")]
    fn test_royalty_basis_exceeds_max_panics() {
        let (env, client, admin) = setup();
        let owner = Address::generate(&env);
        let instructor = Address::generate(&env);
        client.mint_course_nft(
            &admin,
            &owner,
            &symbol_short!("RUST101"),
            &String::from_str(&env, "Rust"),
            &instructor,
            &1000,
            &10001, // exceeds 10000
        );
    }

    #[test]
    fn test_get_nft_metadata() {
        let (env, client, admin) = setup();
        let owner = Address::generate(&env);
        let nft_id = mint_nft(&env, &client, &admin, &owner);
        let metadata = client.get_nft_metadata(&nft_id).unwrap();
        assert_eq!(metadata.nft_id, nft_id);
        assert_eq!(metadata.owner, owner);
        assert_eq!(metadata.royalty_basis, 500);
    }

    #[test]
    fn test_get_nft_owner() {
        let (env, client, admin) = setup();
        let owner = Address::generate(&env);
        let nft_id = mint_nft(&env, &client, &admin, &owner);
        assert_eq!(client.get_nft_owner(&nft_id).unwrap(), owner);
    }

    #[test]
    fn test_get_owner_nfts() {
        let (env, client, admin) = setup();
        let owner = Address::generate(&env);
        mint_nft(&env, &client, &admin, &owner);
        mint_nft(&env, &client, &admin, &owner);
        let nfts = client.get_owner_nfts(&owner);
        assert_eq!(nfts.len(), 2);
    }

    #[test]
    fn test_transfer_nft_changes_owner() {
        let (env, client, admin) = setup();
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);
        let nft_id = mint_nft(&env, &client, &admin, &owner);
        client.transfer_nft(&owner, &recipient, &nft_id);
        assert_eq!(client.get_nft_owner(&nft_id).unwrap(), recipient);
    }

    #[test]
    #[should_panic(expected = "Not NFT owner")]
    fn test_transfer_by_non_owner_panics() {
        let (env, client, admin) = setup();
        let owner = Address::generate(&env);
        let rando = Address::generate(&env);
        let recipient = Address::generate(&env);
        let nft_id = mint_nft(&env, &client, &admin, &owner);
        client.transfer_nft(&rando, &recipient, &nft_id);
    }

    #[test]
    fn test_owner_has_access_after_mint() {
        let (env, client, admin) = setup();
        let owner = Address::generate(&env);
        let nft_id = mint_nft(&env, &client, &admin, &owner);
        assert!(client.has_access(&nft_id, &owner));
    }

    #[test]
    fn test_grant_and_revoke_access() {
        let (env, client, admin) = setup();
        let owner = Address::generate(&env);
        let viewer = Address::generate(&env);
        let nft_id = mint_nft(&env, &client, &admin, &owner);

        assert!(!client.has_access(&nft_id, &viewer));
        client.grant_access(&owner, &nft_id, &viewer);
        assert!(client.has_access(&nft_id, &viewer));
        client.revoke_access(&owner, &nft_id, &viewer);
        assert!(!client.has_access(&nft_id, &viewer));
    }

    #[test]
    fn test_get_royalty_info() {
        let (env, client, admin) = setup();
        let owner = Address::generate(&env);
        let nft_id = mint_nft(&env, &client, &admin, &owner);
        let (_, basis) = client.get_royalty_info(&nft_id).unwrap();
        assert_eq!(basis, 500);
    }

    #[test]
    fn test_get_metadata_nonexistent_returns_none() {
        let (_, client, _) = setup();
        assert!(client.get_nft_metadata(&9999).is_none());
    }
}
