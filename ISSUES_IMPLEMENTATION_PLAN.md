# Implementation Plan: Issues #834, #835, #836, #837

## Issue #834: Refactor buyback contract to remove duplicated pricing logic

**Task**: Extract the pricing calculation logic from `execute_buyback_via_dex` that appears in both `check_and_execute_buyback` and `manual_buyback`.

**Current Duplication**: 
- `get_bst_price()` calculation is called in multiple places
- Price calculation logic: `(xlm_amount * 1_000_000) / bst_price`

**Solution**:
1. Extract pricing calculation helper functions to reduce duplication
2. Create `calculate_bst_amount_from_xlm()` helper
3. Create `validate_reserve_and_buyback()` helper
4. Update call sites
5. Test changes

---

## Issue #835: Audit dispute contract for unauthorized-state-transition risks

**Task**: Fix potential authorization gaps and state-transition risks in the dispute contract.

**Current Issues**:
- Allow arbiter to decide directly from Open status (bypassing Evidence phase) - this might be intentional but should be explicit
- Check for potential reentrancy with persistent storage

**Solution**:
1. Create admin role management utilities in shared contract
2. Add state-transition validation module
3. Ensure all state transitions are validated properly
4. Add authorization checks for all mutations
5. Add tests for edge cases

---

## Issue #836: Consolidate admin-role management logic into contracts/shared

**Task**: Move duplicate admin/arbiter authentication checks to the shared contract.

**Current Duplication** (found in multiple contracts):
```rust
let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
assert!(admin == stored_admin, "Only admin");
```

**Solution**:
1. Create `admin.rs` module in `contracts/shared/src/`
2. Create `AdminManager` trait with methods:
   - `require_admin()` - verify caller is admin
   - `set_admin()` - update admin address
   - `get_admin()` - retrieve current admin
3. Update all contracts to use shared module
4. Update imports and tests

---

## Issue #837: Refactor scholarship_fund contract storage keys for clarity and gas savings

**Task**: Optimize storage keys and improve code clarity in the scholarship_fund contract.

**Current Issues**:
- Status field uses `u8` (0,1,2,3) - not type-safe
- DataKey enum doesn't use descriptive naming
- Storage key access pattern could be optimized

**Solution**:
1. Create `enum ApplicationStatus` with variants: `Pending, Approved, Rejected, Distributed`
2. Update `ScholarshipApplication` to use enum instead of u8
3. Rename storage keys for clarity:
   - `DataKey::Admin` → `DataKey::Admin` (keep)
   - `DataKey::FundBalance` → `DataKey::FundBalance` (keep)
   - `DataKey::Application(u64)` → `DataKey::Application(u64)` (keep)
   - `DataKey::ApplicationCount` → `DataKey::ApplicationCount` (keep)
   - `DataKey::DonorTotal(Address)` → `DataKey::DonorTotal(Address)` (keep)
4. Create helper methods for status transitions
5. Update all status comparisons
6. Test all changes

---

## Implementation Order

1. **Issue #834** - Extract pricing logic (isolated, low risk)
2. **Issue #836** - Create shared admin module (affects multiple contracts)
3. **Issue #835** - Audit dispute contract and apply shared admin module
4. **Issue #837** - Refactor scholarship fund (isolated, low risk)

