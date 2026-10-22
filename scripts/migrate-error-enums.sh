#!/bin/bash

# Script to help migrate error enums to use shared errors
echo "🔍 Scanning for error enum definitions..."

# Find all error enums
find contracts/ -name "*.rs" -exec grep -l "enum.*Error" {} \; | while read -r file; do
    echo "📄 Found error enum in: $file"
    
    # Check if it's using shared errors
    if ! grep -q "SharedError" "$file"; then
        echo "  ⚠️  Not using shared errors - needs migration"
    else
        echo "  ✅ Already using shared errors"
    fi
done

echo ""
echo "📋 Migration status:"
echo "  Total files with error enums: $(find contracts/ -name "*.rs" -exec grep -l "enum.*Error" {} \; | wc -l)"
echo "  Files using shared errors: $(find contracts/ -name "*.rs" -exec grep -l "SharedError" {} \; | wc -l)"
