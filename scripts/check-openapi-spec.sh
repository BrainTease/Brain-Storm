#!/usr/bin/env bash
# scripts/check-openapi-spec.sh
# CI check: verifies the committed openapi.json is up to date with the backend.
# Fails if the current source generates a different spec than the committed one.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../apps/backend" && pwd)"
COMMITTED_SPEC="$BACKEND_DIR/openapi.json"
GENERATED_SPEC="$BACKEND_DIR/openapi.generated.json"

if [ ! -f "$COMMITTED_SPEC" ]; then
  echo "ERROR: $COMMITTED_SPEC not found. Run './scripts/generate-sdk.sh' to create it."
  exit 1
fi

echo "==> Building backend..."
cd "$BACKEND_DIR"
npm run build

echo "==> Generating fresh OpenAPI spec..."
EXPORT_OPENAPI=true node dist/main --export-openapi 2>/dev/null
mv "$BACKEND_DIR/openapi.json" "$GENERATED_SPEC"
# restore the committed spec
cp "$COMMITTED_SPEC" "$BACKEND_DIR/openapi.json"

echo "==> Comparing specs..."
if diff -q "$COMMITTED_SPEC" "$GENERATED_SPEC" > /dev/null 2>&1; then
  echo "✓ OpenAPI spec is up to date."
  rm -f "$GENERATED_SPEC"
  exit 0
else
  echo "✗ OpenAPI spec is out of date. Please run './scripts/generate-sdk.sh' and commit the result."
  diff "$COMMITTED_SPEC" "$GENERATED_SPEC" || true
  rm -f "$GENERATED_SPEC"
  exit 1
fi
