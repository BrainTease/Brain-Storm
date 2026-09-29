use soroban_sdk::{Address, Env, Symbol};
use brain_storm_shared::access;
use crate::{MarketError, Purchase};

pub fn purchase_product(
    env: Env,
    buyer: Address,
    product_id: u32,
) -> Result<(), MarketError> {
    buyer.require_auth();

    // Load product
    let mut product: super::Product = env.storage().instance().get(&Symbol::new(&env, "product"))
        .ok_or(MarketError::ProductNotFound)?;

    if product.sold {
        return Err(MarketError::AlreadyPurchased);
    }

    if product.seller == buyer {
        return Err(MarketError::Unauthorized);
    }

    // Mark product as sold
    product.sold = true;
    env.storage().instance().set(&Symbol::new(&env, "product"), &product);

    // Create purchase record
    let purchase = Purchase {
        product_id,
        buyer: buyer.clone(),
        amount: product.price,
        timestamp: env.ledger().timestamp(),
        completed: false,
    };
    env.storage().instance().set(&Symbol::new(&env, "purchase"), &purchase);

    env.events().publish(
        (Symbol::new(&env, "product_purchased"),),
        (product_id, buyer, product.price),
    );

    Ok(())
}
