#!/usr/bin/env bash
# Initialize deployed contracts with an admin address after deployment.
# Usage: ./scripts/init-contracts.sh [testnet|mainnet] <admin_address>
set -euo pipefail

NETWORK=${1:-testnet}
ADMIN_ADDRESS=${2:-}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYED_FILE="$SCRIPT_DIR/deployed-contracts.json"

if [ -z "$ADMIN_ADDRESS" ]; then
    echo "Usage: $0 [testnet|mainnet] <admin_address>" >&2
    exit 1
fi

if [ -z "${STELLAR_SECRET_KEY:-}" ]; then
    echo "Error: STELLAR_SECRET_KEY environment variable not set" >&2
    exit 1
fi

if [ ! -f "$DEPLOYED_FILE" ]; then
    echo "Error: $DEPLOYED_FILE not found" >&2
    exit 1
fi

log() { echo "[$(date '+%H:%M:%S')] $*"; }
invoke_contract() {
    local contract_id="$1"
    local fn_name="$2"
    shift 2
    stellar contract invoke \
        --id "$contract_id" \
        --source "$STELLAR_SECRET_KEY" \
        --network "$NETWORK" \
        -- "$fn_name" "$@"
}

get_contract_id() {
    jq -r ".\"$NETWORK\".\"$1\" // empty" "$DEPLOYED_FILE"
}

log "Initializing contracts on $NETWORK with admin $ADMIN_ADDRESS"

# Initialize each contract that exposes an `initialize` function
CONTRACTS_WITH_INIT=(analytics token shared certificate governance credential_metadata reputation buyback liquidity_pool grants)

for contract in "${CONTRACTS_WITH_INIT[@]}"; do
    contract_id=$(get_contract_id "$contract")
    if [ -z "$contract_id" ]; then
        log "  skip: $contract (not in deployed-contracts.json)"
        continue
    fi

    log "Initializing $contract ($contract_id)..."
    if invoke_contract "$contract_id" initialize --admin "$ADMIN_ADDRESS" &>/dev/null; then
        log "  ✓ $contract initialized"
    else
        log "  ~ $contract: initialize call failed (may already be initialized)"
    fi
done

log "Initialization complete."
