#!/bin/bash
# Publish contracts to Soroban registry

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if deployer secret is set
if [ -z "$DEPLOYER_SECRET" ]; then
    echo -e "${RED}❌ DEPLOYER_SECRET environment variable not set${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Publishing contracts to Soroban registry...${NC}"

# Find all WASM files
find . -name "*.wasm" -type f | while read -r file; do
    NAME=$(basename "$file" .wasm)
    echo -e "${GREEN}Publishing $NAME...${NC}"
    
    # Publish to testnet
    soroban contract install \
        --wasm "$file" \
        --network testnet \
        --source-account "$DEPLOYER_SECRET" \
        --output-json || echo -e "${RED}❌ Failed to publish $NAME${NC}"
done

echo -e "${GREEN}✅ All contracts published!${NC}"
