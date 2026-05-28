#!/usr/bin/env bash
set -euo pipefail

NETWORK=${1:-testnet}
CONTRACT_NAME=${2:-analytics}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Validate inputs
if [[ ! "$NETWORK" =~ ^(testnet|mainnet)$ ]]; then
    echo "Error: NETWORK must be 'testnet' or 'mainnet'" >&2
    exit 1
fi

if [[ ! -f "$SCRIPT_DIR/../contracts/$CONTRACT_NAME/Cargo.toml" ]]; then
    echo "Error: Contract '$CONTRACT_NAME' not found in contracts/" >&2
    exit 1
fi

# Check if STELLAR_SECRET_KEY is set
if [ -z "${STELLAR_SECRET_KEY:-}" ]; then
    echo "Error: STELLAR_SECRET_KEY environment variable not set" >&2
    exit 1
fi

WASM_FILE="target/wasm32-unknown-unknown/release/brain_storm_${CONTRACT_NAME}.wasm"

if [ ! -f "$WASM_FILE" ]; then
    echo "Error: WASM file not found at $WASM_FILE. Run ./scripts/build.sh first." >&2
    exit 1
fi

echo "[$(date '+%H:%M:%S')] Deploying $CONTRACT_NAME to $NETWORK..."
DEPLOY_START=$(date +%s)

CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_FILE" \
  --source "$STELLAR_SECRET_KEY" \
  --network "$NETWORK" 2>&1 | grep -oP '(?<=Contract ID: )[A-Z0-9]+' || echo "")

if [ -z "$CONTRACT_ID" ]; then
    echo "Error: Failed to deploy contract" >&2
    exit 1
fi

DEPLOY_END=$(date +%s)
echo "[$(date '+%H:%M:%S')] Deployment successful! (took $((DEPLOY_END - DEPLOY_START))s)"
echo "Contract ID: $CONTRACT_ID"

# Update deployed-contracts.json (with backup for rollback support)
if [ -f "$SCRIPT_DIR/deployed-contracts.json" ]; then
    cp "$SCRIPT_DIR/deployed-contracts.json" "$SCRIPT_DIR/deployed-contracts.backup.json"
    tmp_file=$(mktemp)
    jq ".\"$NETWORK\".\"$CONTRACT_NAME\" = \"$CONTRACT_ID\"" "$SCRIPT_DIR/deployed-contracts.json" > "$tmp_file"
    mv "$tmp_file" "$SCRIPT_DIR/deployed-contracts.json"
    echo "Updated deployed-contracts.json (backup saved to deployed-contracts.backup.json)"
fi
