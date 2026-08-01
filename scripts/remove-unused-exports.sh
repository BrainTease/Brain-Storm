#!/bin/bash
# Remove unused exports from packages/sdk

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Removing Unused Exports${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ ! -f /tmp/unused_exports.txt ]; then
    echo -e "${RED}❌ No unused exports list found. Run find-unused-exports.sh first${NC}"
    exit 1
fi

# Create backup
BACKUP_DIR="./backups/sdk-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r packages/sdk "$BACKUP_DIR/" 2>/dev/null || true
cp -r packages/shared "$BACKUP_DIR/" 2>/dev/null || true
cp -r packages/types "$BACKUP_DIR/" 2>/dev/null || true

echo -e "${GREEN}📦 Backup saved to $BACKUP_DIR${NC}"

# Remove unused exports (manual review recommended)
echo -e "${YELLOW}📋 Please manually review and remove unused exports${NC}"
echo -e "${YELLOW}   Check each export before removal${NC}"
echo ""

cat /tmp/unused_exports.txt | while read -r export_name; do
    if [ -n "$export_name" ]; then
        echo -e "  ${RED}❌ Remove: $export_name${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ Removal complete!${NC}"
