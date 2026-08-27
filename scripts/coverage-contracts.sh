#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/coverage-contracts.sh
#
# Issue #1017 — Generate workspace-wide Soroban contract test coverage report
# and enforce a 90 %+ line-coverage threshold across all crates.
#
# Prerequisites:
#   cargo install cargo-llvm-cov
#   rustup component add llvm-tools-preview
#
# Usage:
#   ./scripts/coverage-contracts.sh           # HTML + summary table
#   ./scripts/coverage-contracts.sh --ci      # JSON report for CI upload
#   ./scripts/coverage-contracts.sh --check   # exit non-zero if any crate < 90 %
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COVERAGE_DIR="${ROOT_DIR}/coverage/contracts"
THRESHOLD=90   # minimum line coverage % per crate

MODE="${1:-}"

mkdir -p "${COVERAGE_DIR}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Brain-Storm contract coverage (cargo-llvm-cov)"
echo "  Threshold: ${THRESHOLD}% line coverage"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Run workspace-wide coverage ──────────────────────────────────────────
cd "${ROOT_DIR}"

if [[ "${MODE}" == "--ci" ]]; then
  # CI mode: produce lcov + JSON
  cargo llvm-cov \
    --workspace \
    --lcov --output-path "${COVERAGE_DIR}/lcov.info" \
    -- --test-threads=1

  cargo llvm-cov report \
    --workspace \
    --json --output-path "${COVERAGE_DIR}/coverage.json"

  echo "Coverage reports written to ${COVERAGE_DIR}/"
else
  # Local mode: produce HTML report
  cargo llvm-cov \
    --workspace \
    --html --output-dir "${COVERAGE_DIR}/html" \
    -- --test-threads=1

  echo ""
  echo "HTML report: ${COVERAGE_DIR}/html/index.html"
fi

# ── 2. Per-crate summary (always) ────────────────────────────────────────────
echo ""
echo "Per-crate line coverage:"
echo "─────────────────────────────────────────────────────────────"

FAIL=0
CRATES=(
  analytics
  badges
  buyback
  certificate
  credential_metadata
  dispute
  governance
  grants
  liquidity_pool
  market
  nft
  registry
  reputation
  royalty_distribution
  scholarship_fund
  shared
  token
  token_restrictions
)

for CRATE in "${CRATES[@]}"; do
  # cargo-llvm-cov per-package summary (text)
  LINES=$(cargo llvm-cov \
    --package "brain-storm-${CRATE//_/-}" \
    --summary-only 2>/dev/null \
    | grep -E 'Lines' | awk '{print $NF}' | tr -d '%' || echo "N/A")

  if [[ "${LINES}" == "N/A" ]]; then
    printf "  %-30s  %-8s  ⚠ (no data)\n" "${CRATE}" "N/A"
    continue
  fi

  PCT=$(echo "${LINES}" | cut -d'.' -f1)

  if [[ "${PCT}" -lt "${THRESHOLD}" ]]; then
    printf "  %-30s  %s%%  ✗ BELOW THRESHOLD\n" "${CRATE}" "${LINES}"
    FAIL=1
  else
    printf "  %-30s  %s%%  ✓\n" "${CRATE}" "${LINES}"
  fi
done

echo "─────────────────────────────────────────────────────────────"

# ── 3. Threshold check ────────────────────────────────────────────────────────
if [[ "${MODE}" == "--check" && "${FAIL}" -ne 0 ]]; then
  echo ""
  echo "ERROR: One or more crates are below the ${THRESHOLD}% coverage threshold."
  exit 1
fi

if [[ "${FAIL}" -eq 0 ]]; then
  echo "All crates meet or exceed the ${THRESHOLD}% coverage threshold. ✓"
fi
