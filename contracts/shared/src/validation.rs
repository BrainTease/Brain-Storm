use soroban_sdk::{Env, String};

pub fn require_positive_amount(amount: i128) {
    assert!(amount > 0, "Amount must be positive");
}

pub fn require_non_zero_u64(value: u64) {
    assert!(value > 0, "Value must be non-zero");
}

pub fn require_percentage_valid(pct: u32) {
    assert!(pct <= 100, "Percentage must be 0-100");
}

pub fn require_percentages_sum_100(a: u32, b: u32, c: u32) {
    assert!(a + b + c == 100, "Percentages must sum to 100");
}

pub fn require_future_timestamp(env: &Env, ts: u64) {
    assert!(
        ts > env.ledger().timestamp(),
        "Timestamp must be in the future"
    );
}

pub fn require_non_empty_string(s: &String) {
    assert!(s.len() > 0, "String must not be empty");
}
