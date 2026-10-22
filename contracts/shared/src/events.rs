use soroban_sdk::{Env, Symbol};

pub fn emit_contract_event<T>(env: &Env, domain: Symbol, action: Symbol, payload: T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
{
    env.events().publish((domain, action), payload);
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
