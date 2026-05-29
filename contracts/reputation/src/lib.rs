#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, Vec,
};

#[contracttype]
pub enum DataKey {
    Admin,
    Reputation(Address),
    ReputationHistory(Address, u32),
    ReputationHistoryCount(Address),
    DecayConfig,
    TotalReputation,
    Leaderboard,
}

#[contracttype]
#[derive(Clone)]
pub struct ReputationRecord {
    pub user: Address,
    pub score: i128,
    pub level: u32,
    pub last_updated: u32,
    pub total_updates: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct ReputationUpdate {
    pub timestamp: u64,
    pub score_change: i128,
    pub reason: Symbol,
    pub course_id: Option<u64>,
}

#[contracttype]
#[derive(Clone)]
pub struct DecayConfig {
    pub enabled: bool,
    pub decay_rate: i128,
    pub decay_interval: u32,
}

const REP_UPDATE: Symbol = symbol_short!("rep_upd");
const REP_DECAY: Symbol = symbol_short!("rep_dcy");
const REP_REWARD: Symbol = symbol_short!("rep_rwd");

#[contract]
pub struct ReputationContract;

#[contractimpl]
impl ReputationContract {
    pub fn initialize(env: Env, admin: Address) {
        assert!(!env.storage().instance().has(&DataKey::Admin), "Already initialized");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::DecayConfig, &DecayConfig {
            enabled: true,
            decay_rate: -1,
            decay_interval: 1000,
        });
        env.storage().instance().set(&DataKey::TotalReputation, &0_i128);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    pub fn update_reputation(
        env: Env,
        admin: Address,
        user: Address,
        score_change: i128,
        reason: Symbol,
        course_id: Option<u64>,
    ) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can update reputation");

        let current_ledger = env.ledger().sequence();
        let mut rep = env.storage().persistent()
            .get(&DataKey::Reputation(user.clone()))
            .unwrap_or(ReputationRecord {
                user: user.clone(),
                score: 0,
                level: 1,
                last_updated: current_ledger,
                total_updates: 0,
            });

        Self::apply_decay_internal(&env, &mut rep, current_ledger);

        rep.score = rep.score.checked_add(score_change).expect("overflow");
        rep.score = rep.score.max(0);
        rep.last_updated = current_ledger;
        rep.total_updates = rep.total_updates.checked_add(1).expect("overflow");
        rep.level = Self::calculate_level(rep.score);

        env.storage().persistent().set(&DataKey::Reputation(user.clone()), &rep);

        let count: u32 = env.storage().persistent()
            .get(&DataKey::ReputationHistoryCount(user.clone()))
            .unwrap_or(0);
        env.storage().persistent().set(
            &DataKey::ReputationHistory(user.clone(), count),
            &ReputationUpdate { timestamp: env.ledger().timestamp(), score_change, reason: reason.clone(), course_id },
        );
        env.storage().persistent().set(&DataKey::ReputationHistoryCount(user.clone()), &(count + 1));

        let mut total: i128 = env.storage().instance().get(&DataKey::TotalReputation).unwrap_or(0);
        total = total.checked_add(score_change).expect("overflow");
        env.storage().instance().set(&DataKey::TotalReputation, &total);

        Self::update_leaderboard(&env, user.clone());

        env.events().publish((REP_UPDATE, symbol_short!("user")), (user, score_change, reason));
    }

    pub fn get_reputation(env: Env, user: Address) -> i128 {
        match env.storage().persistent().get::<DataKey, ReputationRecord>(&DataKey::Reputation(user)) {
            Some(mut rep) => {
                Self::apply_decay_internal(&env, &mut rep, env.ledger().sequence());
                rep.score
            }
            None => 0,
        }
    }

    pub fn get_reputation_record(env: Env, user: Address) -> Option<ReputationRecord> {
        env.storage().persistent().get(&DataKey::Reputation(user))
    }

    pub fn get_reputation_level(env: Env, user: Address) -> u32 {
        Self::calculate_level(Self::get_reputation(env, user))
    }

    pub fn apply_decay(env: Env, admin: Address, user: Address) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can apply decay");

        let current_ledger = env.ledger().sequence();
        let mut rep: ReputationRecord = env.storage().persistent()
            .get(&DataKey::Reputation(user.clone()))
            .expect("User has no reputation record");

        let old_score = rep.score;
        Self::apply_decay_internal(&env, &mut rep, current_ledger);

        if old_score != rep.score {
            env.storage().persistent().set(&DataKey::Reputation(user.clone()), &rep);
            let decay_amount = rep.score - old_score;

            let count: u32 = env.storage().persistent()
                .get(&DataKey::ReputationHistoryCount(user.clone()))
                .unwrap_or(0);
            env.storage().persistent().set(
                &DataKey::ReputationHistory(user.clone(), count),
                &ReputationUpdate {
                    timestamp: env.ledger().timestamp(),
                    score_change: decay_amount,
                    reason: symbol_short!("decay"),
                    course_id: None,
                },
            );
            env.storage().persistent().set(&DataKey::ReputationHistoryCount(user.clone()), &(count + 1));

            let mut total: i128 = env.storage().instance().get(&DataKey::TotalReputation).unwrap_or(0);
            total = total.checked_add(decay_amount).expect("overflow");
            env.storage().instance().set(&DataKey::TotalReputation, &total);

            env.events().publish((REP_DECAY, symbol_short!("user")), (user, decay_amount));
        }
    }

    pub fn set_decay_config(env: Env, admin: Address, enabled: bool, decay_rate: i128, decay_interval: u32) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can set decay config");
        env.storage().instance().set(&DataKey::DecayConfig, &DecayConfig { enabled, decay_rate, decay_interval });
    }

    pub fn get_decay_config(env: Env) -> DecayConfig {
        env.storage().instance().get(&DataKey::DecayConfig).unwrap_or(DecayConfig {
            enabled: false,
            decay_rate: 0,
            decay_interval: 1000,
        })
    }

    pub fn claim_reputation_reward(env: Env, user: Address) {
        user.require_auth();
        let level = Self::calculate_level(Self::get_reputation(env.clone(), user.clone()));
        let reward_amount = (level as i128) * 10;
        env.events().publish((REP_REWARD, symbol_short!("user")), (user, reward_amount));
    }

    pub fn verify_reputation_threshold(env: Env, user: Address, min_score: i128) -> bool {
        Self::get_reputation(env, user) >= min_score
    }

    pub fn verify_reputation_level(env: Env, user: Address, min_level: u32) -> bool {
        Self::get_reputation_level(env, user) >= min_level
    }

    pub fn get_reputation_history(env: Env, user: Address, start_index: u32, limit: u32) -> Vec<ReputationUpdate> {
        let count: u32 = env.storage().persistent()
            .get(&DataKey::ReputationHistoryCount(user.clone()))
            .unwrap_or(0);
        let mut history = Vec::new(&env);
        let end = (start_index + limit).min(count);
        for i in start_index..end {
            if let Some(u) = env.storage().persistent().get(&DataKey::ReputationHistory(user.clone(), i)) {
                history.push_back(u);
            }
        }
        history
    }

    pub fn get_total_reputation(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalReputation).unwrap_or(0)
    }

    /// Returns up to `limit` users sorted by score descending.
    pub fn get_leaderboard(env: Env, limit: u32) -> Vec<ReputationRecord> {
        let users: Vec<Address> = env.storage().instance()
            .get(&DataKey::Leaderboard)
            .unwrap_or_else(|| Vec::new(&env));

        let mut records: Vec<ReputationRecord> = Vec::new(&env);
        for user in users.iter() {
            if let Some(rec) = env.storage().persistent().get(&DataKey::Reputation(user.clone())) {
                records.push_back(rec);
            }
        }

        // Insertion sort descending by score
        let len = records.len();
        for i in 1..len {
            let mut j = i;
            while j > 0 {
                let a = records.get(j - 1).unwrap().score;
                let b = records.get(j).unwrap().score;
                if a < b {
                    let tmp_a = records.get(j - 1).unwrap();
                    let tmp_b = records.get(j).unwrap();
                    records.set(j - 1, tmp_b);
                    records.set(j, tmp_a);
                    j -= 1;
                } else {
                    break;
                }
            }
        }

        let mut result: Vec<ReputationRecord> = Vec::new(&env);
        for i in 0..len.min(limit) {
            result.push_back(records.get(i).unwrap());
        }
        result
    }

    fn calculate_level(score: i128) -> u32 {
        if score < 100 { 1 }
        else if score < 400 { 2 }
        else if score < 900 { 3 }
        else if score < 1600 { 4 }
        else { 5 }
    }

    fn apply_decay_internal(env: &Env, rep: &mut ReputationRecord, current_ledger: u32) {
        let config: DecayConfig = env.storage().instance()
            .get(&DataKey::DecayConfig)
            .unwrap_or(DecayConfig { enabled: false, decay_rate: 0, decay_interval: 1000 });
        if !config.enabled { return; }
        let elapsed = current_ledger.saturating_sub(rep.last_updated);
        if elapsed >= config.decay_interval {
            let periods = elapsed / config.decay_interval;
            let decay = config.decay_rate * (periods as i128);
            rep.score = rep.score.saturating_add(decay).max(0);
            rep.last_updated = current_ledger;
        }
    }

    fn update_leaderboard(env: &Env, user: Address) {
        let mut users: Vec<Address> = env.storage().instance()
            .get(&DataKey::Leaderboard)
            .unwrap_or_else(|| Vec::new(env));
        if !users.iter().any(|u| u == user) {
            users.push_back(user);
            env.storage().instance().set(&DataKey::Leaderboard, &users);
        }
    }
}

#[cfg(test)]
mod tests;
