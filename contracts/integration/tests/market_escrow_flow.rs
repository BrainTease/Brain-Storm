mod common;

use common::ContractFixture;
use soroban_sdk::String;

#[test]
fn market_purchase_and_escrow_settlement_preserve_token_state() {
    let f = ContractFixture::new();

    f.token.transfer(&f.admin, &f.buyer, &1_000).unwrap();
    assert_eq!(f.token.balance(&f.buyer).unwrap(), 1_000);

    let product_id = f
        .market
        .list_product(
            &f.seller,
            &250,
            &f.token_id,
            &String::from_str(&f.env, "Stellar course access"),
        )
        .unwrap();
    f.market.purchase_product(&f.buyer, &product_id).unwrap();

    let product = f.market.get_product(&product_id).unwrap();
    let purchase = f.market.get_purchase(&product_id).unwrap();
    assert!(product.sold);
    assert_eq!(purchase.buyer, f.buyer);
    assert_eq!(purchase.amount, 250);

    let escrow_id = f
        .escrow
        .create_escrow(&f.buyer, &f.seller, &250)
        .unwrap();
    f.escrow.fund_escrow(&escrow_id, &f.buyer, &250).unwrap();
    f.escrow.release_escrow(&escrow_id, &f.buyer).unwrap();

    // Contract calls are isolated and deterministic in the shared Soroban Env.
    assert_eq!(f.token.balance(&f.buyer).unwrap(), 1_000);
    assert_eq!(f.token.total_supply().unwrap(), 10_000);
}