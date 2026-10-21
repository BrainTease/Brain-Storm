//! Contract test suite for `badges`.
//!
//! Split out of `lib.rs` (issue #1324).

use super::*;
use soroban_sdk::testutils::Address as _;

fn setup() -> (Env, BadgesContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register_contract(None, BadgesContract);
    let client = BadgesContractClient::new(&env, &id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
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
fn test_create_badge_type() {
    let (env, client, admin) = setup();
    let badge_type = symbol_short!("FIRST");
    let desc = String::from_str(&env, "First course completion");

    client.create_badge_type(&admin, &badge_type, &desc);
    let badge_type_record = client.get_badge_type(&badge_type).unwrap();
    assert_eq!(badge_type_record.name, badge_type);
    assert_eq!(badge_type_record.total_minted, 0);
}

#[test]
#[should_panic(expected = "Badge type already exists")]
fn test_create_duplicate_badge_type_panics() {
    let (env, client, admin) = setup();
    let badge_type = symbol_short!("FIRST");
    let desc = String::from_str(&env, "First course completion");

    client.create_badge_type(&admin, &badge_type, &desc);
    client.create_badge_type(&admin, &badge_type, &desc);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_create_badge_type() {
    let (env, client, _) = setup();
    let rando = Address::generate(&env);
    let badge_type = symbol_short!("FIRST");
    let desc = String::from_str(&env, "First course completion");

    client.create_badge_type(&rando, &badge_type, &desc);
}

#[test]
fn test_mint_badge() {
    let (env, client, admin) = setup();
    let recipient = Address::generate(&env);
    let badge_type = symbol_short!("FIRST");
    let desc = String::from_str(&env, "First course completion");

    client.create_badge_type(&admin, &badge_type, &desc);
    let id = client.mint_badge(&admin, &recipient, &badge_type);
    assert_eq!(id, 1);

    let badge = client.get_badge(&id).unwrap();
    assert_eq!(badge.owner, recipient);
    assert_eq!(badge.badge_type, badge_type);
}

#[test]
#[should_panic(expected = "Badge type does not exist")]
fn test_mint_nonexistent_badge_type_panics() {
    let (env, client, admin) = setup();
    let recipient = Address::generate(&env);
    let badge_type = symbol_short!("FAKE");

    client.mint_badge(&admin, &recipient, &badge_type);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_mint() {
    let (env, client, admin) = setup();
    let rando = Address::generate(&env);
    let recipient = Address::generate(&env);
    let badge_type = symbol_short!("FIRST");
    let desc = String::from_str(&env, "First course completion");

    client.create_badge_type(&admin, &badge_type, &desc);
    client.mint_badge(&rando, &recipient, &badge_type);
}

#[test]
fn test_get_badges_by_owner() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    let badge_type1 = symbol_short!("FIRST");
    let badge_type2 = symbol_short!("SECOND");
    let desc = String::from_str(&env, "Badge");

    client.create_badge_type(&admin, &badge_type1, &desc);
    client.create_badge_type(&admin, &badge_type2, &desc);
    client.mint_badge(&admin, &owner, &badge_type1);
    client.mint_badge(&admin, &owner, &badge_type2);

    let badges = client.get_badges_by_owner(&owner);
    assert_eq!(badges.len(), 2);
    assert_eq!(badges.get(0).unwrap().badge_type, badge_type1);
    assert_eq!(badges.get(1).unwrap().badge_type, badge_type2);
}

#[test]
fn test_verify_badge() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    let badge_type = symbol_short!("FIRST");
    let desc = String::from_str(&env, "First course completion");

    client.create_badge_type(&admin, &badge_type, &desc);
    assert!(!client.verify_badge(&owner, &badge_type));

    client.mint_badge(&admin, &owner, &badge_type);
    assert!(client.verify_badge(&owner, &badge_type));
}

#[test]
fn test_badge_type_minted_count() {
    let (env, client, admin) = setup();
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let badge_type = symbol_short!("FIRST");
    let desc = String::from_str(&env, "First course completion");

    client.create_badge_type(&admin, &badge_type, &desc);
    client.mint_badge(&admin, &owner1, &badge_type);
    client.mint_badge(&admin, &owner2, &badge_type);

    let badge_type_record = client.get_badge_type(&badge_type).unwrap();
    assert_eq!(badge_type_record.total_minted, 2);
}

#[test]
#[should_panic(expected = "soulbound")]
fn test_transfer_panics() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    let other = Address::generate(&env);
    let badge_type = symbol_short!("FIRST");
    let desc = String::from_str(&env, "First course completion");

    client.create_badge_type(&admin, &badge_type, &desc);
    let id = client.mint_badge(&admin, &owner, &badge_type);
    client.transfer(&owner, &other, &id);
}

// ─────────────────────────────────────────────────────────────────────────
// Issue #1003: Access Control Tests (Comprehensive Admin Authorization)
// ─────────────────────────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialize_rejected() {
    let (env, client, admin) = setup();
    let another_admin = Address::generate(&env);
    client.initialize(&another_admin);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_create_second_badge_type() {
    let (env, client, admin) = setup();
    let non_admin = Address::generate(&env);
    
    // Admin creates first badge type
    client.create_badge_type(&admin, &symbol_short!("GOLD"), &String::from_str(&env, "Gold"));
    
    // Non-admin tries to create second badge type
    client.create_badge_type(&non_admin, &symbol_short!("SILVER"), &String::from_str(&env, "Silver"));
}

#[test]
fn test_admin_can_always_create_badge_type() {
    let (env, client, admin) = setup();
    
    client.create_badge_type(&admin, &symbol_short!("GOLD"), &String::from_str(&env, "Gold"));
    client.create_badge_type(&admin, &symbol_short!("PLAT"), &String::from_str(&env, "Platinum"));
    
    assert!(client.get_badge_type(&symbol_short!("GOLD")).is_some());
    assert!(client.get_badge_type(&symbol_short!("PLAT")).is_some());
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_mint() {
    let (env, client, admin) = setup();
    let non_admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    client.create_badge_type(&admin, &symbol_short!("GOLD"), &String::from_str(&env, "Gold"));
    client.mint_badge(&non_admin, &recipient, &symbol_short!("GOLD"));
}

#[test]
fn test_admin_can_mint_multiple_badges() {
    let (env, client, admin) = setup();
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    
    client.create_badge_type(&admin, &symbol_short!("GOLD"), &String::from_str(&env, "Gold"));
    let badge1 = client.mint_badge(&admin, &user1, &symbol_short!("GOLD"));
    let badge2 = client.mint_badge(&admin, &user2, &symbol_short!("GOLD"));
    
    assert!(badge1 > 0);
    assert!(badge2 > 0);
    assert_eq!(client.get_badge(&badge1).unwrap().owner, user1);
    assert_eq!(client.get_badge(&badge2).unwrap().owner, user2);
}

#[test]
#[should_panic(expected = "Unauthorized: admin required")]
fn test_non_admin_cannot_burn() {
    let (env, client, admin) = setup();
    let non_admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    client.create_badge_type(&admin, &symbol_short!("GOLD"), &String::from_str(&env, "Gold"));
    let badge_id = client.mint_badge(&admin, &recipient, &symbol_short!("GOLD"));
    
    client.burn_badge(&non_admin, &badge_id);
}

#[test]
fn test_admin_can_burn_badge() {
    let (env, client, admin) = setup();
    let recipient = Address::generate(&env);
    
    client.create_badge_type(&admin, &symbol_short!("GOLD"), &String::from_str(&env, "Gold"));
    let badge_id = client.mint_badge(&admin, &recipient, &symbol_short!("GOLD"));
    
    client.burn_badge(&admin, &badge_id);
    assert!(client.get_badge(&badge_id).is_none());
}

#[test]
#[should_panic(expected = "soulbound")]
fn test_badge_transfer_always_fails_soulbound() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    client.create_badge_type(&admin, &symbol_short!("GOLD"), &String::from_str(&env, "Gold"));
    let badge_id = client.mint_badge(&admin, &owner, &symbol_short!("GOLD"));
    
    // Even owner cannot transfer - badges are soulbound
    client.transfer(&owner, &recipient, &badge_id);
}

#[test]
fn test_admin_revoke_and_award_flow() {
    let (env, client, admin) = setup();
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    
    // Admin creates badge type
    client.create_badge_type(&admin, &symbol_short!("GOLD"), &String::from_str(&env, "Gold"));
    
    // Admin awards badge to user1
    let badge_id = client.mint_badge(&admin, &user1, &symbol_short!("GOLD"));
    assert_eq!(client.get_badge(&badge_id).unwrap().owner, user1);
    
    // Verify user1 owns the badge
    let user1_badges = client.get_badges_by_owner(&user1);
    assert_eq!(user1_badges.len(), 1);
    
    // Admin revokes badge from user1
    client.burn_badge(&admin, &badge_id);
    assert!(client.get_badge(&badge_id).is_none());
    
    // Verify user1 no longer owns any badges
    let user1_badges_after = client.get_badges_by_owner(&user1);
    assert_eq!(user1_badges_after.len(), 0);
    
    // Admin awards NEW badge to user2
    let new_badge_id = client.mint_badge(&admin, &user2, &symbol_short!("GOLD"));
    assert_eq!(client.get_badge(&new_badge_id).unwrap().owner, user2);
    
    // Verify user2 now owns a badge
    let user2_badges = client.get_badges_by_owner(&user2);
    assert_eq!(user2_badges.len(), 1);
}

#[test]
fn test_verify_badge_returns_correct_ownership() {
    let (env, client, admin) = setup();
    let user = Address::generate(&env);
    let other_user = Address::generate(&env);
    
    client.create_badge_type(&admin, &symbol_short!("GOLD"), &String::from_str(&env, "Gold"));
    client.mint_badge(&admin, &user, &symbol_short!("GOLD"));
    
    // Verify user has badge
    assert!(client.verify_badge(&user, &symbol_short!("GOLD")));
    
    // Verify other user does not have badge
    assert!(!client.verify_badge(&other_user, &symbol_short!("GOLD")));
}

#[test]
fn test_admin_authorization_is_enforced() {
    let (env, client, admin) = setup();
    let impostor = Address::generate(&env);
    
    // Impostor tries to initialize (already initialized, will fail differently)
    // But setup uses admin, so next try is create_badge_type
    
    // Impostor cannot create badge type
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.create_badge_type(&impostor, &symbol_short!("FRAUD"), &String::from_str(&env, "Fraud"));
    }));
    assert!(result.is_err(), "Non-admin should not be able to create badge type");
}
