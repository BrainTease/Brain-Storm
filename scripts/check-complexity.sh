#!/usr/bin/env bash
# check-complexity.sh — Report cyclomatic/cognitive complexity violations.
#
# Usage:
#   ./scripts/check-complexity.sh           # check everything
#   ./scripts/check-complexity.sh --ts      # TypeScript only
#   ./scripts/check-complexity.sh --rust    # Rust only
#
# TypeScript: ESLint `complexity` rule (max 15) already declared in
#   .eslintrc.js, apps/backend/.eslintrc.js, apps/frontend/.eslintrc.js.
#   This script surfaces all offenders in one pass.
#
# Rust: Clippy `cognitive_complexity` lint (threshold 25) declared in
#   [workspace.lints.clippy] in Cargo.toml.
#
# Exit code: 0 if no violations, 1 if any are found.

set -euo pipefail

TS_ONLY=false
RUST_ONLY=false

for arg in "$@"; do
  case $arg in
    --ts)   TS_ONLY=true ;;
    --rust) RUST_ONLY=true ;;
  esac
done

FAILURES=0

if [ "$RUST_ONLY" = false ]; then
  echo "==> Checking TypeScript cyclomatic complexity (max 15)..."
  if ! npx eslint \
    --ext .ts,.tsx \
    --rule '{"complexity": ["error", {"max": 15}]}' \
    "apps/backend/src/**/*.ts" \
    "apps/frontend/src/**/*.ts" \
    "apps/frontend/src/**/*.tsx" \
    "packages/**/*.ts" \
    "packages/**/*.tsx" 2>&1; then
    FAILURES=$((FAILURES + 1))
  fi
fi

if [ "$TS_ONLY" = false ]; then
  echo "==> Checking Rust cognitive complexity (threshold 25)..."
  if ! cargo clippy --workspace --all-targets -- -W clippy::cognitive_complexity 2>&1; then
    FAILURES=$((FAILURES + 1))
  fi
fi

if [ "$FAILURES" -gt 0 ]; then
  echo ""
  echo "ERROR: $FAILURES complexity check(s) failed."
  echo "Refactor offending functions before merging."
  exit 1
else
  echo ""
  echo "All complexity checks passed."
fi
