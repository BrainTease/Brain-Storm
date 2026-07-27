#!/usr/bin/env bash
# Roll back a contract deployment by restoring a previously saved contract ID.
# Usage: ./scripts/rollback-deployment.sh [testnet|mainnet] <contract_name>
#
# How rollback works:
#   This script restores the previous contract ID in deployed-contracts.json.
#   A true WASM rollback (reverting on-chain state) requires the contract itself
#   to expose `execute_upgrade` with the previous WASM hash via the shared
#   upgrade module — see contracts/shared/src/upgrade.rs for the mechanism.
set -euo pipefail

NETWORK=${1:-testnet}
CONTRACT_NAME=${2:-}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYED_FILE="$SCRIPT_DIR/deployed-contracts.json"
BACKUP_FILE="$SCRIPT_DIR/deployed-contracts.backup.json"

if [ -z "$CONTRACT_NAME" ]; then
    echo "Usage: $0 [testnet|mainnet] <contract_name>" >&2
    exit 1
fi

if [ ! -f "$DEPLOYED_FILE" ]; then
    echo "Error: $DEPLOYED_FILE not found" >&2
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: No backup file found at $BACKUP_FILE" >&2
    echo "  Backup is created automatically before each deploy." >&2
    exit 1
fi

log() { echo "[$(date '+%H:%M:%S')] $*"; }

CURRENT_ID=$(jq -r ".\"$NETWORK\".\"$CONTRACT_NAME\" // empty" "$DEPLOYED_FILE")
PREVIOUS_ID=$(jq -r ".\"$NETWORK\".\"$CONTRACT_NAME\" // empty" "$BACKUP_FILE")

if [ -z "$PREVIOUS_ID" ]; then
    echo "Error: No previous deployment found for '$CONTRACT_NAME' on '$NETWORK'" >&2
    exit 1
fi

log "Rolling back $CONTRACT_NAME on $NETWORK"
log "  Current ID : $CURRENT_ID"
log "  Previous ID: $PREVIOUS_ID"

# Restore previous ID in deployed-contracts.json
tmp_file=$(mktemp)
jq ".\"$NETWORK\".\"$CONTRACT_NAME\" = \"$PREVIOUS_ID\"" "$DEPLOYED_FILE" > "$tmp_file"
mv "$tmp_file" "$DEPLOYED_FILE"

log "Rolled back $CONTRACT_NAME to $PREVIOUS_ID"
log ""
log "NOTE: To revert the on-chain WASM, call execute_upgrade on the contract"
log "      with the previous WASM hash via the governance upgrade mechanism."
