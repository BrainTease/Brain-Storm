//! Reputation scoring model: authorized callers, slashing, and score helpers.
#![allow(unused)]

use soroban_sdk::{contracttype, symbol_short, Address, Env, Symbol};

use crate::{DataKey, DecayConfig, ReputationRecord};

// ── Events ───────────────────────────────────────────────────────────────────
pub const EVT_SLASH: Symbol = symbol_short!("rep_slsh");
pub const EVT_AUTH_ADD: Symbol = symbol_short!("rep_auth");
pub const EVT_AUTH_RM: Symbol = symbol_short!("rep_aur");

// ── Score thresholds for levels ───────────────────────────────────────────────
pub const LEVEL_THRESHOLDS: [i128; 5] = [0, 100, 400, 900, 1600];

// ── Authorized-caller helpers ─────────────────────────────────────────────────

/// Returns true if `caller` is the stored admin or an authorized caller.
pub fn is_authorized(env: &Env, caller: &Address) -> bool {
    let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    if *caller == admin {
        return true;
    }
    env.storage()
        .instance()
        .get::<DataKey, bool>(&DataKey::AuthorizedCaller(caller.clone()))
        .unwrap_or(false)
}

/// Registers `caller` as an authorized score updater (admin-only).
pub fn add_authorized_caller(env: &Env, admin: &Address, caller: &Address) {
    admin.require_auth();
    assert_admin(env, admin);
    env.storage()
        .instance()
        .set(&DataKey::AuthorizedCaller(caller.clone()), &true);
    env.events()
        .publish((EVT_AUTH_ADD, symbol_short!("caller")), caller.clone());
}

/// Removes an authorized caller (admin-only).
pub fn remove_authorized_caller(env: &Env, admin: &Address, caller: &Address) {
    admin.require_auth();
    assert_admin(env, admin);
    env.storage()
        .instance()
        .remove(&DataKey::AuthorizedCaller(caller.clone()));
    env.events()
        .publish((EVT_AUTH_RM, symbol_short!("caller")), caller.clone());
}

// ── Slashing ──────────────────────────────────────────────────────────────────

/// Slash `amount` from a user's reputation.  Emits `EVT_SLASH`.
/// Requires caller to be admin or authorized.
pub fn slash(env: &Env, caller: &Address, user: &Address, amount: i128, reason: Symbol) {
    caller.require_auth();
    assert!(is_authorized(env, caller), "Unauthorized caller");

    let current = env.ledger().sequence();
    let mut rep: ReputationRecord = env
        .storage()
        .persistent()
        .get(&DataKey::Reputation(user.clone()))
        .unwrap_or(ReputationRecord {
            user: user.clone(),
            score: 0,
            level: 1,
            last_updated: current,
            total_updates: 0,
        });

    rep.score = rep.score.saturating_sub(amount).max(0);
    rep.level = calculate_level(rep.score);
    rep.last_updated = current;
    env.storage()
        .persistent()
        .set(&DataKey::Reputation(user.clone()), &rep);

    env.events().publish(
        (EVT_SLASH, symbol_short!("user")),
        (user.clone(), amount, reason),
    );
}

// ── Score helpers ─────────────────────────────────────────────────────────────

pub fn calculate_level(score: i128) -> u32 {
    for (i, &threshold) in LEVEL_THRESHOLDS.iter().enumerate().rev() {
        if score >= threshold {
            return (i as u32) + 1;
        }
    }
    1
}

// ── Decay ─────────────────────────────────────────────────────────────────────

pub fn apply_decay_internal(env: &Env, rep: &mut ReputationRecord, current_ledger: u32) {
    let config: DecayConfig = env
        .storage()
        .instance()
        .get(&DataKey::DecayConfig)
        .unwrap_or(DecayConfig {
            enabled: false,
            decay_rate: 0,
            decay_interval: 1000,
        });
    if !config.enabled {
        return;
    }
    let elapsed = current_ledger.saturating_sub(rep.last_updated);
    if elapsed >= config.decay_interval {
        let periods = elapsed / config.decay_interval;
        let decay = config.decay_rate.saturating_mul(periods as i128);
        rep.score = rep.score.saturating_add(decay).max(0);
        rep.last_updated = current_ledger;
    }
}

// ── Internal assertion ────────────────────────────────────────────────────────

fn assert_admin(env: &Env, caller: &Address) {
    let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    assert!(*caller == admin, "Only admin can perform this action");
}
