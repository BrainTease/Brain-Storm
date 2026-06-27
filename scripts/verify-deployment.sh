#!/usr/bin/env bash
# Verify deployed contracts by invoking a read-only function on each.
# Usage: ./scripts/verify-deployment.sh [testnet|mainnet]
set -euo pipefail

NETWORK=${1:-testnet}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYED_FILE="$SCRIPT_DIR/deployed-contracts.json"

if [ ! -f "$DEPLOYED_FILE" ]; then
    echo "Error: $DEPLOYED_FILE not found" >&2
    exit 1
fi

if ! command -v stellar &>/dev/null; then
    echo "Error: 'stellar' CLI not found in PATH" >&2
    exit 1
fi

log() { echo "[$(date '+%H:%M:%S')] $*"; }
PASSED=0
FAILED=0

log "Verifying contracts on $NETWORK..."

# Read all contract IDs for this network
contracts=$(jq -r ".\"$NETWORK\" | to_entries[] | [.key, .value] | @tsv" "$DEPLOYED_FILE" 2>/dev/null || true)

if [ -z "$contracts" ]; then
    echo "No contracts found for network '$NETWORK' in $DEPLOYED_FILE" >&2
    exit 1
fi

while IFS=$'\t' read -r contract_name contract_id; do
    [ -z "$contract_id" ] && continue

    log "Verifying $contract_name ($contract_id)..."

    # Attempt to fetch contract WASM — confirms contract exists on-chain
    if stellar contract info --id "$contract_id" --network "$NETWORK" &>/dev/null; then
        log "  ✓ $contract_name is live"
        PASSED=$((PASSED + 1))
    else
        log "  ✗ $contract_name NOT reachable"
        FAILED=$((FAILED + 1))
    fi
done <<< "$contracts"

log "---"
log "Verification: $PASSED passed, $FAILED failed"
[ "$FAILED" -gt 0 ] && exit 1 || exit 0
