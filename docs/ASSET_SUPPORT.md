# Multi-Asset Support in Market/Escrow

## Overview
The Market and Escrow contracts support multiple asset types including XLM, USDC, and custom tokens.

## Supported Assets

### Native XLM
- **Type:** Stellar native asset
- **Trustline:** Not required
- **Symbol:** XLM
- **Decimals:** 7

### USDC (Circle)
- **Type:** Stellar token
- **Trustline:** Required
- **Symbol:** USDC
- **Decimals:** 7

### Custom Tokens
- **Type:** Any Stellar token
- **Trustline:** Required
- **Symbol:** Varies
- **Decimals:** Varies

## Asset Handling

### Token Contract Interface
All tokens must implement the Soroban token interface:
```rust
pub trait Token {
    fn transfer(from: Address, to: Address, amount: i128);
    fn balance_of(account: Address) -> i128;
    fn symbol() -> String;
    fn decimals() -> u32;
}
client.send_tip(&sender, &recipient, &native_asset, &amount);
client.send_tip(&sender, &recipient, &usdc_asset, &amount);
client.create_escrow(&payer, &recipient, &custom_token, &amount, &release_time);
