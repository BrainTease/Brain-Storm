//! Shared test setup for contract test suites (#102).
//!
//! Every contract test used to repeat the same three lines:
//!
//! ```ignore
//! let env = Env::default();
//! env.mock_all_auths();
//! let admin = Address::generate(&env);
//! ```
//!
//! [`TestContext`] bundles that setup so tests only declare the accounts and
//! contracts they actually care about. This module is only compiled for tests
//! or when the `testutils` feature is enabled, so it never ships in wasm.

use soroban_sdk::{testutils::Address as _, Address, Env};

#[cfg(feature = "proptest")]
use proptest::prelude::*;

/// Creates a Soroban test environment with all authorization checks mocked.
pub fn setup_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env
}

/// Generates a fresh address in `env`.
pub fn generate_address(env: &Env) -> Address {
    Address::generate(env)
}

/// Standard test environment plus a pre-generated admin account.
///
/// ```ignore
/// let ctx = TestContext::new();
/// let id = ctx.env.register_contract(None, MyContract);
/// let client = MyContractClient::new(&ctx.env, &id);
/// client.initialize(&ctx.admin);
/// ```
pub struct TestContext {
    pub env: Env,
    pub admin: Address,
}

impl TestContext {
    pub fn new() -> Self {
        let env = setup_env();
        let admin = generate_address(&env);
        Self { env, admin }
    }

    /// Creates an additional funded account. Soroban test accounts do not carry
    /// balances; the method exists so tests read as account creation rather
    /// than raw address generation.
    pub fn account(&self) -> Address {
        generate_address(&self.env)
    }
}

impl Default for TestContext {
    fn default() -> Self {
        Self::new()
    }
}

/// Reusable property-test strategies and invariant helpers (#75).
///
/// Token and escrow property tests need the same generators (amounts that fit
/// in an `i128` balance, non-zero amounts, bounded fee rates) and the same
/// conservation checks. Keeping them here means a fix to a generator or an
/// invariant applies to every suite at once.
#[cfg(feature = "proptest")]
pub mod prop {
    use super::*;

    /// Largest amount the strategies will generate. Kept well below
    /// `i128::MAX` so that summing a handful of generated amounts in a
    /// conservation check cannot overflow.
    pub const MAX_AMOUNT: i128 = 1_000_000_000_000_000_000; // 1e18

    /// Any non-negative amount in `0..=MAX_AMOUNT`.
    pub fn amount() -> impl Strategy<Value = i128> {
        0i128..=MAX_AMOUNT
    }

    /// A strictly positive amount in `1..=MAX_AMOUNT`, for operations that
    /// reject zero (deposits, transfers, escrow funding).
    pub fn positive_amount() -> impl Strategy<Value = i128> {
        1i128..=MAX_AMOUNT
    }

    /// A fee rate in basis points, `0..=10_000` (0% to 100%).
    pub fn fee_bps() -> impl Strategy<Value = u32> {
        0u32..=10_000
    }

    /// A vector of amounts whose sum is guaranteed not to overflow `i128`.
    pub fn amount_vec(max_len: usize) -> impl Strategy<Value = soroban_sdk::Vec<i128>> {
        proptest::collection::vec(amount(), 0..=max_len)
    }

    /// Asserts that a token balance change is fully accounted for: the sum of
    /// all debits equals the sum of all credits, i.e. no value was created or
    /// destroyed by the operation under test.
    ///
    /// `deltas` holds `(before, after)` pairs for every account touched.
    pub fn assert_conservation(deltas: &[(i128, i128)]) {
        let mut net: i128 = 0;
        for (before, after) in deltas {
            net = net
                .checked_add(*after)
                .and_then(|n| n.checked_sub(*before))
                .expect("balance delta overflowed i128");
        }
        assert_eq!(net, 0, "value was created or destroyed: net delta {net}");
    }

    /// Asserts that no account balance went negative.
    pub fn assert_non_negative(balances: &[i128]) {
        for balance in balances {
            assert!(*balance >= 0, "negative balance: {balance}");
        }
    }

    /// Asserts that the total supply is unchanged by a transfer-like
    /// operation, given the supply before and after.
    pub fn assert_supply_unchanged(before: i128, after: i128) {
        assert_eq!(before, after, "total supply changed by {}", after - before);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_context_generates_distinct_accounts() {
        let ctx = TestContext::new();
        let a = ctx.account();
        let b = ctx.account();
        assert_ne!(a, b);
    }

    #[cfg(feature = "proptest")]
    mod prop_tests {
        use super::super::prop::*;

        #[test]
        fn conservation_holds_for_balanced_transfer() {
            // A moves 100 to B: A loses 100, B gains 100.
            assert_conservation(&[(1_000, 900), (0, 100)]);
        }

        #[test]
        #[should_panic(expected = "value was created or destroyed")]
        fn conservation_detects_created_value() {
            assert_conservation(&[(1_000, 900), (0, 200)]);
        }

        #[test]
        fn non_negative_accepts_zero_and_positive() {
            assert_non_negative(&[0, 1, i128::MAX]);
        }

        #[test]
        #[should_panic(expected = "negative balance")]
        fn non_negative_rejects_negative() {
            assert_non_negative(&[0, -1]);
        }

        #[test]
        fn supply_unchanged_passes_for_equal_values() {
            assert_supply_unchanged(42, 42);
        }

        #[test]
        #[should_panic(expected = "total supply changed")]
        fn supply_unchanged_detects_mint() {
            assert_supply_unchanged(42, 43);
        }
    }
}
