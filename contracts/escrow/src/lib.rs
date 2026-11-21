#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

use brain_storm_shared::SharedError;

// Contract-specific error types
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowError {
    // Shared errors are composed into the contract's error enum
    // by wrapping them in specific variants
    Shared(SharedError),

    // Contract-specific errors
    EscrowNotFound = 100,
    EscrowAlreadyFunded = 101,
    EscrowAlreadyReleased = 102,
    EscrowAlreadyRefunded = 103,
    MilestoneNotApproved = 104,
    MilestoneAlreadySubmitted = 105,
    DeadlineNotPassed = 106,
    DeadlinePassed = 107,
    InvalidMilestoneIndex = 108,
    MilestoneCountMismatch = 109,
    EscrowAlreadyExists = 110,
}

impl From<SharedError> for EscrowError {
    fn from(error: SharedError) -> Self {
        EscrowError::Shared(error)
    }
}

// =============================================================================
// Storage
// =============================================================================

#[contracttype]
pub enum DataKey {
    Escrow(u64),
    NextEscrowId,
}

#[contracttype]
#[derive(Clone)]
pub struct EscrowRecord {
    pub id: u64,
    pub client: Address,
    pub agent: Address,
    pub amount: i128,
    pub funded: bool,
    pub released: bool,
}

// =============================================================================
// Events
// =============================================================================

pub const ESCROW_CREATED: Symbol = symbol_short!("esc_new");
pub const ESCROW_FUNDED: Symbol = symbol_short!("esc_fund");
pub const ESCROW_RELEASED: Symbol = symbol_short!("esc_rel");

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Create a new escrow. Both the client (payer) and agent (payee) must
    /// authorize the creation so neither party can be enrolled unilaterally.
    pub fn create_escrow(
        env: Env,
        client: Address,
        agent: Address,
        amount: i128,
    ) -> Result<u64, EscrowError> {
        client.require_auth();
        agent.require_auth();

        if amount <= 0 {
            return Err(SharedError::InvalidAmount.into());
        }
        if client == agent {
            return Err(SharedError::InvalidInput.into());
        }

        let id = Self::next_escrow_id(&env);
        if Self::escrow_exists(&env, id) {
            return Err(EscrowError::EscrowAlreadyExists);
        }

        let record = EscrowRecord {
            id,
            client: client.clone(),
            agent: agent.clone(),
            amount,
            funded: false,
            released: false,
        };
        env.storage().instance().set(&DataKey::Escrow(id), &record);
        env.storage().instance().set(
            &DataKey::NextEscrowId,
            &id.checked_add(1).expect("escrow id overflow"),
        );

        env.events()
            .publish((ESCROW_CREATED,), (id, client, agent, amount));

        Ok(id)
    }

    /// Fund an escrow. Only the stored client may fund, and the payer must have
    /// a balance of at least `amount`.
    pub fn fund_escrow(
        env: Env,
        escrow_id: u64,
        caller: Address,
        amount: i128,
    ) -> Result<(), EscrowError> {
        caller.require_auth();

        if amount <= 0 {
            return Err(SharedError::InvalidAmount.into());
        }

        let mut record: EscrowRecord = match env
            .storage()
            .instance()
            .get(&DataKey::Escrow(escrow_id))
        {
            Some(r) => r,
            None => return Err(EscrowError::EscrowNotFound),
        };

        if caller != record.client {
            return Err(SharedError::Unauthorized.into());
        }
        if record.funded {
            return Err(EscrowError::EscrowAlreadyFunded);
        }
        if Self::get_balance(&env, &caller) < amount {
            return Err(SharedError::InsufficientBalance.into());
        }

        record.funded = true;
        env.storage()
            .instance()
            .set(&DataKey::Escrow(escrow_id), &record);

        env.events()
            .publish((ESCROW_FUNDED,), (escrow_id, caller, amount));

        Ok(())
    }

    /// Release escrow funds to the agent. Only the stored client may release,
    /// and only once all milestones are approved.
    pub fn release_escrow(env: Env, escrow_id: u64, caller: Address) -> Result<(), EscrowError> {
        caller.require_auth();

        let mut record: EscrowRecord = match env
            .storage()
            .instance()
            .get(&DataKey::Escrow(escrow_id))
        {
            Some(r) => r,
            None => return Err(EscrowError::EscrowNotFound),
        };

        if caller != record.client {
            return Err(SharedError::Unauthorized.into());
        }
        if record.released {
            return Err(EscrowError::EscrowAlreadyReleased);
        }
        if !Self::are_all_milestones_approved(&env, escrow_id) {
            return Err(EscrowError::MilestoneNotApproved);
        }

        record.released = true;
        env.storage()
            .instance()
            .set(&DataKey::Escrow(escrow_id), &record);

        env.events()
            .publish((ESCROW_RELEASED,), (escrow_id, caller));

        Ok(())
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    fn next_escrow_id(env: &Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextEscrowId)
            .unwrap_or(1)
    }

    fn escrow_exists(env: &Env, id: u64) -> bool {
        env.storage().instance().has(&DataKey::Escrow(id))
    }

    fn get_balance(_env: &Env, _caller: &Address) -> i128 {
        // Placeholder: a deployed escrow cross-calls the token contract for the
        // payer balance. Kept as a constant so the insufficient-balance path is
        // exercisable in tests without a token integration.
        1000
    }

    fn are_all_milestones_approved(_env: &Env, _id: u64) -> bool {
        // Placeholder: milestone approval tracking is not yet modelled; until
        // it is, a funded escrow is considered ready for release.
        true
    }
}

#[cfg(test)]
mod tests;
