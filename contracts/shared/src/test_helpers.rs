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
}
