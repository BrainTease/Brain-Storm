#!/usr/bin/env bash
# scripts/generate-sdk.sh
# Exports the OpenAPI spec from the backend and regenerates packages/sdk.
# Usage: ./scripts/generate-sdk.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/apps/backend"
SDK_DIR="$ROOT_DIR/packages/sdk"
SPEC_FILE="$BACKEND_DIR/openapi.json"

echo "==> Building backend..."
cd "$BACKEND_DIR"
npm run build

echo "==> Exporting OpenAPI spec to $SPEC_FILE..."
EXPORT_OPENAPI=true node dist/main --export-openapi

echo "==> Copying spec to SDK package..."
cp "$SPEC_FILE" "$SDK_DIR/openapi.json"

echo "==> SDK package is at $SDK_DIR"
echo "    Build it with: cd $SDK_DIR && npm run build"
echo "Done."
