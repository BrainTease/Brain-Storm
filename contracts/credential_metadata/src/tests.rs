#[cfg(test)]
mod tests {
    use crate::{CredentialMetadataContract, CredentialMetadataContractClient};
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    fn setup() -> (Env, CredentialMetadataContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, CredentialMetadataContract);
        let client = CredentialMetadataContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin)
    }

    fn store_sample(env: &Env, client: &CredentialMetadataContractClient, admin: &Address, id: u64) {
        client.store_metadata(
            admin,
            &id,
            &String::from_str(env, "Rust Fundamentals"),
            &1_000_000,
            &9_999_999,
            &String::from_str(env, "A"),
            &String::from_str(env, "QmHash123"),
        );
    }

    #[test]
    fn test_initialize() {
        let (_, _, _) = setup();
        // No panic means success
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_panics() {
        let (_, client, admin) = setup();
        client.initialize(&admin);
    }

    #[test]
    fn test_store_and_retrieve_metadata() {
        let (env, client, admin) = setup();
        store_sample(&env, &client, &admin, 1);
        let meta = client.get_metadata(&1).unwrap();
        assert_eq!(meta.credential_id, 1);
        assert_eq!(meta.grade, String::from_str(&env, "A"));
    }

    #[test]
    #[should_panic(expected = "Only admin can store metadata")]
    fn test_non_admin_cannot_store() {
        let (env, client, _) = setup();
        let rando = Address::generate(&env);
        client.store_metadata(
            &rando,
            &1,
            &String::from_str(&env, "Course"),
            &1_000_000,
            &9_999_999,
            &String::from_str(&env, "B"),
            &String::from_str(&env, "QmHash"),
        );
    }

    #[test]
    fn test_is_not_expired_for_future_expiry() {
        let (env, client, admin) = setup();
        store_sample(&env, &client, &admin, 1);
        assert!(!client.is_expired(&1));
    }

    #[test]
    fn test_update_metadata() {
        let (env, client, admin) = setup();
        store_sample(&env, &client, &admin, 1);
        client.update_metadata(
            &admin,
            &1,
            &String::from_str(&env, "Updated Course"),
            &String::from_str(&env, "B+"),
        );
        let meta = client.get_metadata(&1).unwrap();
        assert_eq!(meta.grade, String::from_str(&env, "B+"));
    }

    #[test]
    #[should_panic(expected = "Metadata not found")]
    fn test_update_nonexistent_metadata_panics() {
        let (env, client, admin) = setup();
        client.update_metadata(
            &admin,
            &999,
            &String::from_str(&env, "Course"),
            &String::from_str(&env, "A"),
        );
    }

    #[test]
    fn test_get_nonexistent_metadata_returns_none() {
        let (_, client, _) = setup();
        assert!(client.get_metadata(&999).is_none());
    }

    #[test]
    fn test_store_multiple_credentials() {
        let (env, client, admin) = setup();
        store_sample(&env, &client, &admin, 1);
        store_sample(&env, &client, &admin, 2);
        assert!(client.get_metadata(&1).is_some());
        assert!(client.get_metadata(&2).is_some());
    }
}
