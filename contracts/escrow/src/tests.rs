#![cfg(test)]
use super::*;
use soroban_sdk::{Env, Address};

#[test]
fn test_create_escrow_valid() {
    let env = Env::default();
    let client = Address::random(&env);
    let agent = Address::random(&env);
    
    let result = EscrowContract::create_escrow(
        env,
        client,
        agent,
        1000,
    );
    
    assert!(result.is_ok());
}

#[test]
fn test_create_escrow_invalid_amount() {
    let env = Env::default();
    let client = Address::random(&env);
    let agent = Address::random(&env);
    
    let result = EscrowContract::create_escrow(
        env,
        client,
        agent,
        0,
    );
    
    assert!(result.is_err());
    match result.unwrap_err() {
        EscrowError::Shared(SharedError::InvalidAmount) => (),
        _ => panic!("Expected InvalidAmount error"),
    }
}

#[test]
fn test_fund_escrow_success() {
    let env = Env::default();
    let caller = Address::random(&env);
    
    let result = EscrowContract::fund_escrow(
        env,
        1,
        caller,
        500,
    );
    
    assert!(result.is_ok());
}

#[test]
fn test_fund_escrow_insufficient_balance() {
    let env = Env::default();
    let caller = Address::random(&env);
    
    // Mock insufficient balance
    // In a real test, we would mock the balance check
    
    let result = EscrowContract::fund_escrow(
        env,
        1,
        caller,
        2000, // More than available balance
    );
    
    // This will fail with insufficient balance
    match result {
        Err(EscrowError::Shared(SharedError::InsufficientBalance)) => (),
        _ => panic!("Expected InsufficientBalance error"),
    }
}
