#!/bin/bash
# Audit all eslint-disable usage

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  eslint-disable Usage Audit${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# File to track findings
REPORT_FILE="eslint-disable-audit.md"
echo "# eslint-disable Audit Report" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Findings" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Find all eslint-disable comments
echo -e "${YELLOW}📋 Finding all eslint-disable comments...${NC}"
echo "| File | Line | Rule | Reason | Justified? |" >> "$REPORT_FILE"
echo "|------|------|------|--------|------------|" >> "$REPORT_FILE"

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/.next/*" \
  -not -path "*/coverage/*" \
  -exec grep -Hn "eslint-disable" {} \; 2>/dev/null | while read -r line; do
    # Extract file, line, and the disable comment
    file=$(echo "$line" | cut -d: -f1)
    line_num=$(echo "$line" | cut -d: -f2)
    content=$(echo "$line" | cut -d: -f3-)
    
    # Extract the rule being disabled
    rule=$(echo "$content" | sed -E 's/.*eslint-disable[[:space:]]+([a-zA-Z@/-]+).*/\1/')
    if [ -z "$rule" ] || [ "$rule" = "$content" ]; then
      rule="all"
    fi
    
    # Extract reason if there is a comment
    reason=$(echo "$content" | sed -E 's/.*\/\/[[:space:]]*([^ ]+.*)/\1/')
    if [ -z "$reason" ] || [ "$reason" = "$content" ]; then
      reason="No reason provided"
    fi
    
    echo "| $file | $line_num | $rule | $reason | ❓ |" >> "$REPORT_FILE"
    echo -e "  ${YELLOW}⚠️ $file:$line_num - eslint-disable $rule${NC}"
done

echo "" >> "$REPORT_FILE"
echo "## Recommendations" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "1. Review each disable and add justification" >> "$REPORT_FILE"
echo "2. Remove unnecessary disables" >> "$REPORT_FILE"
echo "3. Replace with more specific rules where possible" >> "$REPORT_FILE"
echo "4. Add comments explaining why each disable is needed" >> "$REPORT_FILE"

echo ""
echo -e "${GREEN}✅ Audit complete! Report saved to $REPORT_FILE${NC}"
