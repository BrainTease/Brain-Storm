#!/bin/bash
# Audit import ordering in the monorepo

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Import Ordering Audit${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check for import issues
echo -e "${YELLOW}📋 Checking import ordering...${NC}"

VIOLATIONS=0

find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/.next/*" \
  -not -path "*/coverage/*" \
  | while read -r file; do
    # Check for imports that might be out of order
    if grep -q "import.*from.*\\.\\./" "$file"; then
      # Check relative imports after absolute imports
      if grep -q "import.*from.*@/" "$file"; then
        # Check if relative imports come before absolute
        if grep -B 10 "import.*from.*\\.\\./" "$file" | grep -q "import.*from.*@/"; then
          echo -e "  ${RED}❌ $file: Mixed import ordering${NC}"
          VIOLATIONS=$((VIOLATIONS + 1))
        fi
      fi
    fi
  done

if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}✅ No import ordering issues found${NC}"
else
  echo -e "${RED}❌ Found $VIOLATIONS import ordering issues${NC}"
  echo -e "${YELLOW}Run ./scripts/fix-imports.sh to fix${NC}"
fi

echo ""
echo -e "${GREEN}✅ Audit complete!${NC}"
