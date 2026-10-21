#!/usr/bin/env bash
# Publish compiled contracts to the Stellar/Soroban registry.
# Requires: DEPLOYER_SECRET env var, stellar CLI, and wasm files built by build-wasm.sh.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WASM_DIR="$ROOT_DIR/target/wasm32-unknown-unknown/release"
NETWORK="${NETWORK:-testnet}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check required env var
if [ -z "${DEPLOYER_SECRET:-}" ]; then
    echo -e "${RED}❌ DEPLOYER_SECRET environment variable not set${NC}" >&2
    exit 1
fi

# Check stellar CLI is available
if ! command -v stellar &>/dev/null; then
    echo -e "${RED}❌ 'stellar' CLI not found in PATH. Install from https://github.com/stellar/stellar-cli/releases${NC}" >&2
    exit 1
fi

# Ensure wasm files are present
if [ ! -d "$WASM_DIR" ]; then
    echo -e "${RED}❌ WASM output directory not found: $WASM_DIR${NC}" >&2
    echo -e "${YELLOW}   Run ./scripts/build-wasm.sh (or ./scripts/build.sh) first.${NC}" >&2
    exit 1
fi

WASM_FILES=()
while IFS= read -r -d '' f; do
    WASM_FILES+=("$f")
done < <(find "$WASM_DIR" -maxdepth 1 -name "*.wasm" -type f ! -path "*/deps/*" -print0 2>/dev/null)

if [ "${#WASM_FILES[@]}" -eq 0 ]; then
    echo -e "${RED}❌ No .wasm files found in $WASM_DIR${NC}" >&2
    echo -e "${YELLOW}   Run ./scripts/build-wasm.sh (or ./scripts/build.sh) first.${NC}" >&2
    exit 1
fi

echo -e "${YELLOW}📦 Publishing ${#WASM_FILES[@]} contract(s) to Stellar registry (network: $NETWORK)...${NC}"

PUBLISHED=0
FAILED=0

for file in "${WASM_FILES[@]}"; do
    NAME=$(basename "$file" .wasm)
    echo -e "${GREEN}Publishing $NAME...${NC}"

    if stellar contract install \
        --wasm "$file" \
        --network "$NETWORK" \
        --source-account "$DEPLOYER_SECRET"; then
        PUBLISHED=$((PUBLISHED + 1))
    else
        echo -e "${RED}❌ Failed to publish $NAME${NC}" >&2
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo -e "${GREEN}✅ Published: $PUBLISHED | ${RED}Failed: $FAILED${NC}"
[ "$FAILED" -gt 0 ] && exit 1 || exit 0
