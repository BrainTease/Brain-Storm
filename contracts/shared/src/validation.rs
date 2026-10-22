use soroban_sdk::{Env, String};

pub fn is_positive_amount(amount: i128) -> bool {
    amount > 0
}

pub fn require_positive_amount(amount: i128) {
    assert!(is_positive_amount(amount), "Amount must be positive");
}

pub fn is_non_negative_amount(amount: i128) -> bool {
    amount >= 0
}

pub fn require_non_negative_amount(amount: i128) {
    assert!(is_non_negative_amount(amount), "Amount must be non-negative");
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

/// Non-empty check used by the metadata rules below (issue #1170) — every
/// `require_*` in this module is `assert!(is_*(x), MESSAGE)`.
pub fn is_non_empty_string(s: &String) -> bool {
    !s.is_empty()
}

pub fn require_non_empty_string(s: &String) {
    assert!(is_non_empty_string(s), "String must not be empty");
}

// ============================================================================
// Metadata Validation Helpers (#1170)
//
// Single source of truth for the metadata rules shared by `contracts/nft` and
// `contracts/credential_metadata`. Each rule is written twice and only twice:
//
// * an `is_*` predicate — non-panicking, for callers that must *report*
//   validity (e.g. `credential_metadata::validation::is_metadata_valid`), and
// * a `require_*` wrapper — panics with the rule's message, for callers that
//   must *reject* invalid input at the entry point.
//
// The wrapper is always `assert!(is_*(x), MESSAGE)`, so the two can never
// drift apart and neither contract needs its own copy of the rule.
// ============================================================================

/// Validates royalty basis points are within valid range (0-10000).
/// Both NFT and credential_metadata contracts use this validation.
pub fn is_valid_royalty_basis(royalty_basis: u32) -> bool {
    royalty_basis <= 10000
}

pub fn require_valid_royalty_basis(royalty_basis: u32) {
    assert!(
        is_valid_royalty_basis(royalty_basis),
        "Royalty basis must be <= 10000"
    );
}

/// Basic IPFS CIDv1 hash check: base58 CIDv0 hashes ("Qm…") are 46 chars,
/// longer CIDv1/URL forms are accepted up to a sane upper bound.
pub fn is_valid_ipfs_hash(ipfs_hash: &String) -> bool {
    let len = ipfs_hash.len();
    (46..=100).contains(&len)
}

pub fn require_valid_ipfs_hash(ipfs_hash: &String) {
    assert!(is_valid_ipfs_hash(ipfs_hash), "Invalid IPFS hash format");
}

/// Metadata URI: non-empty, bounded length (HTTP(S) URLs and `ipfs://` URIs).
pub fn is_valid_metadata_uri(uri: &String) -> bool {
    let len = uri.len();
    (10..=256).contains(&len)
}

pub fn require_valid_metadata_uri(uri: &String) {
    assert!(
        is_valid_metadata_uri(uri),
        "URI length must be between 10 and 256 characters"
    );
}

/// Guards against oversized metadata strings that would bloat storage.
pub fn is_reasonable_metadata_size(metadata_string: &String, max_bytes: u32) -> bool {
    metadata_string.len() <= max_bytes
}

pub fn require_reasonable_metadata_size(metadata_string: &String, max_bytes: u32) {
    assert!(
        is_reasonable_metadata_size(metadata_string, max_bytes),
        "Metadata string exceeds maximum size limit"
    );
}

/// Course name format shared by NFT minting and credential issuance.
pub fn is_valid_course_name(course_name: &String) -> bool {
    let len = course_name.len();
    (3..=100).contains(&len)
}

pub fn require_valid_course_name(course_name: &String) {
    assert!(
        is_valid_course_name(course_name),
        "Course name must be between 3 and 100 characters"
    );
}

/// Grade format shared by credential contracts.
pub fn is_valid_grade(grade: &String) -> bool {
    let len = grade.len();
    (1..=20).contains(&len)
}

pub fn require_valid_grade(grade: &String) {
    assert!(is_valid_grade(grade), "Grade must be 20 characters or less");
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{Env, String};

    #[test]
    fn positive_amount_predicates() {
        assert!(is_positive_amount(1));
        assert!(!is_positive_amount(0));
        assert!(!is_positive_amount(-1));
        assert!(is_non_negative_amount(0));
        assert!(!is_non_negative_amount(-1));
    }

    #[test]
    fn positive_amount_require_accepts_valid_and_rejects_zero() {
        require_positive_amount(1);
        require_non_negative_amount(0);

        let zero = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| require_positive_amount(0)));
        assert!(zero.is_err());
    }

    #[test]
    fn percentage_rules() {
        require_percentage_valid(0);
        require_percentage_valid(100);
        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| require_percentage_valid(101))).is_err());

        require_percentages_sum_100(60, 30, 10);
        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| require_percentages_sum_100(60, 30, 11))).is_err());
    }

    #[test]
    fn timestamp_must_be_strictly_in_the_future() {
        let env = Env::default();
        require_future_timestamp(&env, 1);
        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| require_future_timestamp(&env, 0))).is_err());
    }

    #[test]
    fn metadata_string_rules() {
        let env = Env::default();

        let course = String::from_str(&env, "Math");
        require_valid_course_name(&course);
        assert!(!is_valid_course_name(&String::from_str(&env, "AB")));

        let grade = String::from_str(&env, "A");
        require_valid_grade(&grade);

        let ipfs = String::from_str(
            &env,
            "QmYwAPJzv5CZsnAzt8auVZRn1v7QhJ7bL8bYh4mF5J6kP7",
        );
        require_valid_ipfs_hash(&ipfs);

        let uri = String::from_str(&env, "ipfs://QmYwAPJzv5C");
        require_valid_metadata_uri(&uri);

        require_reasonable_metadata_size(&course, 100);
        assert!(!is_reasonable_metadata_size(&course, 1));
    }

    #[test]
    fn non_empty_string_predicate() {
        let env = Env::default();
        let empty = String::from_str(&env, "");
        let value = String::from_str(&env, "x");
        assert!(!is_non_empty_string(&empty));
        assert!(is_non_empty_string(&value));
        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| require_non_empty_string(&empty))).is_err());
    }
}
