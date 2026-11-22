use soroban_sdk::{contracttype, symbol_short, Address, Env, Symbol};

/// Canonical topic symbols used by every contract in the workspace.
///
/// These are kept as `symbol_short!` constants so the encoded topic values
/// remain identical to the ones already deployed on-chain.
pub mod topics {
    use soroban_sdk::{symbol_short, Symbol};

    /// Domain topic for token related events.
    pub const TOKEN: Symbol = symbol_short!("token");
    /// Domain topic for marketplace related events.
    pub const MARKET: Symbol = symbol_short!("market");
    /// Domain topic for governance related events.
    pub const GOV: Symbol = symbol_short!("gov");

    /// Action topic emitted when tokens are minted.
    pub const MINT: Symbol = symbol_short!("mint");
    /// Action topic emitted when tokens are burned.
    pub const BURN: Symbol = symbol_short!("burn");
    /// Action topic emitted when tokens are transferred.
    pub const TRANSFER: Symbol = symbol_short!("transfer");
    /// Action topic emitted when a listing is created.
    pub const LISTED: Symbol = symbol_short!("listed");
    /// Action topic emitted when a listing is cancelled.
    pub const CANCELLED: Symbol = symbol_short!("cancelled");
    /// Action topic emitted when a listing is purchased.
    pub const SOLD: Symbol = symbol_short!("sold");
    /// Action topic emitted when a proposal is created.
    pub const PROPOSED: Symbol = symbol_short!("proposed");
    /// Action topic emitted when a proposal is executed.
    pub const EXECUTED: Symbol = symbol_short!("executed");
}

/// Canonical payload for token movement events (`mint`, `burn`, `transfer`).
///
/// Layout: `(actor, amount, balance_after)`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenEvent {
    pub actor: Address,
    pub amount: u64,
    pub balance_after: i128,
}

/// Canonical payload for marketplace events (`listed`, `cancelled`, `sold`).
///
/// Layout: `(actor, listing_id, price)`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MarketEvent {
    pub actor: Address,
    pub listing_id: u64,
    pub price: i128,
}

/// Canonical payload for governance events (`proposed`, `executed`).
///
/// Layout: `(actor, proposal_id, value)`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GovernanceEvent {
    pub actor: Address,
    pub proposal_id: u64,
    pub value: i128,
}

/// Low level emitter. Prefer the typed `emit_*` helpers below.
pub fn emit_contract_event<T>(env: &Env, domain: Symbol, action: Symbol, payload: T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
{
    env.events().publish((domain, action), payload);
}

/// Emit a token event with the canonical `(actor, amount, balance_after)` payload.
pub fn emit_token_event(env: &Env, action: Symbol, event: TokenEvent) {
    emit_contract_event(
        env,
        topics::TOKEN,
        action,
        (event.actor, event.amount, event.balance_after),
    );
}

/// Emit a marketplace event with the canonical `(actor, listing_id, price)` payload.
pub fn emit_market_event(env: &Env, action: Symbol, event: MarketEvent) {
    emit_contract_event(
        env,
        topics::MARKET,
        action,
        (event.actor, event.listing_id, event.price),
    );
}

/// Emit a governance event with the canonical `(actor, proposal_id, value)` payload.
pub fn emit_governance_event(env: &Env, action: Symbol, event: GovernanceEvent) {
    emit_contract_event(
        env,
        topics::GOV,
        action,
        (event.actor, event.proposal_id, event.value),
    );
}

/// Emit a `token/mint` event.
pub fn emit_mint(env: &Env, event: TokenEvent) {
    emit_token_event(env, topics::MINT, event);
}

/// Emit a `token/burn` event.
pub fn emit_burn(env: &Env, event: TokenEvent) {
    emit_token_event(env, topics::BURN, event);
}

/// Emit a `token/transfer` event.
pub fn emit_transfer(env: &Env, event: TokenEvent) {
    emit_token_event(env, topics::TRANSFER, event);
}

/// Emit a `market/listed` event.
pub fn emit_listed(env: &Env, event: MarketEvent) {
    emit_market_event(env, topics::LISTED, event);
}

/// Emit a `market/cancelled` event.
pub fn emit_cancelled(env: &Env, event: MarketEvent) {
    emit_market_event(env, topics::CANCELLED, event);
}

/// Emit a `market/sold` event.
pub fn emit_sold(env: &Env, event: MarketEvent) {
    emit_market_event(env, topics::SOLD, event);
}

/// Emit a `gov/proposed` event.
pub fn emit_proposed(env: &Env, event: GovernanceEvent) {
    emit_governance_event(env, topics::PROPOSED, event);
}

/// Emit a `gov/executed` event.
pub fn emit_executed(env: &Env, event: GovernanceEvent) {
    emit_governance_event(env, topics::EXECUTED, event);
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        symbol_short,
        testutils::{Address as _, Events},
        Address, Env, FromVal,
    };

    #[test]
    fn emits_standard_two_topic_payload() {
        let env = Env::default();
        let actor = Address::generate(&env);
        let contract_id = env.register_contract(None, crate::SharedContract);

        env.as_contract(&contract_id, || {
            emit_contract_event(
                &env,
                symbol_short!("token"),
                symbol_short!("mint"),
                (actor.clone(), 7_u64, 42_i128),
            );
        });

        let events = env.events().all();
        assert_eq!(events.len(), 1);
        let topics = events.get(0).unwrap().1;
        assert_eq!(topics.len(), 2);
        let topic0 = soroban_sdk::Symbol::from_val(&env, &topics.get(0).unwrap());
        let topic1 = soroban_sdk::Symbol::from_val(&env, &topics.get(1).unwrap());
        assert_eq!(topic0, symbol_short!("token"));
        assert_eq!(topic1, symbol_short!("mint"));
    }
}

#[cfg(test)]
mod shared_shape_tests {
    use super::*;
    use soroban_sdk::{
        symbol_short,
        testutils::{Address as _, Events},
        Address, Env, FromVal,
    };

    #[test]
    fn payload_round_trips_through_the_shared_helper() {
        let env = Env::default();
        let actor = Address::generate(&env);
        let contract_id = env.register_contract(None, crate::SharedContract);

        env.as_contract(&contract_id, || {
            emit_contract_event(
                &env,
                symbol_short!("market"),
                symbol_short!("listed"),
                (actor.clone(), 9_u64, 123_i128),
            );
        });

        let events = env.events().all();
        let event = events.get(0).unwrap();
        assert_eq!(event.1.len(), 2);
        let payload = <(Address, u64, i128)>::from_val(&env, &event.2);
        assert_eq!(payload, (actor, 9, 123));
    }
}

#[cfg(test)]
mod canonical_schema_tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Events},
        Address, Env, FromVal, Symbol,
    };

    fn topics_of(env: &Env, index: u32) -> (Symbol, Symbol) {
        let events = env.events().all();
        let topics = events.get(index).unwrap().1;
        assert_eq!(topics.len(), 2);
        (
            Symbol::from_val(env, &topics.get(0).unwrap()),
            Symbol::from_val(env, &topics.get(1).unwrap()),
        )
    }

    #[test]
    fn topic_symbols_are_stable() {
        assert_eq!(topics::TOKEN, symbol_short!("token"));
        assert_eq!(topics::MARKET, symbol_short!("market"));
        assert_eq!(topics::GOV, symbol_short!("gov"));
        assert_eq!(topics::MINT, symbol_short!("mint"));
        assert_eq!(topics::BURN, symbol_short!("burn"));
        assert_eq!(topics::TRANSFER, symbol_short!("transfer"));
        assert_eq!(topics::LISTED, symbol_short!("listed"));
        assert_eq!(topics::CANCELLED, symbol_short!("cancelled"));
        assert_eq!(topics::SOLD, symbol_short!("sold"));
        assert_eq!(topics::PROPOSED, symbol_short!("proposed"));
        assert_eq!(topics::EXECUTED, symbol_short!("executed"));
    }

    #[test]
    fn mint_event_encodes_canonical_topics_and_payload() {
        let env = Env::default();
        let actor = Address::generate(&env);
        let contract_id = env.register_contract(None, crate::SharedContract);

        env.as_contract(&contract_id, || {
            emit_mint(
                &env,
                TokenEvent {
                    actor: actor.clone(),
                    amount: 7,
                    balance_after: 42,
                },
            );
        });

        assert_eq!(topics_of(&env, 0), (topics::TOKEN, topics::MINT));
        let payload = <(Address, u64, i128)>::from_val(&env, &env.events().all().get(0).unwrap().2);
        assert_eq!(payload, (actor, 7, 42));
    }

    #[test]
    fn market_event_encodes_canonical_topics_and_payload() {
        let env = Env::default();
        let actor = Address::generate(&env);
        let contract_id = env.register_contract(None, crate::SharedContract);

        env.as_contract(&contract_id, || {
            emit_listed(
                &env,
                MarketEvent {
                    actor: actor.clone(),
                    listing_id: 9,
                    price: 123,
                },
            );
        });

        assert_eq!(topics_of(&env, 0), (topics::MARKET, topics::LISTED));
        let payload = <(Address, u64, i128)>::from_val(&env, &env.events().all().get(0).unwrap().2);
        assert_eq!(payload, (actor, 9, 123));
    }

    #[test]
    fn governance_event_encodes_canonical_topics_and_payload() {
        let env = Env::default();
        let actor = Address::generate(&env);
        let contract_id = env.register_contract(None, crate::SharedContract);

        env.as_contract(&contract_id, || {
            emit_proposed(
                &env,
                GovernanceEvent {
                    actor: actor.clone(),
                    proposal_id: 3,
                    value: 55,
                },
            );
        });

        assert_eq!(topics_of(&env, 0), (topics::GOV, topics::PROPOSED));
        let payload = <(Address, u64, i128)>::from_val(&env, &env.events().all().get(0).unwrap().2);
        assert_eq!(payload, (actor, 3, 55));
    }

    #[test]
    fn typed_helpers_share_the_two_topic_shape() {
        let env = Env::default();
        let actor = Address::generate(&env);
        let contract_id = env.register_contract(None, crate::SharedContract);

        env.as_contract(&contract_id, || {
            emit_transfer(
                &env,
                TokenEvent {
                    actor: actor.clone(),
                    amount: 1,
                    balance_after: 2,
                },
            );
            emit_sold(
                &env,
                MarketEvent {
                    actor: actor.clone(),
                    listing_id: 4,
                    price: 5,
                },
            );
            emit_executed(
                &env,
                GovernanceEvent {
                    actor: actor.clone(),
                    proposal_id: 6,
                    value: 7,
                },
            );
        });

        assert_eq!(topics_of(&env, 0), (topics::TOKEN, topics::TRANSFER));
        assert_eq!(topics_of(&env, 1), (topics::MARKET, topics::SOLD));
        assert_eq!(topics_of(&env, 2), (topics::GOV, topics::EXECUTED));
    }
}
