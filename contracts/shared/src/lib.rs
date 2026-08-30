#![no_std]
//! Shared RBAC contract and common Soroban patterns (pause, reentrancy guard, multisig, timelocked upgrade).
//!
//! Full interface reference: [docs/contract-interfaces.md § Shared / RBAC Contract](../../../docs/contract-interfaces.md#shared--rbac-contract).
//! Cross-contract call conventions used across `contracts/`: [docs/contract-interfaces.md § Cross-Contract Call Conventions](../../../docs/contract-interfaces.md#cross-contract-call-conventions).
//! Rationale for this crate's existence and how it relates to other contracts: [ADR-007](../../../docs/adr/ADR-007-shared-crate-for-common-code.md).

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, Symbol};

pub mod admin;
pub mod events;
pub mod errors;
pub mod oracle;
pub mod math;

// Re-export commonly used items
pub use errors::SharedError;