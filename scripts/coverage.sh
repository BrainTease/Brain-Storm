#!/usr/bin/env bash
# Generate test coverage report for all Brain-Storm contracts.
# Requires: cargo-llvm-cov (install with: cargo install cargo-llvm-cov)
#
# Usage:
#   ./scripts/coverage.sh           — generate HTML report (no gate)
#   ./scripts/coverage.sh --check   — enforce 85% line coverage gate (CI mode)
set -euo pipefail

COVERAGE_THRESHOLD=85
CHECK_MODE=false

for arg in "$@"; do
  case "$arg" in
    --check) CHECK_MODE=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

if ! cargo llvm-cov --version &>/dev/null; then
    echo "Installing cargo-llvm-cov..."
    cargo install cargo-llvm-cov
fi

if $CHECK_MODE; then
  echo "Running coverage with ${COVERAGE_THRESHOLD}% gate (CI mode)..."
  cargo llvm-cov \
      --workspace \
      --all-features \
      --summary-only \
      --fail-under-lines "${COVERAGE_THRESHOLD}" \
      -- --test-threads=1
  echo ""
  echo "✅ Coverage gate passed: ≥${COVERAGE_THRESHOLD}% line coverage"
else
  echo "Generating coverage report..."
  cargo llvm-cov \
      --workspace \
      --all-features \
      --html \
      --output-dir target/coverage \
      -- --test-threads=1

  echo ""
  echo "Coverage report generated at: target/coverage/index.html"
  echo "To enforce the 85% gate, run: ./scripts/coverage.sh --check"
fi
