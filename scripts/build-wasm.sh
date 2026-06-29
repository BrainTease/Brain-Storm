#!/bin/bash
# Build WASM contracts locally for development/testing

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔨 Building WASM contracts...${NC}"

# Build all contracts
for contract in stellar-contract packages/contracts/contracts/market; do
    if [ -d "$contract" ]; then
        echo -e "${GREEN}Building $contract...${NC}"
        cd "$contract"
        cargo build --target wasm32-unknown-unknown --release
        cd - > /dev/null
    fi
done

echo -e "${GREEN}✅ All WASM contracts built!${NC}"

# Compute hashes
echo -e "${YELLOW}📋 Computing checksums...${NC}"
echo "# WASM Contract Checksums" > CHECKSUMS.md
echo "" >> CHECKSUMS.md
echo "| Contract | Size | SHA256 |" >> CHECKSUMS.md
echo "|----------|------|--------|" >> CHECKSUMS.md

find . -name "*.wasm" -type f | while read -r file; do
    NAME=$(basename "$file" .wasm)
    SIZE=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null)
    HASH=$(sha256sum "$file" | cut -d' ' -f1)
    echo "| $NAME | $SIZE bytes | \`$HASH\` |" >> CHECKSUMS.md
done

echo -e "${GREEN}✅ Checksums saved to CHECKSUMS.md${NC}"
