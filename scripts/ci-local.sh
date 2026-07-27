#!/bin/bash
# Run CI checks locally before pushing

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔍 Running CI checks locally...${NC}"

# Check Rust installation
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Rust not found. Please install Rust first.${NC}"
    exit 1
fi

# Run fmt
echo -e "${YELLOW}📝 Checking formatting...${NC}"
cargo fmt --all -- --check
echo -e "${GREEN}✅ Formatting check passed${NC}"

# Run clippy
echo -e "${YELLOW}🔎 Running clippy...${NC}"
cargo clippy --all-targets --all-features -- -D warnings
echo -e "${GREEN}✅ Clippy check passed${NC}"

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
cargo test --workspace --verbose
echo -e "${GREEN}✅ Tests passed${NC}"

# Build WASM
echo -e "${YELLOW}🔨 Building WASM...${NC}"
cargo build --target wasm32-unknown-unknown --release
echo -e "${GREEN}✅ Build passed${NC}"

echo -e "${GREEN}🎉 All CI checks passed locally!${NC}"
