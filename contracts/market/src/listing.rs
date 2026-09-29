use soroban_sdk::{Address, Env, String as SorString, Symbol, Vec};
use brain_storm_shared::pausable;
use crate::{MarketError, Product, ProductListing, ProductStatus};

fn product_key(env: &Env, id: u32) -> Symbol {
    let mut s = SorString::from_str(env, "product_");
    // Append the id as string suffix using symbol_short-style approach
    Symbol::new(env, "product")
}

fn listing_key(env: &Env, id: u32) -> Symbol {
    Symbol::new(env, "listing")
}

pub fn list_product(
    env: Env,
    seller: Address,
    price: i128,
    token_address: Address,
    metadata: SorString,
) -> Result<u32, MarketError> {
    seller.require_auth();
    pausable::check_not_paused(&env);

    if price <= 0 {
        return Err(MarketError::InvalidProductState);
    }

    let counter: u32 = env.storage().instance().get(&Symbol::new(env, "product_counter"))
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

    env.storage().instance().set(&Symbol::new(env, "product"), &product);
    env.storage().instance().set(&Symbol::new(env, "product_counter"), &product_id);

    let listing = ProductListing {
        product_id,
        seller: seller.clone(),
        price,
        token_address,
        metadata,
        status: ProductStatus::Available,
    };
    env.storage().instance().set(&Symbol::new(env, "listing"), &listing);

    env.events().publish(
        (Symbol::new(env, "product_listed"),),
        (product_id, seller, price),
    );

    Ok(product_id)
}

pub fn get_product(env: Env, product_id: u32) -> Result<Product, MarketError> {
    env.storage().instance().get(&Symbol::new(env, "product"))
        .ok_or(MarketError::ProductNotFound)
}

pub fn get_listing(env: Env, product_id: u32) -> Result<ProductListing, MarketError> {
    env.storage().instance().get(&Symbol::new(env, "listing"))
        .ok_or(MarketError::ProductNotFound)
}

pub fn get_available_products(env: Env) -> Vec<Product> {
    let counter: u32 = env.storage().instance().get(&Symbol::new(env, "product_counter"))
        .unwrap_or(0);
    let mut products: Vec<Product> = Vec::new(&env);
    for i in 1..=counter {
        if let Some(product) = env.storage().instance().get::<Symbol, Product>(&Symbol::new(env, "product")) {
            if !product.sold {
                products.push_back(product);
            }
        }
    }
    products
}
