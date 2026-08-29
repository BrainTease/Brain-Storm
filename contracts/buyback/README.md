# Buyback Contract

Manages treasury-funded BST token buybacks via DEX swaps.

---

## Token Accounting Invariants (#1011)

The following invariants are enforced by `src/invariant_tests.rs` and must hold across **every** buy/burn cycle, regardless of the number or order of operations.

### INV-1 — Treasury Conservation

```
reserve_before == total_xlm_spent + reserve_after
```

Every unit of XLM that leaves the reserve is recorded in `total_xlm_spent`.
No XLM can be created or destroyed silently.

### INV-2 — Token Accounting

```
total_bst_bought == Σ record.amount_bought  (over all BuybackRecord history entries)
```

The cumulative `total_bst_bought` counter always equals the sum of the
`amount_bought` field across all individual `BuybackRecord` entries.  These
tokens conceptually represent the burn amount in production (the DEX swap
removes them from circulating supply).

### INV-3 — History Count Integrity

```
analytics.total_buybacks == len(get_buyback_history(0, ∞))
```

Every successful call to `execute_buyback_via_dex` (via `manual_buyback` or
`check_and_execute_buyback`) produces exactly one history record and increments
the count by exactly one.

### INV-4 — Reserve Floor

```
reserve_after >= 0  (at all times)
```

A buyback can never drive the reserve into a negative balance.  The
`manual_buyback` guard (`reserve >= amount + min_reserve`) and the
`check_and_execute_buyback` available-amount check both enforce this.

### INV-5 — BST Formula Monotonicity

```
xlm_1 <= xlm_2  ⟹  bst_1 <= bst_2   (for the same bst_price)
```

Spending more XLM never yields fewer BST tokens.  The formula is:

```
bst = (xlm * 1_000_000) / bst_price
```

which is strictly non-decreasing in `xlm` for any positive `bst_price`.

### INV-6 — Analytics Consistency

```
analytics.total_buybacks == len(history)
analytics.total_bst_bought == Σ record.amount_bought
analytics.total_xlm_spent == Σ record.xlm_spent
```

The three aggregates exposed by `get_buyback_analytics` are always in sync with
the raw history returned by `get_buyback_history`.

---

## Storage Keys

| Key | Type | Description |
|---|---|---|
| `Admin` | `Address` | Contract administrator |
| `TokenContract` | `Address` | BST token contract |
| `OracleContract` | `Address` | Price oracle contract |
| `DexContract` | `Address` | DEX contract |
| `BuybackConfig` | `BuybackConfig` | Tunable parameters |
| `BuybackHistory(n)` | `BuybackRecord` | nth buyback record |
| `BuybackHistoryCount` | `u32` | Total number of buybacks |
| `LastBuybackLedger` | `u32` | Ledger of last buyback |
| `TotalBuybackAmount` | `i128` | Cumulative BST bought |
| `BuybackReserve` | `i128` | Available XLM reserve |

---

## Running the Invariant Tests

```bash
cargo test -p buyback -- invariant_tests
```
