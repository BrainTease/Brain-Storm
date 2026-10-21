#!/bin/bash
# Find duplicate type definitions between packages/types and apps/frontend

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Duplicate Type Definitions Audit${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Locations to check
PACKAGES_TYPES="./packages/types"
FRONTEND_TYPES="./apps/frontend/src/types"

# Check if directories exist
if [ ! -d "$PACKAGES_TYPES" ]; then
    echo -e "${RED}❌ packages/types not found${NC}"
    exit 1
fi

if [ ! -d "$FRONTEND_TYPES" ]; then
    echo -e "${YELLOW}⚠️ apps/frontend/src/types not found${NC}"
    echo "Creating directory..."
    mkdir -p "$FRONTEND_TYPES"
fi

echo -e "${GREEN}✅ Found packages/types${NC}"
echo -e "${GREEN}✅ Found apps/frontend/src/types${NC}"
echo ""

# Find all type files in packages/types
echo -e "${YELLOW}📋 Types in packages/types:${NC}"
find "$PACKAGES_TYPES" -name "*.ts" -type f | while read -r file; do
    echo "  - $(basename "$file")"
done
echo ""

# Find all type files in frontend/types
echo -e "${YELLOW}📋 Types in frontend/types:${NC}"
find "$FRONTEND_TYPES" -name "*.ts" -type f 2>/dev/null | while read -r file; do
    echo "  - $(basename "$file")"
done
echo ""

# Compare interface/type names
echo -e "${YELLOW}📋 Comparing type names...${NC}"

# Extract all interface and type names from packages/types
find "$PACKAGES_TYPES" -name "*.ts" -type f -exec grep -E "^(export )?(interface|type) [A-Za-z_][A-Za-z0-9_]*" {} \; 2>/dev/null | \
  sed -E 's/^(export )?(interface|type) ([A-Za-z_][A-Za-z0-9_]*).*/\3/' | sort -u > /tmp/packages_types.txt

# Extract all interface and type names from frontend/types
find "$FRONTEND_TYPES" -name "*.ts" -type f -exec grep -E "^(export )?(interface|type) [A-Za-z_][A-Za-z0-9_]*" {} \; 2>/dev/null | \
  sed -E 's/^(export )?(interface|type) ([A-Za-z_][A-Za-z0-9_]*).*/\3/' | sort -u > /tmp/frontend_types.txt

# Find duplicates
comm -12 /tmp/packages_types.txt /tmp/frontend_types.txt > /tmp/duplicate_types.txt

DUPLICATE_COUNT=$(wc -l < /tmp/duplicate_types.txt)

if [ "$DUPLICATE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️ Found $DUPLICATE_COUNT duplicate type names:${NC}"
    cat /tmp/duplicate_types.txt | while read -r type; do
        echo -e "  ${RED}$type${NC}"
    done
else
    echo -e "${GREEN}✅ No duplicate type names found${NC}"
fi

echo ""
echo -e "${GREEN}✅ Audit complete!${NC}"
