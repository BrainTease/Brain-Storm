#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, String, Symbol, Vec};

mod types;
pub use types::*;

use brain_storm_shared::access;

// =============================================================================
// Contract
// =============================================================================

#[contract]
pub struct BadgesContract;

#[contractimpl]
impl BadgesContract {
    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    pub fn initialize(env: Env, admin: Address) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "Already initialized"
        );
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextId, &1_u64);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    // -------------------------------------------------------------------------
    // Badge Types (admin only)
    // -------------------------------------------------------------------------

    pub fn create_badge_type(
        env: Env,
        admin: Address,
        badge_type: Symbol,
        description: String,
    ) {
        access::require_admin(&env, &admin, &DataKey::Admin);
        assert!(
            !env.storage()
                .instance()
                .has(&DataKey::BadgeType(badge_type.clone())),
            "Badge type already exists"
        );

        let badge_type_record = BadgeTypeRecord {
            name: badge_type.clone(),
            description,
            total_minted: 0,
        };

        env.storage()
            .instance()
            .set(&DataKey::BadgeType(badge_type), &badge_type_record);
    }

    pub fn get_badge_type(env: Env, badge_type: Symbol) -> Option<BadgeTypeRecord> {
        env.storage().instance().get(&DataKey::BadgeType(badge_type))
    }

    // -------------------------------------------------------------------------
    // Minting (admin only)
    // -------------------------------------------------------------------------

    pub fn mint_badge(env: Env, admin: Address, recipient: Address, badge_type: Symbol) -> u64 {
        access::require_admin(&env, &admin, &DataKey::Admin);
        assert!(
            env.storage()
                .instance()
                .has(&DataKey::BadgeType(badge_type.clone())),
            "Badge type does not exist"
        );

        let id: u64 = env.storage().instance().get(&DataKey::NextId).unwrap();
        let badge = BadgeRecord {
            id,
            owner: recipient.clone(),
            badge_type: badge_type.clone(),
            minted_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Badge(id), &badge);

        // Add to owner's badge list
        let owner_key = DataKey::OwnerBadges(recipient.clone());
        let mut badges: Vec<u64> = env
            .storage()
            .persistent()
            .get(&owner_key)
            .unwrap_or_else(|| Vec::new(&env));
        badges.push_back(id);
        env.storage().persistent().set(&owner_key, &badges);

        // Update badge type stats
        let mut badge_type_record: BadgeTypeRecord = env
            .storage()
            .instance()
            .get(&DataKey::BadgeType(badge_type.clone()))
            .unwrap();
        badge_type_record.total_minted = badge_type_record
            .total_minted
            .checked_add(1)
            .expect("arithmetic overflow");
        env.storage()
            .instance()
            .set(&DataKey::BadgeType(badge_type.clone()), &badge_type_record);

        // Increment counter
        env.storage()
            .instance()
            .set(&DataKey::NextId, &(id + 1));

        env.events()
            .publish((MINT, symbol_short!("to"), recipient), (id, badge_type));

        id
    }

    // -------------------------------------------------------------------------
    // Reading
    // -------------------------------------------------------------------------

    pub fn get_badge(env: Env, id: u64) -> Option<BadgeRecord> {
        env.storage().persistent().get(&DataKey::Badge(id))
    }

    pub fn get_badges_by_owner(env: Env, owner: Address) -> Vec<BadgeRecord> {
        let owner_key = DataKey::OwnerBadges(owner.clone());
        let ids: Vec<u64> = match env.storage().persistent().get(&owner_key) {
            Some(i) => i,
            None => return Vec::new(&env),
        };

        let mut results = Vec::new(&env);
        for id in ids.iter() {
            if let Some(badge) = env.storage().persistent().get(&DataKey::Badge(id)) {
                results.push_back(badge);
            }
        }
        results
    }

    pub fn verify_badge(env: Env, owner: Address, badge_type: Symbol) -> bool {
        let badges = Self::get_badges_by_owner(env, owner);
        for badge in badges.iter() {
            if badge.badge_type == badge_type {
                return true;
            }
        }
        false
    }

    // -------------------------------------------------------------------------
    // Transfer (soulbound — panics)
    // -------------------------------------------------------------------------

    pub fn transfer(_env: Env, _from: Address, _to: Address, _id: u64) {
        panic!("soulbound");
    }

    // -------------------------------------------------------------------------
    // Burn (admin only)
    // -------------------------------------------------------------------------

    pub fn burn_badge(env: Env, admin: Address, id: u64) {
        access::require_admin(&env, &admin, &DataKey::Admin);

        let badge: BadgeRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Badge(id))
            .expect("Badge not found");

        // Remove from owner's list
        let owner_key = DataKey::OwnerBadges(badge.owner.clone());
        if let Some(mut ids) = env.storage().persistent().get::<DataKey, Vec<u64>>(&owner_key) {
            if let Some(pos) = ids.iter().position(|x| x == id) {
                ids.remove(pos as u32);
                env.storage().persistent().set(&owner_key, &ids);
            }
        }

        env.storage().persistent().remove(&DataKey::Badge(id));

        env.events().publish((BURN, symbol_short!("id")), (id, badge.owner));
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests_ext;

#[cfg(test)]
mod cross_contract_tests;

#[cfg(test)]
mod contract_tests;
