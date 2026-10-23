use soroban_sdk::{symbol_short, Address, Env, IntoVal, Vec};

use brain_storm_shared::events::emit_contract_event;

use crate::storage::{self, DataKey};
use crate::types::{
    MarketError, Product, ProductListing, ProductStatus, Purchase, EVT_DOMAIN, EVT_PRODUCT_SOLD,
};

pub fn purchase_product(
    env: &Env,
    buyer: Address,
    product_id: u32,
) -> Result<(), MarketError> {
    buyer.require_auth();
    storage::require_not_paused(env);

    let mut product: Product = env
        .storage()
        .persistent()
        .get(&DataKey::Product(product_id))
        .ok_or(MarketError::ProductNotFound)?;

    if product.sold {
        return Err(MarketError::AlreadyPurchased);
    }

    if product.seller == buyer {
        return Err(MarketError::Unauthorized);
    }

    storage::acquire_lock(env)?;

    product.sold = true;
    env.storage()
        .persistent()
        .set(&DataKey::Product(product_id), &product);

    let purchase = Purchase {
        product_id,
        buyer: buyer.clone(),
        amount: product.price,
        timestamp: env.ledger().timestamp(),
        completed: true,
    };
    env.storage()
        .persistent()
        .set(&DataKey::Purchase(product_id), &purchase);

    if let Some(mut listing) = env
        .storage()
        .persistent()
        .get::<DataKey, ProductListing>(&DataKey::Listing(product_id))
    {
        listing.status = ProductStatus::Sold;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(product_id), &listing);
    }

    let _: () = env.invoke_contract(
        &product.token_address,
        &symbol_short!("transfer"),
        soroban_sdk::vec![
            env,
            buyer.into_val(env),
            product.seller.clone().into_val(env),
            product.price.into_val(env)
        ],
    );

    storage::release_lock(env);

    emit_contract_event(
        env,
        EVT_DOMAIN,
        EVT_PRODUCT_SOLD,
        (product_id, buyer, product.price),
    );

    Ok(())
}

pub fn get_purchase(env: &Env, product_id: u32) -> Result<Purchase, MarketError> {
    env.storage()
        .persistent()
        .get(&DataKey::Purchase(product_id))
        .ok_or(MarketError::ProductNotFound)
}

pub fn get_purchases_by_buyer(env: &Env, buyer: Address) -> Vec<Purchase> {
    let counter: u32 = env
        .storage()
        .instance()
        .get(&DataKey::ProductCounter)
        .unwrap_or(0);

    let mut purchases = Vec::new(env);
    for purchase in storage::read_purchases_batch(env, 1, counter.saturating_add(1)).iter() {
        if purchase.buyer == buyer {
            purchases.push_back(purchase);
        }
    }
    purchases
}
