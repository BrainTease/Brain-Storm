//! Deterministic test helpers for contract integration tests (#1531).
//!
//! Soroban's `Env::default()` starts from a clean ledger, but tests that depend
//! on a timestamp or on pseudo-random data still drift when they read
//! `env.ledger().timestamp()` or generate values from an unspecified source.
//! `DeterministicEnv` pins the ledger time/sequence and exposes a small seeded
//! PRNG so two runs (and two tests) produce identical values.
//!
//! Run with:
//!
//! ```bash
//! cargo test -p brain-storm-integration --test determinism
//! ```

use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{Address, Env};

/// 2024-01-01T00:00:00Z.
pub const FIXED_TIMESTAMP: u64 = 1_704_067_200;
/// First ledger of the deterministic environment.
pub const FIXED_SEQUENCE: u32 = 1;
/// Default seed for [`Lcg`].
pub const DEFAULT_SEED: u64 = 0x5eed_1234;

/// A tiny linear congruential generator (Numerical Recipes constants).
///
/// Deliberately small and dependency-free: tests only need a repeatable
/// sequence, not cryptographic quality.
#[derive(Clone, Debug)]
pub struct Lcg {
    state: u64,
}

impl Lcg {
    pub fn new(seed: u64) -> Self {
        Self {
            state: seed.wrapping_mul(6_364_136_223_846_793_005).wrapping_add(1),
        }
    }

    /// Next value, using the upper 32 bits (the low bits of an LCG have short
    /// periods).
    pub fn next_u32(&mut self) -> u32 {
        self.state = self
            .state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        (self.state >> 32) as u32
    }

    /// Integer in `[min, max]` (inclusive). Panics when `max < min`.
    pub fn next_in_range(&mut self, min: u32, max: u32) -> u32 {
        assert!(min <= max, "next_in_range requires min <= max");
        let span = u64::from(max - min) + 1;
        min + (u64::from(self.next_u32()) % span) as u32
    }
}

/// An [`Env`] with fixed ledger time/sequence and a seeded PRNG.
pub struct DeterministicEnv {
    pub env: Env,
    pub rng: Lcg,
    pub admin: Address,
    pub student: Address,
}

impl DeterministicEnv {
    /// Create a fresh environment. Each call is independent: timestamps,
    /// sequence numbers, addresses generated through the deterministic
    /// generator and PRNG values all restart from the same seed.
    pub fn new(seed: u64) -> Self {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|ledger| {
            ledger.timestamp = FIXED_TIMESTAMP;
            ledger.sequence_number = FIXED_SEQUENCE;
        });

        // Soroban's test generator is per-`Env` and starts from a fixed
        // sequence, so two fresh environments produce the same addresses.
        let admin = Address::generate(&env);
        let student = Address::generate(&env);

        Self {
            env,
            rng: Lcg::new(seed),
            admin,
            student,
        }
    }

    /// Advance the ledger by `seconds` without touching wall-clock time.
    pub fn advance_time(&self, seconds: u64) {
        self.env.ledger().with_mut(|ledger| {
            ledger.timestamp += seconds;
            ledger.sequence_number += 1;
        });
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ledger_time_is_fixed_and_advances_explicitly() {
        let fixture = DeterministicEnv::new(DEFAULT_SEED);
        assert_eq!(fixture.env.ledger().timestamp(), FIXED_TIMESTAMP);
        assert_eq!(fixture.env.ledger().sequence(), FIXED_SEQUENCE);

        fixture.advance_time(60);
        assert_eq!(fixture.env.ledger().timestamp(), FIXED_TIMESTAMP + 60);
        assert_eq!(fixture.env.ledger().sequence(), FIXED_SEQUENCE + 1);
    }

    #[test]
    fn prng_is_reproducible_per_seed() {
        let mut first = Lcg::new(DEFAULT_SEED);
        let mut second = Lcg::new(DEFAULT_SEED);

        let first_values: Vec<u32> = (0..8).map(|_| first.next_u32()).collect();
        let second_values: Vec<u32> = (0..8).map(|_| second.next_u32()).collect();

        assert_eq!(first_values, second_values);
        assert!(first_values.windows(2).any(|pair| pair[0] != pair[1]));
    }

    #[test]
    fn ranges_stay_inclusive_and_deterministic() {
        let mut first = Lcg::new(7);
        let mut second = Lcg::new(7);

        for _ in 0..100 {
            let a = first.next_in_range(3, 9);
            let b = second.next_in_range(3, 9);
            assert_eq!(a, b);
            assert!((3..=9).contains(&a));
        }
    }

    #[test]
    fn environments_do_not_leak_state() {
        let first = DeterministicEnv::new(DEFAULT_SEED);
        first.advance_time(120);

        let second = DeterministicEnv::new(DEFAULT_SEED);
        assert_eq!(second.env.ledger().timestamp(), FIXED_TIMESTAMP);
        assert_eq!(second.env.ledger().sequence(), FIXED_SEQUENCE);
    }
}
