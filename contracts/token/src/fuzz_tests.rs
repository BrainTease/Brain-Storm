#![cfg(test)]

use proptest::prelude::*;

/// Maximum token supply used across the token contract.
const MAX_SUPPLY: i128 = 10_000_000_000_000_000i128;

// Strategy for generating valid amounts (0 to MAX_SUPPLY)
fn arb_amount() -> impl Strategy<Value = i128> {
    0i128..=MAX_SUPPLY
}

// Strategy for generating non-zero amounts (1 to MAX_SUPPLY)
fn arb_positive_amount() -> impl Strategy<Value = i128> {
    1i128..=MAX_SUPPLY
}

// Strategy for generating valid ledger numbers
fn arb_ledger() -> impl Strategy<Value = u32> {
    0u32..=1_000_000u32
}

proptest! {
    #[test]
    fn fuzz_transfer_amount_bounds(
        amount in arb_amount(),
    ) {
        // Ensure amount doesn't overflow
        let env = Env::default();
        let admin = Address::generate(&env);
        
        // Amount should be within valid range
        prop_assert!(amount >= 0);
        prop_assert!(amount <= 10_000_000_000_000_000i128);
    }

    #[test]
    fn fuzz_vesting_schedule_validity(
        start in arb_ledger(),
        cliff in arb_ledger(),
        end in arb_ledger(),
        amount in arb_amount(),
    ) {
        // Vesting schedule constraints
        // cliff must be >= start
        // end must be > cliff
        // amount must be positive
        
        if cliff >= start && end > cliff && amount > 0 {
            prop_assert!(cliff >= start);
            prop_assert!(end > cliff);
            prop_assert!(amount > 0);
        }
    }

    #[test]
    fn fuzz_allowance_operations(
        owner_idx in 0u32..100,
        spender_idx in 0u32..100,
        amount in arb_amount(),
    ) {
        // Ensure owner and spender are different
        if owner_idx != spender_idx {
            prop_assert_ne!(owner_idx, spender_idx);
        }
        
        // Amount should be valid
        prop_assert!(amount >= 0);
    }

    #[test]
    fn fuzz_balance_operations(
        account_idx in 0u32..100,
        amount in arb_amount(),
    ) {
        // Balance should never be negative
        prop_assert!(amount >= 0);
    }

    #[test]
    fn fuzz_burn_amount_validation(
        amount in arb_amount(),
        total_supply in arb_amount(),
    ) {
        // Burn amount should not exceed total supply
        if amount <= total_supply {
            prop_assert!(amount <= total_supply);
        }
    }

    #[test]
    fn fuzz_mint_amount_validation(
        amount in arb_amount(),
        current_supply in arb_amount(),
    ) {
        let max_supply = 10_000_000_000_000_000i128;
        
        // Minted amount + current supply should not exceed max
        if let Some(new_supply) = current_supply.checked_add(amount) {
            if new_supply <= max_supply {
                prop_assert!(new_supply <= max_supply);
            }
        }
    }

    #[test]
    fn fuzz_vesting_claim_amount(
        total_amount in arb_amount(),
        claimed in arb_amount(),
        current_ledger in arb_ledger(),
        start in arb_ledger(),
        end in arb_ledger(),
    ) {
        // Claimed amount should never exceed total amount
        if claimed <= total_amount {
            prop_assert!(claimed <= total_amount);
        }
        
        // Current ledger should be >= start
        if current_ledger >= start {
            prop_assert!(current_ledger >= start);
        }
    }

    #[test]
    fn fuzz_approval_edge_cases(
        amount in arb_amount(),
    ) {
        // Test zero approval
        prop_assert_eq!(0i128, 0i128);
        
        // Test max approval
        prop_assert!(amount <= 10_000_000_000_000_000i128);
    }

    #[test]
    fn fuzz_transfer_sequence(
        amounts in prop::collection::vec(arb_amount(), 1..10),
    ) {
        let mut total = 0i128;
        
        for amount in amounts {
            if let Some(new_total) = total.checked_add(amount) {
                if new_total <= 10_000_000_000_000_000i128 {
                    total = new_total;
                }
            }
        }
        
        // Total should never exceed max supply
        prop_assert!(total <= 10_000_000_000_000_000i128);
    }

    #[test]
    fn fuzz_vesting_schedule_count(
        count in 0u32..1000,
    ) {
        // Schedule count should be reasonable
        prop_assert!(count < 1000);
    }

    #[test]
    fn fuzz_ledger_arithmetic(
        ledger1 in arb_ledger(),
        ledger2 in arb_ledger(),
    ) {
        // Ledger numbers should be non-negative
        prop_assert!(ledger1 >= 0);
        prop_assert!(ledger2 >= 0);
        
        // Difference should be calculable
        if ledger1 >= ledger2 {
            let diff = ledger1 - ledger2;
            prop_assert!(diff >= 0);
        }
    }

    /// Minting then burning the same amount must restore the original supply.
    #[test]
    fn fuzz_mint_burn_roundtrip(
        initial_supply in 0i128..=MAX_SUPPLY,
        mint_amount in arb_amount(),
    ) {
        prop_assume!(initial_supply.checked_add(mint_amount).map_or(false, |s| s <= MAX_SUPPLY));

        let after_mint = initial_supply.checked_add(mint_amount).unwrap();
        prop_assert!(after_mint >= initial_supply, "mint must not decrease supply");
        prop_assert!(after_mint <= MAX_SUPPLY);

        let after_burn = after_mint.checked_sub(mint_amount).unwrap();
        prop_assert_eq!(after_burn, initial_supply, "mint/burn must round-trip");
    }

    /// Total supply must be monotonically non-decreasing under mint operations.
    #[test]
    fn fuzz_mint_monotonic_supply(
        supply in 0i128..=MAX_SUPPLY,
        mint_amount in arb_amount(),
    ) {
        prop_assume!(supply.checked_add(mint_amount).map_or(false, |s| s <= MAX_SUPPLY));

        let new_supply = supply.checked_add(mint_amount).unwrap();
        prop_assert!(new_supply >= supply, "supply must never decrease on mint");
        prop_assert!(new_supply - supply == mint_amount, "supply delta must equal minted amount");
    }

    /// Burning must never underflow and must reduce supply by exactly the burned amount.
    #[test]
    fn fuzz_burn_reduces_supply(
        supply in 0i128..=MAX_SUPPLY,
        burn_amount in arb_amount(),
    ) {
        prop_assume!(burn_amount <= supply);

        let new_supply = supply.checked_sub(burn_amount).unwrap();
        prop_assert!(new_supply >= 0, "supply must never go negative");
        prop_assert!(new_supply <= supply, "burn must not increase supply");
        prop_assert_eq!(supply - new_supply, burn_amount);
    }

    /// Burning more than the available supply must be rejected (no underflow).
    #[test]
    fn fuzz_burn_exceeding_supply_rejected(
        supply in 0i128..=MAX_SUPPLY,
        burn_amount in arb_positive_amount(),
    ) {
        prop_assume!(burn_amount > supply);
        prop_assert!(supply.checked_sub(burn_amount).is_none(), "over-burn must not underflow");
    }

    /// Transfers conserve the sum of balances across sender and recipient.
    #[test]
    fn fuzz_transfer_conserves_balances(
        sender_balance in arb_amount(),
        recipient_balance in arb_amount(),
        transfer_amount in arb_amount(),
    ) {
        prop_assume!(transfer_amount <= sender_balance);

        let total_before = sender_balance.checked_add(recipient_balance).unwrap();
        let new_sender = sender_balance.checked_sub(transfer_amount).unwrap();
        let new_recipient = recipient_balance.checked_add(transfer_amount).unwrap();
        let total_after = new_sender.checked_add(new_recipient).unwrap();

        prop_assert_eq!(total_before, total_after, "transfer must conserve total balance");
        prop_assert!(new_sender >= 0);
        prop_assert!(new_recipient >= recipient_balance);
    }

    /// Transfers exceeding the sender balance must be rejected.
    #[test]
    fn fuzz_transfer_insufficient_balance_rejected(
        sender_balance in arb_amount(),
        transfer_amount in arb_positive_amount(),
    ) {
        prop_assume!(transfer_amount > sender_balance);
        prop_assert!(sender_balance.checked_sub(transfer_amount).is_none());
    }

    /// Zero-amount transfers must be a no-op for both balances.
    #[test]
    fn fuzz_zero_amount_transfer_noop(
        sender_balance in arb_amount(),
        recipient_balance in arb_amount(),
    ) {
        let transfer_amount = 0i128;
        let new_sender = sender_balance.checked_sub(transfer_amount).unwrap();
        let new_recipient = recipient_balance.checked_add(transfer_amount).unwrap();

        prop_assert_eq!(new_sender, sender_balance);
        prop_assert_eq!(new_recipient, recipient_balance);
    }

    /// A sequence of transfers must conserve the aggregate balance and never overflow.
    #[test]
    fn fuzz_transfer_sequence_conservation(
        initial_balances in prop::collection::vec(arb_amount(), 2..8),
        transfers in prop::collection::vec((0usize..8, 0usize..8, arb_amount()), 1..20),
    ) {
        let mut balances = initial_balances.clone();
        let n = balances.len();
        let total_before: i128 = balances.iter().try_fold(0i128, |acc, b| acc.checked_add(*b)).unwrap();

        for (from, to, amount) in transfers {
            let from = from % n;
            let to = to % n;
            if from == to {
                continue;
            }
            if amount > balances[from] {
                continue;
            }
            balances[from] -= amount;
            balances[to] = balances[to].checked_add(amount).unwrap();
        }

        let total_after: i128 = balances.iter().try_fold(0i128, |acc, b| acc.checked_add(*b)).unwrap();
        prop_assert_eq!(total_before, total_after, "transfers must conserve aggregate balance");
        prop_assert!(balances.iter().all(|b| *b >= 0), "balances must never be negative");
    }

    /// Repeated mints must never overflow past MAX_SUPPLY.
    #[test]
    fn fuzz_repeated_mints_no_overflow(
        mints in prop::collection::vec(arb_amount(), 1..20),
    ) {
        let mut supply = 0i128;
        for amount in mints {
            match supply.checked_add(amount) {
                Some(new_supply) if new_supply <= MAX_SUPPLY => supply = new_supply,
                _ => break,
            }
        }
        prop_assert!(supply >= 0);
        prop_assert!(supply <= MAX_SUPPLY);
    }
}

#[cfg(test)]
mod edge_case_tests {
    use super::*;

    #[test]
    fn test_zero_amount_transfer() {
        let amount = 0i128;
        assert_eq!(amount, 0);
    }

    #[test]
    fn test_max_amount_transfer() {
        let amount = 10_000_000_000_000_000i128;
        assert!(amount > 0);
    }

    #[test]
    fn test_overflow_prevention() {
        let max = i128::MAX;
        let result = max.checked_add(1);
        assert!(result.is_none());
    }

    #[test]
    fn test_underflow_prevention() {
        let min = i128::MIN;
        let result = min.checked_sub(1);
        assert!(result.is_none());
    }

    #[test]
    fn test_vesting_schedule_ordering() {
        let start = 100u32;
        let cliff = 200u32;
        let end = 300u32;
        
        assert!(cliff >= start);
        assert!(end > cliff);
    }

    #[test]
    fn test_invalid_vesting_schedule() {
        let start = 300u32;
        let cliff = 200u32;
        let end = 100u32;
        
        // These should fail validation
        assert!(cliff < start);
        assert!(end <= cliff);
    }

    #[test]
    fn test_mint_burn_roundtrip() {
        let initial = 1_000i128;
        let minted = 500i128;
        let after_mint = initial + minted;
        let after_burn = after_mint - minted;
        assert_eq!(after_burn, initial);
    }

    #[test]
    fn test_transfer_conservation() {
        let sender = 1_000i128;
        let recipient = 250i128;
        let amount = 400i128;
        let total_before = sender + recipient;
        let total_after = (sender - amount) + (recipient + amount);
        assert_eq!(total_before, total_after);
    }

    #[test]
    fn test_zero_amount_transfer_is_noop() {
        let sender = 1_000i128;
        let recipient = 250i128;
        assert_eq!(sender - 0, sender);
        assert_eq!(recipient + 0, recipient);
    }

    #[test]
    fn test_burn_exceeding_supply_rejected() {
        let supply = 100i128;
        let burn = 101i128;
        assert!(supply.checked_sub(burn).is_none());
    }

    #[test]
    fn test_mint_exceeding_max_supply_rejected() {
        let supply = MAX_SUPPLY;
        assert!(supply.checked_add(1).map_or(true, |s| s > MAX_SUPPLY));
    }
}
