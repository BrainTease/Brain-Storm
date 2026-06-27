use soroban_sdk::{contracttype, Env, symbol_short};

#[contracttype]
pub enum ReentrancyKey {
    Locked,
}

pub fn acquire_lock(env: &Env) {
    let locked: bool = env
        .storage()
        .instance()
        .get(&ReentrancyKey::Locked)
        .unwrap_or(false);
    assert!(!locked, "Reentrant call detected");
    env.storage()
        .instance()
        .set(&ReentrancyKey::Locked, &true);
}

pub fn release_lock(env: &Env) {
    env.storage()
        .instance()
        .set(&ReentrancyKey::Locked, &false);
    env.events().publish(
        (symbol_short!("guard"), symbol_short!("unlock")),
        env.ledger().timestamp(),
    );
}

pub fn is_locked(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&ReentrancyKey::Locked)
        .unwrap_or(false)
}
