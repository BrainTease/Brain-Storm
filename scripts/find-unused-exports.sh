#!/bin/bash
# Find unused exports in packages/sdk

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Unused Exports Audit${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

SDK_PATH="./packages/sdk"
if [ ! -d "$SDK_PATH" ]; then
    SDK_PATH="./packages/shared"
fi
if [ ! -d "$SDK_PATH" ]; then
    SDK_PATH="./packages/types"
fi

echo -e "${GREEN}✅ Using SDK path: $SDK_PATH${NC}"
echo ""

# Find all exported items
echo -e "${YELLOW}📋 Finding all exports in $SDK_PATH...${NC}"

# Extract all export names
find "$SDK_PATH" -name "*.ts" -type f -exec grep -E "^(export )?(const|function|class|interface|type|enum|let|var)" {} \; 2>/dev/null | \
  sed -E 's/^(export )?(const|function|class|interface|type|enum|let|var) ([a-zA-Z_][a-zA-Z0-9_]*).*/\3/' | sort -u > /tmp/all_exports.txt

TOTAL_EXPORTS=$(wc -l < /tmp/all_exports.txt)
echo -e "  ${GREEN}Found $TOTAL_EXPORTS total exports${NC}"

# Check each export for usage outside the SDK
echo ""
echo -e "${YELLOW}📋 Checking for unused exports...${NC}"

USED_EXPORTS=()
UNUSED_EXPORTS=()

while read -r export_name; do
    if [ -z "$export_name" ]; then
        continue
    fi
    
    # Count usage outside the SDK directory
    USAGE_COUNT=$(grep -r "$export_name" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
        --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.next 2>/dev/null | \
        grep -v "$SDK_PATH" | \
        grep -v "node_modules" | \
        wc -l)
    
    if [ "$USAGE_COUNT" -eq 0 ]; then
        UNUSED_EXPORTS+=("$export_name")
        echo -e "  ${RED}❌ Unused export: $export_name${NC}"
    else
        USED_EXPORTS+=("$export_name")
    fi
done < /tmp/all_exports.txt

TOTAL_UNUSED=${#UNUSED_EXPORTS[@]}
TOTAL_USED=${#USED_EXPORTS[@]}

echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "  ${GREEN}Used exports: $TOTAL_USED${NC}"
echo -e "  ${RED}Unused exports: $TOTAL_UNUSED${NC}"

if [ $TOTAL_UNUSED -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Unused exports to remove:${NC}"
    for export_name in "${UNUSED_EXPORTS[@]}"; do
        echo "  - $export_name"
    done
fi

echo ""
echo -e "${GREEN}✅ Audit complete!${NC}"
