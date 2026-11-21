#!/usr/bin/env bash
# Run cargo-audit and cargo-deny against the Rust workspace.
# Used as a local pre-commit enforcement step and in CI (contracts.yml).
#
# Usage:
#   ./scripts/rust-audit.sh          # check only (exit 1 on advisory/violation)
#   ./scripts/rust-audit.sh --install # install tools, then check

set -euo pipefail

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="${WORKSPACE_ROOT}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

install_tools() {
  if ! command -v cargo-audit &>/dev/null; then
    echo -e "${YELLOW}cargo-audit not found — installing...${NC}"
    cargo install cargo-audit --locked
  fi
  if ! command -v cargo-deny &>/dev/null; then
    echo -e "${YELLOW}cargo-deny not found — installing...${NC}"
    cargo install cargo-deny --locked
  fi
}

if [[ "${1:-}" == "--install" ]]; then
  install_tools
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Rust Security Audit (cargo-audit + cargo-deny)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

FAILED=0

# --- cargo audit ---
echo -e "${BLUE}[1/2] Running cargo audit...${NC}"
if command -v cargo-audit &>/dev/null; then
  if cargo audit --deny warnings 2>&1; then
    echo -e "${GREEN}  ✓ cargo audit passed${NC}"
  else
    echo -e "${RED}  ✗ cargo audit found advisories${NC}"
    FAILED=1
  fi
else
  echo -e "${YELLOW}  ⚠ cargo-audit not installed — skipping (run with --install to auto-install)${NC}"
fi

echo ""

# --- cargo deny ---
echo -e "${BLUE}[2/2] Running cargo deny...${NC}"
if command -v cargo-deny &>/dev/null; then
  if cargo deny check 2>&1; then
    echo -e "${GREEN}  ✓ cargo deny passed${NC}"
  else
    echo -e "${RED}  ✗ cargo deny found violations${NC}"
    FAILED=1
  fi
else
  echo -e "${YELLOW}  ⚠ cargo-deny not installed — skipping (run with --install to auto-install)${NC}"
fi

echo ""

if [[ $FAILED -ne 0 ]]; then
  echo -e "${RED}Audit failed. Review the output above and either fix the advisory${NC}"
  echo -e "${RED}or add a justified exception to deny.toml.${NC}"
  exit 1
else
  echo -e "${GREEN}All Rust security checks passed.${NC}"
fi
