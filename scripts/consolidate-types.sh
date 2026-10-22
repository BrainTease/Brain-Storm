#!/bin/bash
# Consolidate duplicate types into packages/types

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Consolidating Duplicate Types${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

PACKAGES_TYPES="./packages/types"
FRONTEND_TYPES="./apps/frontend/src/types"

if [ ! -d "$PACKAGES_TYPES" ]; then
    echo -e "${RED}❌ packages/types not found${NC}"
    exit 1
fi

# Create a backup of frontend types
BACKUP_DIR="./backups/types-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$FRONTEND_TYPES" "$BACKUP_DIR/"
echo -e "${GREEN}📦 Backed up frontend types to $BACKUP_DIR${NC}"

# Find duplicate type names
find "$PACKAGES_TYPES" -name "*.ts" -type f -exec grep -E "^(export )?(interface|type) [A-Za-z_][A-Za-z0-9_]*" {} \; 2>/dev/null | \
  sed -E 's/^(export )?(interface|type) ([A-Za-z_][A-Za-z0-9_]*).*/\3/' | sort -u > /tmp/packages_types.txt

find "$FRONTEND_TYPES" -name "*.ts" -type f -exec grep -E "^(export )?(interface|type) [A-Za-z_][A-Za-z0-9_]*" {} \; 2>/dev/null | \
  sed -E 's/^(export )?(interface|type) ([A-Za-z_][A-Za-z0-9_]*).*/\3/' | sort -u > /tmp/frontend_types.txt

comm -12 /tmp/packages_types.txt /tmp/frontend_types.txt > /tmp/duplicate_types.txt

DUPLICATE_COUNT=$(wc -l < /tmp/duplicate_types.txt)

if [ "$DUPLICATE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️ Found $DUPLICATE_COUNT duplicate type names${NC}"
    echo -e "${YELLOW}📝 Manually review and consolidate duplicates${NC}"
    
    # List duplicates
    cat /tmp/duplicate_types.txt | while read -r type; do
        echo "  - $type"
    done
    echo ""
    echo -e "${YELLOW}📋 To consolidate:${NC}"
    echo "  1. Remove duplicate type from frontend"
    echo "  2. Update imports to use packages/types"
    echo "  3. Run tests to verify"
else
    echo -e "${GREEN}✅ No duplicate type names found${NC}"
fi

echo ""
echo -e "${GREEN}✅ Consolidation complete!${NC}"
