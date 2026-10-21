#!/bin/bash
# Fix import ordering across the monorepo

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Fixing Import Ordering${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if eslint is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found${NC}"
    exit 1
fi

# Fix imports in TypeScript files
echo -e "${YELLOW}📝 Fixing imports in TypeScript files...${NC}"

find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/.next/*" \
  -not -path "*/coverage/*" \
  | while read -r file; do
    echo "  Fixing: $file"
    npx eslint --fix "$file" 2>/dev/null || true
  done

echo ""
echo -e "${GREEN}✅ Import ordering fixed!${NC}"
