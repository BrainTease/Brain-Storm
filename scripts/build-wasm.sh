#!/usr/bin/env bash
# Build WASM contracts locally for development/testing.
# Builds every crate under contracts/ that contains a Cargo.toml.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔨 Building WASM contracts...${NC}"

BUILT=0
FAILED=0

for contract_dir in "$ROOT_DIR"/contracts/*/; do
    contract_name=$(basename "$contract_dir")

    # Skip entries that are not Rust crates
    if [ ! -f "$contract_dir/Cargo.toml" ]; then
        continue
    fi

    echo -e "${GREEN}Building $contract_name...${NC}"
    if cargo build \
        --manifest-path "$contract_dir/Cargo.toml" \
        --target wasm32-unknown-unknown \
        --release; then
        BUILT=$((BUILT + 1))
    else
        echo -e "${RED}❌ Failed to build $contract_name${NC}" >&2
        FAILED=$((FAILED + 1))
    fi
done

if [ "$BUILT" -eq 0 ] && [ "$FAILED" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No Rust contracts found under contracts/${NC}"
    exit 0
fi

if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}❌ $FAILED contract(s) failed to build.${NC}" >&2
    exit 1
fi

echo -e "${GREEN}✅ All $BUILT WASM contract(s) built!${NC}"

# Compute checksums
echo -e "${YELLOW}📋 Computing checksums...${NC}"
CHECKSUMS_FILE="$ROOT_DIR/CHECKSUMS.md"
{
    echo "# WASM Contract Checksums"
    echo ""
    echo "| Contract | Size | SHA256 |"
    echo "|----------|------|--------|"
} > "$CHECKSUMS_FILE"

find "$ROOT_DIR/target/wasm32-unknown-unknown/release" \
    -maxdepth 1 -name "*.wasm" -type f \
    ! -path "*/deps/*" 2>/dev/null | sort | while read -r file; do
    NAME=$(basename "$file" .wasm)
    SIZE=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null)
    HASH=$(sha256sum "$file" | cut -d' ' -f1)
    echo "| $NAME | $SIZE bytes | \`$HASH\` |" >> "$CHECKSUMS_FILE"
done

echo -e "${GREEN}✅ Checksums saved to CHECKSUMS.md${NC}"
