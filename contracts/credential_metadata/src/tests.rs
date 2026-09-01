#[cfg(test)]
mod tests {
    use crate::{CredentialMetadataContract, CredentialMetadataContractClient};
    use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String};

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

    fn make_hash(env: &Env, seed: u8) -> BytesN<32> {
        BytesN::from_array(env, &[seed; 32])
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
    #[should_panic(expected = "Unauthorized: admin required")]
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

    // =========================================================================
    // #1010 — Compact storage (reduced footprint) tests
    // =========================================================================

    #[test]
    fn test_store_compact_metadata_stores_record() {
        let (env, client, admin) = setup();
        let hash = make_hash(&env, 0xAB);
        client.store_compact_metadata(&admin, &42, &hash, &1_000_000, &9_999_999);
        let compact = client.get_compact_metadata(&42).unwrap();
        assert_eq!(compact.credential_id, 42);
        assert_eq!(compact.content_hash, hash);
        assert_eq!(compact.issued_at, 1_000_000);
        assert_eq!(compact.expiry_timestamp, 9_999_999);
    }

    #[test]
    fn test_get_compact_metadata_returns_none_for_unknown_id() {
        let (_, client, _) = setup();
        assert!(client.get_compact_metadata(&999).is_none());
    }

    #[test]
    fn test_verify_compact_hash_returns_true_for_matching_hash() {
        let (env, client, admin) = setup();
        let hash = make_hash(&env, 0x01);
        client.store_compact_metadata(&admin, &1, &hash, &0, &0);
        assert!(client.verify_compact_hash(&1, &hash));
    }

    #[test]
    fn test_verify_compact_hash_returns_false_for_wrong_hash() {
        let (env, client, admin) = setup();
        let hash = make_hash(&env, 0x01);
        let wrong = make_hash(&env, 0x02);
        client.store_compact_metadata(&admin, &1, &hash, &0, &0);
        assert!(!client.verify_compact_hash(&1, &wrong));
    }

    #[test]
    fn test_verify_compact_hash_returns_false_for_unknown_id() {
        let (env, client, _) = setup();
        let hash = make_hash(&env, 0x01);
        assert!(!client.verify_compact_hash(&999, &hash));
    }

    #[test]
    fn test_compact_is_not_expired_for_future_expiry() {
        let (env, client, admin) = setup();
        let hash = make_hash(&env, 0x01);
        // Ledger timestamp starts at 0; expiry 9_999_999 is safely in the future
        client.store_compact_metadata(&admin, &1, &hash, &0, &9_999_999);
        assert!(!client.is_compact_expired(&1));
    }

    #[test]
    fn test_compact_never_expires_when_expiry_is_zero() {
        let (env, client, admin) = setup();
        let hash = make_hash(&env, 0x01);
        client.store_compact_metadata(&admin, &1, &hash, &0, &0); // 0 = no expiry
        assert!(!client.is_compact_expired(&1));
    }

    #[test]
    #[should_panic(expected = "Unauthorized: admin required")]
    fn test_compact_non_admin_cannot_store() {
        let (env, client, _) = setup();
        let rando = Address::generate(&env);
        let hash = make_hash(&env, 0x01);
        client.store_compact_metadata(&rando, &1, &hash, &0, &0);
    }

    // ── Migration path: full record → compact record ──────────────────────────

    /// Migrate an existing full record to compact form; verify both remain
    /// readable and the compact record reflects the correct timestamps.
    #[test]
    fn test_migrate_to_compact_creates_compact_record() {
        let (env, client, admin) = setup();
        // 1. Write a full record (simulates existing on-chain data)
        store_sample(&env, &client, &admin, 10);
        assert!(client.get_metadata(&10).is_some(), "full record must exist");
        assert!(client.get_compact_metadata(&10).is_none(), "compact must not exist yet");

        // 2. Migrate — supply the content hash that represents the full record's IPFS CID
        let content_hash = make_hash(&env, 0xFF);
        client.migrate_to_compact(&admin, &10, &content_hash);

        // 3. Compact record now exists with timestamps copied from the full record
        let compact = client.get_compact_metadata(&10).unwrap();
        assert_eq!(compact.credential_id, 10);
        assert_eq!(compact.content_hash, content_hash);
        // completion_date from store_sample is 1_000_000
        assert_eq!(compact.issued_at, 1_000_000);
        // expiry_timestamp from store_sample is 9_999_999
        assert_eq!(compact.expiry_timestamp, 9_999_999);

        // 4. Full record is still readable (non-destructive migration)
        let full = client.get_metadata(&10).unwrap();
        assert_eq!(full.credential_id, 10);
    }

    /// Migrating a non-existent credential should panic with "Metadata not found".
    #[test]
    #[should_panic(expected = "Metadata not found")]
    fn test_migrate_to_compact_panics_for_nonexistent_credential() {
        let (env, client, admin) = setup();
        let content_hash = make_hash(&env, 0x01);
        client.migrate_to_compact(&admin, &999, &content_hash);
    }

    /// A non-admin must not be able to trigger migration.
    #[test]
    #[should_panic(expected = "Unauthorized: admin required")]
    fn test_migrate_to_compact_non_admin_panics() {
        let (env, client, admin) = setup();
        store_sample(&env, &client, &admin, 1);
        let rando = Address::generate(&env);
        let content_hash = make_hash(&env, 0x01);
        client.migrate_to_compact(&rando, &1, &content_hash);
    }

    /// Migrating multiple credentials in sequence keeps records independent.
    #[test]
    fn test_migrate_multiple_credentials_are_independent() {
        let (env, client, admin) = setup();
        store_sample(&env, &client, &admin, 1);
        store_sample(&env, &client, &admin, 2);

        let h1 = make_hash(&env, 0x01);
        let h2 = make_hash(&env, 0x02);
        client.migrate_to_compact(&admin, &1, &h1);
        client.migrate_to_compact(&admin, &2, &h2);

        let c1 = client.get_compact_metadata(&1).unwrap();
        let c2 = client.get_compact_metadata(&2).unwrap();
        assert_eq!(c1.content_hash, h1);
        assert_eq!(c2.content_hash, h2);
        assert_ne!(c1.content_hash, c2.content_hash);
    }
}
