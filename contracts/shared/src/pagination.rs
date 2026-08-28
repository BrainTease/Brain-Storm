//! Shared pagination helper for Soroban contract list queries.
//!
//! Provides a single, tested implementation of offset+limit slicing over a
//! `soroban_sdk::Vec<T>` so that every contract in the workspace uses identical
//! cursor-handling semantics, and we can test the edge cases in one place.
//!
//! # Usage
//!
//! ```rust,ignore
//! use brain_storm_shared::pagination::paginate;
//!
//! let page = paginate(&env, &my_vec, offset, limit);
//! ```
//!
//! # Edge cases handled
//!
//! | Scenario | Behaviour |
//! |---|---|
//! | `offset` ≥ `total` | Returns empty `Vec` |
//! | `offset + limit` > `total` | Clamps to `total` (partial page) |
//! | `limit == 0` | Returns empty `Vec` |
//! | Empty source `Vec` | Returns empty `Vec` |

use soroban_sdk::{Env, Vec};

/// Return a page of items from `list` starting at `offset` with at most `limit` items.
///
/// All four cursor-boundary cases are handled safely (see module-level docs).
pub fn paginate<T: soroban_sdk::TryFromVal<Env, soroban_sdk::Val> + soroban_sdk::IntoVal<Env, soroban_sdk::Val> + Clone>(
    env: &Env,
    list: &Vec<T>,
    offset: u32,
    limit: u32,
) -> Vec<T> {
    let total = list.len();
    let start = offset.min(total);
    let end = (offset.checked_add(limit).unwrap_or(total)).min(total);

    let mut page = Vec::new(env);
    let mut i = start;
    while i < end {
        page.push_back(list.get(i).unwrap());
        i += 1;
    }
    page
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    fn make_list(env: &Env, n: u32) -> Vec<u32> {
        let mut v: Vec<u32> = Vec::new(env);
        for i in 0..n {
            v.push_back(i);
        }
        v
    }

    // ── empty source ─────────────────────────────────────────────────────────

    #[test]
    fn test_paginate_empty_list_returns_empty() {
        let env = Env::default();
        let list: Vec<u32> = Vec::new(&env);
        let page = paginate(&env, &list, 0, 10);
        assert_eq!(page.len(), 0);
    }

    // ── zero limit ───────────────────────────────────────────────────────────

    #[test]
    fn test_paginate_zero_limit_returns_empty() {
        let env = Env::default();
        let list = make_list(&env, 5);
        let page = paginate(&env, &list, 0, 0);
        assert_eq!(page.len(), 0);
    }

    // ── full page ────────────────────────────────────────────────────────────

    #[test]
    fn test_paginate_full_page() {
        let env = Env::default();
        let list = make_list(&env, 5); // [0, 1, 2, 3, 4]
        let page = paginate(&env, &list, 0, 5);
        assert_eq!(page.len(), 5);
        for i in 0..5_u32 {
            assert_eq!(page.get(i).unwrap(), i);
        }
    }

    // ── partial page (limit larger than remaining) ────────────────────────────

    #[test]
    fn test_paginate_limit_clamps_to_available() {
        let env = Env::default();
        let list = make_list(&env, 3); // [0, 1, 2]
        // Ask for 10, only 3 available
        let page = paginate(&env, &list, 0, 10);
        assert_eq!(page.len(), 3);
    }

    // ── offset at boundary ────────────────────────────────────────────────────

    #[test]
    fn test_paginate_offset_at_end_returns_empty() {
        let env = Env::default();
        let list = make_list(&env, 5); // length = 5
        // offset == total → nothing to return
        let page = paginate(&env, &list, 5, 10);
        assert_eq!(page.len(), 0);
    }

    #[test]
    fn test_paginate_offset_past_end_returns_empty() {
        let env = Env::default();
        let list = make_list(&env, 3);
        let page = paginate(&env, &list, 100, 5);
        assert_eq!(page.len(), 0);
    }

    // ── mid-list page ─────────────────────────────────────────────────────────

    #[test]
    fn test_paginate_second_page() {
        let env = Env::default();
        let list = make_list(&env, 5); // [0, 1, 2, 3, 4]
        let page = paginate(&env, &list, 2, 2); // expect [2, 3]
        assert_eq!(page.len(), 2);
        assert_eq!(page.get(0).unwrap(), 2_u32);
        assert_eq!(page.get(1).unwrap(), 3_u32);
    }

    #[test]
    fn test_paginate_last_partial_page() {
        let env = Env::default();
        let list = make_list(&env, 5); // [0, 1, 2, 3, 4]
        let page = paginate(&env, &list, 4, 10); // only element 4 remains
        assert_eq!(page.len(), 1);
        assert_eq!(page.get(0).unwrap(), 4_u32);
    }

    // ── single-element list ────────────────────────────────────────────────────

    #[test]
    fn test_paginate_single_element_list() {
        let env = Env::default();
        let list = make_list(&env, 1); // [0]
        let page = paginate(&env, &list, 0, 1);
        assert_eq!(page.len(), 1);
        assert_eq!(page.get(0).unwrap(), 0_u32);
    }

    #[test]
    fn test_paginate_single_element_offset_1_returns_empty() {
        let env = Env::default();
        let list = make_list(&env, 1); // [0]
        let page = paginate(&env, &list, 1, 1);
        assert_eq!(page.len(), 0);
    }
}
