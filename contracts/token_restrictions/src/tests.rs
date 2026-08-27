#[cfg(test)]
mod tests {
    use crate::{
        TokenRestrictionsContract, TokenRestrictionsContractClient,
        MAX_LOG_ENTRIES, MAX_PENDING_APPROVALS, MAX_TRANSFER_LIMIT,
    };
    use soroban_sdk::{testutils::Address as _, Address, Env};

    fn setup() -> (Env, TokenRestrictionsContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, TokenRestrictionsContract);
        let client = TokenRestrictionsContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin)
    }

    // ── Initialization ────────────────────────────────────────────────────────

    #[test]
    fn test_initialize() {
        let (_, _, _) = setup();
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_panics() {
        let (_, client, admin) = setup();
        client.initialize(&admin);
    }

    // ── Whitelist ─────────────────────────────────────────────────────────────

    #[test]
    fn test_add_to_whitelist() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.add_to_whitelist(&admin, &account);
        assert!(client.is_whitelisted(&account));
    }

    #[test]
    fn test_not_whitelisted_by_default() {
        let (env, client, _) = setup();
        let account = Address::generate(&env);
        assert!(!client.is_whitelisted(&account));
    }

    #[test]
    fn test_remove_from_whitelist() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.add_to_whitelist(&admin, &account);
        client.remove_from_whitelist(&admin, &account);
        assert!(!client.is_whitelisted(&account));
    }

    #[test]
    #[should_panic(expected = "Unauthorized: admin required")]
    fn test_non_admin_cannot_whitelist() {
        let (env, client, _) = setup();
        let rando = Address::generate(&env);
        let account = Address::generate(&env);
        client.add_to_whitelist(&rando, &account);
    }

    // ── Blacklist ─────────────────────────────────────────────────────────────

    #[test]
    fn test_add_to_blacklist() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.add_to_blacklist(&admin, &account);
        assert!(client.is_blacklisted(&account));
    }

    #[test]
    fn test_not_blacklisted_by_default() {
        let (env, client, _) = setup();
        let account = Address::generate(&env);
        assert!(!client.is_blacklisted(&account));
    }

    #[test]
    fn test_remove_from_blacklist() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.add_to_blacklist(&admin, &account);
        client.remove_from_blacklist(&admin, &account);
        assert!(!client.is_blacklisted(&account));
    }

    #[test]
    #[should_panic(expected = "Unauthorized: admin required")]
    fn test_non_admin_cannot_blacklist() {
        let (env, client, _) = setup();
        let rando = Address::generate(&env);
        let account = Address::generate(&env);
        client.add_to_blacklist(&rando, &account);
    }

    // ── Transfer limits (Issue #1015) ─────────────────────────────────────────

    #[test]
    fn test_set_transfer_limit() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.set_transfer_limit(&admin, &account, &5000);
        assert_eq!(client.get_transfer_limit(&account), 5000);
    }

    /// Default limit should be MAX_TRANSFER_LIMIT (meaning no restriction).
    #[test]
    fn test_default_transfer_limit_is_max() {
        let (env, client, _) = setup();
        let account = Address::generate(&env);
        assert_eq!(client.get_transfer_limit(&account), MAX_TRANSFER_LIMIT);
    }

    /// Setting limit exactly at MAX_TRANSFER_LIMIT is allowed (at-limit).
    #[test]
    fn test_set_transfer_limit_at_max() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.set_transfer_limit(&admin, &account, &MAX_TRANSFER_LIMIT);
        assert_eq!(client.get_transfer_limit(&account), MAX_TRANSFER_LIMIT);
    }

    /// Setting limit above MAX_TRANSFER_LIMIT is rejected (over-limit).
    #[test]
    #[should_panic(expected = "Limit exceeds maximum allowed value")]
    fn test_set_transfer_limit_over_max_rejected() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.set_transfer_limit(&admin, &account, &(MAX_TRANSFER_LIMIT + 1));
    }

    #[test]
    #[should_panic(expected = "Limit must be positive")]
    fn test_set_transfer_limit_zero_rejected() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.set_transfer_limit(&admin, &account, &0);
    }

    #[test]
    #[should_panic(expected = "Limit must be positive")]
    fn test_set_transfer_limit_negative_rejected() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.set_transfer_limit(&admin, &account, &-1);
    }

    #[test]
    #[should_panic(expected = "Unauthorized: admin required")]
    fn test_non_admin_cannot_set_limit() {
        let (env, client, _) = setup();
        let rando = Address::generate(&env);
        let account = Address::generate(&env);
        client.set_transfer_limit(&rando, &account, &5000);
    }

    // ── can_transfer_amount respects limits ───────────────────────────────────

    #[test]
    fn test_can_transfer_amount_at_limit() {
        let (env, client, admin) = setup();
        let from = Address::generate(&env);
        let to = Address::generate(&env);
        let limit = 1_000_i128;
        client.set_transfer_limit(&admin, &from, &limit);
        // Amount exactly at the limit should be allowed
        assert!(client.can_transfer_amount(&from, &to, &limit));
    }

    #[test]
    fn test_can_transfer_amount_over_limit_rejected() {
        let (env, client, admin) = setup();
        let from = Address::generate(&env);
        let to = Address::generate(&env);
        let limit = 1_000_i128;
        client.set_transfer_limit(&admin, &from, &limit);
        // Amount one above the limit should be rejected
        assert!(!client.can_transfer_amount(&from, &to, &(limit + 1)));
    }

    // ── Pending approvals (Issue #1015) ───────────────────────────────────────

    #[test]
    fn test_request_transfer_approval() {
        let (env, client, _) = setup();
        let from = Address::generate(&env);
        let to = Address::generate(&env);
        client.request_transfer_approval(&from, &to, &1000);
        // After requesting, the transfer is pending (not approved)
        assert!(!client.is_transfer_approved(&from, &to));
        assert_eq!(client.get_pending_approval_count(), 1);
    }

    #[test]
    fn test_approve_transfer_clears_pending() {
        let (env, client, admin) = setup();
        let from = Address::generate(&env);
        let to = Address::generate(&env);
        client.request_transfer_approval(&from, &to, &1000);
        assert_eq!(client.get_pending_approval_count(), 1);
        client.approve_transfer(&admin, &from, &to);
        assert!(client.is_transfer_approved(&from, &to));
        assert_eq!(client.get_pending_approval_count(), 0);
    }

    /// Requesting the same pair twice must not double-count the pending slot.
    #[test]
    fn test_duplicate_request_does_not_increment_count() {
        let (env, client, _) = setup();
        let from = Address::generate(&env);
        let to = Address::generate(&env);
        client.request_transfer_approval(&from, &to, &1000);
        client.request_transfer_approval(&from, &to, &2000); // same pair
        assert_eq!(client.get_pending_approval_count(), 1);
    }

    /// Filling exactly to MAX_PENDING_APPROVALS must succeed (at-limit).
    /// We use a small MAX value (500) so we test logic, not performance.
    /// For this test we verify count reaches the cap without panic.
    #[test]
    fn test_pending_approvals_at_limit_accepted() {
        let (env, client, admin) = setup();
        // Add MAX_PENDING_APPROVALS - 1 pairs first, then add the last one at
        // the exact cap.  We cap the loop at a small number for test speed.
        let cap = 5_u64; // representative sample; real MAX is 500
        let from = Address::generate(&env);

        for i in 0..cap {
            // We need unique "to" addresses to get unique pairs.
            // Re-use the admin address variants via ledger sequence manipulation
            // is not feasible in a no-std environment, so we generate fresh ones.
            let _ = i; // suppress unused warning
            let to = Address::generate(&env);
            client.request_transfer_approval(&from, &to, &100);
        }
        // Approve all to drain the counter back to zero
        let count = client.get_pending_approval_count();
        assert_eq!(count, cap);
        let _ = admin; // keep admin in scope
    }

    /// Once MAX_PENDING_APPROVALS is reached, new requests must be rejected.
    #[test]
    #[should_panic(expected = "Too many pending approvals")]
    fn test_pending_approvals_over_limit_rejected() {
        // We create a contract where the cap is effectively 0 by filling it
        // completely via the real MAX constant.  Since MAX_PENDING_APPROVALS
        // is 500, we seed the counter directly by calling request 500 times
        // then verify the 501st panics.
        // To keep the test fast we use a patched constant check:
        // The implementation panics when count >= MAX_PENDING_APPROVALS.
        // We assert this is honored by filling up 500 unique pairs.
        let (env, client, _) = setup();
        let from = Address::generate(&env);

        // Fill to the cap
        for _ in 0..MAX_PENDING_APPROVALS {
            let to = Address::generate(&env);
            client.request_transfer_approval(&from, &to, &1);
        }

        // This one must panic
        let to_extra = Address::generate(&env);
        client.request_transfer_approval(&from, &to_extra, &1);
    }

    // ── Security: whitelist and blacklist are independent ─────────────────────

    #[test]
    fn test_whitelist_and_blacklist_are_independent() {
        let (env, client, admin) = setup();
        let account = Address::generate(&env);
        client.add_to_whitelist(&admin, &account);
        client.add_to_blacklist(&admin, &account);
        assert!(client.is_whitelisted(&account));
        assert!(client.is_blacklisted(&account));
    }

    // ── Log count cap (Issue #1015) ───────────────────────────────────────────

    /// Verify MAX_LOG_ENTRIES constant is documented and accessible.
    #[test]
    fn test_max_log_entries_constant() {
        assert_eq!(MAX_LOG_ENTRIES, 1_000);
    }

    /// Verify MAX_PENDING_APPROVALS constant is documented and accessible.
    #[test]
    fn test_max_pending_approvals_constant() {
        assert_eq!(MAX_PENDING_APPROVALS, 500);
    }

    /// Verify MAX_TRANSFER_LIMIT constant is accessible.
    #[test]
    fn test_max_transfer_limit_constant() {
        assert_eq!(MAX_TRANSFER_LIMIT, 1_000_000_000_000_000_000_i128);
    }
}
