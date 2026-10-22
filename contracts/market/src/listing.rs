use soroban_sdk::{Address, Env, String, Vec};

use brain_storm_shared::events::emit_contract_event;
use brain_storm_shared::validation;

use crate::storage::{self, DataKey};
use crate::types::{
    MarketError, Product, ProductListing, ProductStatus, EVT_DOMAIN, EVT_PRODUCT_LISTED,
};

pub fn list_product(
    env: &Env,
    seller: Address,
    price: i128,
    token_address: Address,
    metadata: String,
) -> Result<u32, MarketError> {
    seller.require_auth();
    storage::require_not_paused(env);

    if !validation::is_positive_amount(price)
        || !validation::is_non_empty_string(&metadata)
    {
        return Err(MarketError::InvalidProductState);
    }

    let counter: u32 = env
        .storage()
        .instance()
        .get(&DataKey::ProductCounter)
        .unwrap_or(0);
    let product_id = counter + 1;

    let product = Product {
        id: product_id,
        seller: seller.clone(),
        price,
        token_address: token_address.clone(),
        metadata: metadata.clone(),
        sold: false,
        created_at: env.ledger().timestamp(),
    };

    let listing = ProductListing {
        product_id,
        seller: seller.clone(),
        price,
        token_address,
        metadata,
        status: ProductStatus::Available,
    };

    env.storage()
        .persistent()
        .set(&DataKey::Product(product_id), &product);
    env.storage()
        .persistent()
        .set(&DataKey::Listing(product_id), &listing);
    env.storage()
        .instance()
        .set(&DataKey::ProductCounter, &product_id);

    emit_contract_event(
        env,
        EVT_DOMAIN,
        EVT_PRODUCT_LISTED,
        (product_id, seller, price),
    );

    Ok(product_id)
}

pub fn get_product(env: &Env, product_id: u32) -> Result<Product, MarketError> {
    env.storage()
        .persistent()
        .get(&DataKey::Product(product_id))
        .ok_or(MarketError::ProductNotFound)
}

pub fn get_listing(env: &Env, product_id: u32) -> Result<ProductListing, MarketError> {
    env.storage()
        .persistent()
        .get(&DataKey::Listing(product_id))
        .ok_or(MarketError::ProductNotFound)
}

pub fn get_available_products(env: &Env) -> Vec<Product> {
    let counter: u32 = env
        .storage()
        .instance()
        .get(&DataKey::ProductCounter)
        .unwrap_or(0);

    let mut available = Vec::new(env);
    for product in storage::read_products_batch(env, 1, counter.saturating_add(1)).iter() {
        if !product.sold {
            available.push_back(product);
        }
    }
    available
}
