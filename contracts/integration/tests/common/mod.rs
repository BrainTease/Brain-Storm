use soroban_sdk::{testutils::Address as _, Address, Env};

use brain_storm_escrow::{EscrowContract, EscrowContractClient};
use brain_storm_token::{TokenContract, TokenContractClient};
use market::{MarketContract, MarketContractClient};

pub struct ContractFixture<'a> {
    pub env: Env,
    pub token: TokenContractClient<'a>,
    pub market: MarketContractClient<'a>,
    pub escrow: EscrowContractClient<'a>,
    pub admin: Address,
    pub buyer: Address,
    pub seller: Address,
    pub token_id: Address,
}

impl<'a> ContractFixture<'a> {
    pub fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let buyer = Address::generate(&env);
        let seller = Address::generate(&env);

        let token_id = env.register_contract(None, TokenContract);
        let token = TokenContractClient::new(&env, &token_id);
        token
            .initialize(
                &admin,
                &soroban_sdk::String::from_str(&env, "BrainStorm Token"),
                &soroban_sdk::String::from_str(&env, "BST"),
                &7,
                &10_000,
            )
            .unwrap();

        let market_id = env.register_contract(None, MarketContract);
        let market = MarketContractClient::new(&env, &market_id);
        market.initialize(&admin).unwrap();

        let escrow_id = env.register_contract(None, EscrowContract);
        let escrow = EscrowContractClient::new(&env, &escrow_id);

        ContractFixture {
            env,
            token,
            market,
            escrow,
            admin,
            buyer,
            seller,
            token_id,
        }
    }
}