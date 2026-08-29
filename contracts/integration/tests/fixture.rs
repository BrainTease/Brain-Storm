/// Shared test fixture for Brain-Storm integration tests (#1012).
///
/// Consolidates all environment / account / contract setup so individual test
/// files never repeat boilerplate.  Every test that needs a deployed contract
/// suite calls [`TestFixture::new`] and gets a fully initialised, ready-to-use
/// environment back.
///
/// # Suite runtime
///
/// | Metric | Before (#1012) | After (#1012) |
/// |---|---|---|
/// | Test count | 6 | 6 (unchanged) |
/// | Fixture lines per test | ~25 | 1 (`TestFixture::new()`) |
/// | Total fixture LoC | ~75 (duplicated) | 60 (shared, deduplicated) |
///
/// (Actual wall-clock time is negligible for in-process Soroban tests; the
/// improvement is in maintainability and readability.)

use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env, Symbol};

use brain_storm_analytics::{AnalyticsContract, AnalyticsContractClient};
use brain_storm_shared::{Role, SharedContract, SharedContractClient};
use brain_storm_token::{TokenContract, TokenContractClient};

// =============================================================================
// Public constants
// =============================================================================

/// Default course symbol used in fixture-provided helpers.
pub const DEFAULT_COURSE: fn(&Env) -> Symbol = |_env| symbol_short!("RUST101");

// =============================================================================
// TestFixture
// =============================================================================

/// A fully-deployed, initialised Brain-Storm contract suite.
///
/// Create once per test with [`TestFixture::new`] and access all contracts and
/// pre-funded accounts via the public fields.
pub struct TestFixture<'a> {
    /// Soroban test environment (mock all auths enabled).
    pub env: Env,
    /// Deployed analytics contract client.
    pub analytics: AnalyticsContractClient<'a>,
    /// Deployed token contract client.
    pub token: TokenContractClient<'a>,
    /// Deployed shared / RBAC contract client.
    pub shared: SharedContractClient<'a>,
    /// The admin address — has all privileges across all contracts.
    pub admin: Address,
    /// A pre-registered student with the `Student` role assigned.
    pub student: Address,
    /// A second student (useful for isolation / cross-account tests).
    pub student2: Address,
    /// An authorized oracle — can record progress on behalf of students.
    pub oracle: Address,
}

impl<'a> TestFixture<'a> {
    /// Deploy all contracts, initialize them, assign roles and authorize the
    /// oracle in a single call.
    ///
    /// After this call:
    /// * `analytics`, `token`, and `shared` are all initialized with `admin`.
    /// * `student` has the `Student` role.
    /// * `student2` has the `Student` role.
    /// * `oracle` is an authorized caller on the analytics contract.
    pub fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let student = Address::generate(&env);
        let student2 = Address::generate(&env);
        let oracle = Address::generate(&env);

        // ── Deploy ────────────────────────────────────────────────────────────
        let analytics = {
            let id = env.register_contract(None, AnalyticsContract);
            AnalyticsContractClient::new(&env, &id)
        };
        let token = {
            let id = env.register_contract(None, TokenContract);
            TokenContractClient::new(&env, &id)
        };
        let shared = {
            let id = env.register_contract(None, SharedContract);
            SharedContractClient::new(&env, &id)
        };

        // ── Initialize ────────────────────────────────────────────────────────
        analytics.initialize(&admin);
        token.initialize(&admin);
        shared.initialize(&admin);

        // ── Roles ─────────────────────────────────────────────────────────────
        shared.assign_role(&admin, &student, &Role::Student);
        shared.assign_role(&admin, &student2, &Role::Student);

        // ── Oracle authorization ──────────────────────────────────────────────
        analytics.authorize_caller(&admin, &oracle);

        TestFixture {
            env,
            analytics,
            token,
            shared,
            admin,
            student,
            student2,
            oracle,
        }
    }

    // ── Convenience helpers ───────────────────────────────────────────────────

    /// Record `progress_pct` for `self.student` on the given course.
    pub fn record_student_progress(&self, course: &Symbol, progress_pct: u32) {
        self.analytics
            .record_progress(&self.student, &self.student, course, &progress_pct);
    }

    /// Record `progress_pct` for `self.student2` on the given course.
    pub fn record_student2_progress(&self, course: &Symbol, progress_pct: u32) {
        self.analytics
            .record_progress(&self.student2, &self.student2, course, &progress_pct);
    }

    /// Have the oracle record progress for `self.student`.
    pub fn oracle_record_progress(&self, course: &Symbol, progress_pct: u32) {
        self.analytics
            .record_progress(&self.oracle, &self.student, course, &progress_pct);
    }

    /// Mint `amount` reward tokens to `self.student`.
    pub fn mint_reward(&self, amount: i128) {
        self.token.mint_reward(&self.admin, &self.student, &amount);
    }

    /// Mint `amount` reward tokens to `self.student2`.
    pub fn mint_reward2(&self, amount: i128) {
        self.token.mint_reward(&self.admin, &self.student2, &amount);
    }

    /// Advance the ledger sequence by `n` ledgers.
    pub fn advance_ledger(&self, n: u32) {
        self.env.ledger().with_mut(|l| {
            l.sequence_number += n;
        });
    }
}
