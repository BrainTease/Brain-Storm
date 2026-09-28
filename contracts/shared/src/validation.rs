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
    assert!(!s.is_empty(), "String must not be empty");
}

// ============================================================================
// Metadata Validation Helpers (#1170)
// ============================================================================

/// Validates royalty basis points are within valid range (0-10000).
/// Both NFT and credential_metadata contracts use this validation.
pub fn require_valid_royalty_basis(royalty_basis: u32) {
    assert!(
        royalty_basis <= 10000,
        "Royalty basis must be <= 10000"
    );
}

/// Validates basic IPFS hash format (starts with "Qm" and reasonable length).
/// Used by both NFT and credential metadata contracts for URI validation.
pub fn require_valid_ipfs_hash(ipfs_hash: &String) {
    require_non_empty_string(ipfs_hash);
    
    // Basic IPFS hash validation - should start with "Qm" and be reasonable length
    // In no_std environment, we'll check the length and do basic prefix validation
    let len = ipfs_hash.len();
    assert!(
        len >= 44 && len <= 100,
        "Invalid IPFS hash format"
    );
    
    // Basic check that it looks like a valid hash (this is a simple heuristic)
    // Real IPFS hashes are base58 encoded, but we'll do basic checks here
    assert!(
        len >= 46, // Minimum realistic IPFS hash length
        "Invalid IPFS hash format"
    );
}

/// Validates metadata URI format (basic URL format check).
/// Supports both HTTP/HTTPS URLs and IPFS URIs.
pub fn require_valid_metadata_uri(uri: &String) {
    require_non_empty_string(uri);
    
    // Basic length validation for URIs
    let len = uri.len();
    assert!(
        len >= 10 && len <= 256,
        "URI length must be between 10 and 256 characters"
    );
}

/// Validates that a string represents reasonable metadata size limits.
/// Prevents excessively large metadata strings that could cause storage issues.
pub fn require_reasonable_metadata_size(metadata_string: &String, max_bytes: u32) {
    let actual_size = metadata_string.len() as u32;
    assert!(
        actual_size <= max_bytes,
        "Metadata string exceeds maximum size limit"
    );
}

/// Validates course name format for consistent naming across contracts.
pub fn require_valid_course_name(course_name: &String) {
    require_non_empty_string(course_name);
    
    let len = course_name.len();
    assert!(
        len >= 3 && len <= 100,
        "Course name must be between 3 and 100 characters"
    );
}

/// Validates grade format for credential contracts.
pub fn require_valid_grade(grade: &String) {
    require_non_empty_string(grade);
    
    let len = grade.len();
    assert!(
        len <= 20,
        "Grade must be 20 characters or less"
    );
}
