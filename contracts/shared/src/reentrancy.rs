use soroban_sdk::{contracttype, symbol_short, Env};

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

/// RAII-style reentrancy guard.
///
/// Acquires the shared reentrancy lock on construction and releases it when
/// dropped. Because Soroban contracts panic on failure (there is no `catch`
/// across contract calls), a panic will unwind the frame and run the `Drop`
/// implementation, ensuring the lock is released on every exit path.
///
/// Usage:
/// ```ignore
/// let _guard = ReentrancyGuard::new(&env);
/// // ... critical section ...
/// // lock released automatically at end of scope
/// ```
pub struct ReentrancyGuard<'a> {
    env: &'a Env,
    active: bool,
}

impl<'a> ReentrancyGuard<'a> {
    /// Acquire the reentrancy lock. Panics with "Reentrant call detected"
    /// if the lock is already held.
    pub fn new(env: &'a Env) -> Self {
        acquire_lock(env);
        Self { env, active: true }
    }

    /// Returns whether this guard currently holds the lock.
    pub fn is_active(&self) -> bool {
        self.active
    }

    /// Manually release the lock before the guard is dropped.
    /// Subsequent drops become no-ops.
    pub fn release(mut self) {
        if self.active {
            release_lock(self.env);
            self.active = false;
        }
    }
}

impl<'a> Drop for ReentrancyGuard<'a> {
    fn drop(&mut self) {
        if self.active {
            release_lock(self.env);
            self.active = false;
        }
    }
}

/// Execute `f` while holding the reentrancy lock.
///
/// The lock is acquired before invoking `f` and released afterwards,
/// including on panic (via the `ReentrancyGuard` drop). Nested calls to
/// `with_guard` will panic with "Reentrant call detected".
pub fn with_guard<F, R>(env: &Env, f: F) -> R
where
    F: FnOnce() -> R,
{
    let _guard = ReentrancyGuard::new(env);
    f()
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_acquire_and_release_lock() {
        let env = Env::default();
        assert!(!is_locked(&env));
        acquire_lock(&env);
        assert!(is_locked(&env));
        release_lock(&env);
        assert!(!is_locked(&env));
    }

    #[test]
    fn test_nested_acquire_rejected() {
        let env = Env::default();
        acquire_lock(&env);
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            acquire_lock(&env);
        }));
        assert!(result.is_err(), "nested acquire should panic");
        // Lock remains held after the rejected nested acquire.
        assert!(is_locked(&env));
        release_lock(&env);
        assert!(!is_locked(&env));
    }

    #[test]
    fn test_guard_releases_on_success() {
        let env = Env::default();
        {
            let _guard = ReentrancyGuard::new(&env);
            assert!(is_locked(&env));
        }
        assert!(!is_locked(&env));
    }

    #[test]
    fn test_guard_releases_on_panic() {
        let env = Env::default();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let _guard = ReentrancyGuard::new(&env);
            assert!(is_locked(&env));
            panic!("boom");
        }));
        assert!(result.is_err());
        assert!(!is_locked(&env), "lock must be released after panic");
    }

    #[test]
    fn test_guard_nested_rejected() {
        let env = Env::default();
        let _outer = ReentrancyGuard::new(&env);
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let _inner = ReentrancyGuard::new(&env);
        }));
        assert!(result.is_err(), "nested guard should panic");
        assert!(is_locked(&env));
    }

    #[test]
    fn test_guard_manual_release() {
        let env = Env::default();
        let guard = ReentrancyGuard::new(&env);
        assert!(is_locked(&env));
        guard.release();
        assert!(!is_locked(&env));
    }

    #[test]
    fn test_with_guard_success() {
        let env = Env::default();
        let value = with_guard(&env, || {
            assert!(is_locked(&env));
            42u32
        });
        assert_eq!(value, 42);
        assert!(!is_locked(&env));
    }

    #[test]
    fn test_with_guard_panic_releases() {
        let env = Env::default();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            with_guard(&env, || {
                assert!(is_locked(&env));
                panic!("boom");
            });
        }));
        assert!(result.is_err());
        assert!(!is_locked(&env));
    }

    #[test]
    fn test_with_guard_nested_rejected() {
        let env = Env::default();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            with_guard(&env, || {
                with_guard(&env, || {});
            });
        }));
        assert!(result.is_err(), "nested with_guard should panic");
        assert!(!is_locked(&env));
    }
}