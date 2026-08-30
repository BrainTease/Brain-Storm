# Royalty Distribution

## Fuzz / property-based testing

This crate includes a proptest-based invariant check for royalty split math in `src/tests.rs`.

Run it locally with:

```bash
cargo test --manifest-path contracts/royalty_distribution/Cargo.toml fuzz_split_totals_remain_exact_for_all_valid_percentages -- --nocapture
```

The invariant verifies that for any valid split percentages and positive total amount:

- each share is computed from its percentage,
- the remaining amount is assigned to the residual bucket,
- the total allocated across all recipients matches the original amount exactly.

This catches rounding and overflow edge cases without requiring a full `cargo fuzz` setup in a constrained environment.
