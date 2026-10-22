//! Canonical shared error codes for all contracts.
//!
//! Re-exports the shared error enum from `errors.rs` under the name this module provides, so
//! contracts can `use brain_storm_shared::error::SharedError`. New cross-contract errors go in
//! `errors.rs`, not in a contract-local enum.
pub use crate::errors::SharedError;
