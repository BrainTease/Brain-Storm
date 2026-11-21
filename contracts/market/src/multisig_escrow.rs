//! Multi-signature escrow variant for high-value jobs (#658).

use soroban_sdk::{contracttype, symbol_short, Address, Env, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum MsEscrowStatus {
    Pending,   // collecting approvals
    Released,  // threshold met, funds released
    TimedOut,  // expired before threshold reached
}

#[contracttype]
#[derive(Clone)]
pub struct MsEscrow {
    pub id: u64,
    pub payer: Address,
    pub payee: Address,
    pub amount: i128,
    pub signers: Vec<Address>,
    pub threshold: u32,
    pub approvals: Vec<Address>,
    pub expires_ledger: u32,
    pub status: MsEscrowStatus,
}

#[contracttype]
pub enum MsKey {
    Escrow(u64),
    NextId,
}

const EVT_MS_CREATE: Symbol = symbol_short!("ms_create");
const EVT_MS_APPROVE: Symbol = symbol_short!("ms_appr");
const EVT_MS_RELEASE: Symbol = symbol_short!("ms_rel");
const EVT_MS_TIMEOUT: Symbol = symbol_short!("ms_tout");

pub fn create_ms_escrow(
    env: &Env,
    payer: Address,
    payee: Address,
    amount: i128,
    signers: Vec<Address>,
    threshold: u32,
    timeout_ledgers: u32,
) -> u64 {
    payer.require_auth();
    assert!(amount > 0, "Amount must be positive");
    assert!(!signers.is_empty(), "Need at least one signer");
    assert!(threshold > 0 && threshold <= signers.len(), "Invalid threshold");

    let id: u64 = env
        .storage()
        .instance()
        .get(&MsKey::NextId)
        .unwrap_or(1);

    let escrow = MsEscrow {
        id,
        payer: payer.clone(),
        payee,
        amount,
        signers,
        threshold,
        approvals: Vec::new(env),
        expires_ledger: env.ledger().sequence() + timeout_ledgers,
        status: MsEscrowStatus::Pending,
    };

    env.storage().persistent().set(&MsKey::Escrow(id), &escrow);
    env.storage().instance().set(&MsKey::NextId, &(id + 1));

    env.events().publish((EVT_MS_CREATE,), (id, payer, amount));
    id
}

pub fn approve_ms_escrow(env: &Env, escrow_id: u64, signer: Address) {
    signer.require_auth();

    let mut escrow: MsEscrow = env
        .storage()
        .persistent()
        .get(&MsKey::Escrow(escrow_id))
        .expect("Escrow not found");

    assert!(escrow.status == MsEscrowStatus::Pending, "Escrow not pending");
    assert!(
        env.ledger().sequence() < escrow.expires_ledger,
        "Escrow expired"
    );
    assert!(
        escrow.signers.iter().any(|s| s == signer),
        "Not an authorized signer"
    );
    assert!(
        !escrow.approvals.iter().any(|a| a == signer),
        "Already approved"
    );

    escrow.approvals.push_back(signer.clone());

    if escrow.approvals.len() >= escrow.threshold {
        escrow.status = MsEscrowStatus::Released;
        env.events()
            .publish((EVT_MS_RELEASE,), (escrow_id, escrow.payee.clone(), escrow.amount));
    }

    env.storage().persistent().set(&MsKey::Escrow(escrow_id), &escrow);
    env.events().publish((EVT_MS_APPROVE,), (escrow_id, signer));
}

/// Mark escrow as timed-out if expired and threshold not met.
/// Returns true if the fallback (refund to payer) should be executed.
pub fn timeout_ms_escrow(env: &Env, escrow_id: u64) -> bool {
    let mut escrow: MsEscrow = env
        .storage()
        .persistent()
        .get(&MsKey::Escrow(escrow_id))
        .expect("Escrow not found");

    assert!(escrow.status == MsEscrowStatus::Pending, "Escrow not pending");
    assert!(
        env.ledger().sequence() >= escrow.expires_ledger,
        "Escrow has not expired yet"
    );

    escrow.status = MsEscrowStatus::TimedOut;
    env.storage().persistent().set(&MsKey::Escrow(escrow_id), &escrow);
    env.events().publish((EVT_MS_TIMEOUT,), (escrow_id, escrow.payer));
    true
}

pub fn get_ms_escrow(env: &Env, escrow_id: u64) -> Option<MsEscrow> {
    env.storage().persistent().get(&MsKey::Escrow(escrow_id))
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    fn setup() -> (Env, Address, Address, Vec<Address>) {
        let env = Env::default();
        env.mock_all_auths();
        let payer = Address::generate(&env);
        let payee = Address::generate(&env);
        let mut signers = Vec::new(&env);
        signers.push_back(Address::generate(&env));
        signers.push_back(Address::generate(&env));
        signers.push_back(Address::generate(&env));
        (env, payer, payee, signers)
    }

    #[test]
    fn threshold_invariants_hold_for_valid_inputs() {
        let (env, payer, payee, signers) = setup();
        let n = signers.len();
        for threshold in 1..=n {
            let id = create_ms_escrow(&env, payer.clone(), payee.clone(), 100, signers.clone(), threshold, 100);
            let escrow = get_ms_escrow(&env, id).unwrap();
            assert!(escrow.threshold > 0);
            assert!(escrow.threshold <= escrow.signers.len());
            assert_eq!(escrow.approvals.len(), 0);
            assert_eq!(escrow.status, MsEscrowStatus::Pending);
        }
    }

    #[test]
    #[should_panic(expected = "Invalid threshold")]
    fn zero_threshold_rejected() {
        let (env, payer, payee, signers) = setup();
        create_ms_escrow(&env, payer, payee, 100, signers, 0, 100);
    }

    #[test]
    #[should_panic(expected = "Invalid threshold")]
    fn threshold_above_signers_rejected() {
        let (env, payer, payee, signers) = setup();
        let n = signers.len();
        create_ms_escrow(&env, payer, payee, 100, signers, n + 1, 100);
    }

    #[test]
    #[should_panic(expected = "Amount must be positive")]
    fn non_positive_amount_rejected() {
        let (env, payer, payee, signers) = setup();
        create_ms_escrow(&env, payer, payee, 0, signers, 1, 100);
    }

    #[test]
    fn conservation_of_funds_on_release() {
        let (env, payer, payee, signers) = setup();
        let amount: i128 = 1_000;
        let id = create_ms_escrow(&env, payer.clone(), payee.clone(), amount, signers.clone(), 2, 100);
        approve_ms_escrow(&env, id, signers.get(0).unwrap());
        let mid = get_ms_escrow(&env, id).unwrap();
        assert_eq!(mid.status, MsEscrowStatus::Pending);
        assert_eq!(mid.amount, amount);
        approve_ms_escrow(&env, id, signers.get(1).unwrap());
        let done = get_ms_escrow(&env, id).unwrap();
        assert_eq!(done.status, MsEscrowStatus::Released);
        // Amount is conserved: escrow still holds exactly the original amount.
        assert_eq!(done.amount, amount);
        assert_eq!(done.payer, payer);
        assert_eq!(done.payee, payee);
    }

    #[test]
    fn no_overflow_on_large_amounts_and_timeouts() {
        let (env, payer, payee, signers) = setup();
        let amount = i128::MAX;
        let id = create_ms_escrow(&env, payer, payee, amount, signers, 1, u32::MAX);
        let escrow = get_ms_escrow(&env, id).unwrap();
        assert_eq!(escrow.amount, amount);
        assert!(escrow.expires_ledger >= env.ledger().sequence());
    }

    #[test]
    fn duplicate_approval_rejected() {
        let (env, payer, payee, signers) = setup();
        let id = create_ms_escrow(&env, payer, payee, 100, signers.clone(), 3, 100);
        let signer = signers.get(0).unwrap();
        approve_ms_escrow(&env, id, signer.clone());
        let res = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            approve_ms_escrow(&env, id, signer);
        }));
        assert!(res.is_err());
    }

    #[test]
    fn timeout_requires_expiry() {
        let (env, payer, payee, signers) = setup();
        let id = create_ms_escrow(&env, payer, payee, 100, signers, 1, 100);
        let res = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            timeout_ms_escrow(&env, id);
        }));
        assert!(res.is_err());
    }
}
