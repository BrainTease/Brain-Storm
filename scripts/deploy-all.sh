#!/usr/bin/env bash
# Deploy all Brain-Storm contracts to a given network.
# Usage: ./scripts/deploy-all.sh [testnet|mainnet]
set -euo pipefail

NETWORK=${1:-testnet}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/deploy-all-$(date +%Y%m%d-%H%M%S).log"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

if [[ ! "$NETWORK" =~ ^(testnet|mainnet)$ ]]; then
    echo "Error: NETWORK must be 'testnet' or 'mainnet'" >&2
    exit 1
fi

if [ -z "${STELLAR_SECRET_KEY:-}" ]; then
    echo "Error: STELLAR_SECRET_KEY environment variable not set" >&2
    exit 1
fi

CONTRACTS=(
    analytics
    token
    shared
    certificate
    governance
    credential_metadata
    reputation
    buyback
    liquidity_pool
    grants
)

log "Starting deployment to $NETWORK"
log "Log file: $LOG_FILE"
DEPLOYED=0
FAILED=0

for contract in "${CONTRACTS[@]}"; do
    log "Deploying $contract..."
    if "$SCRIPT_DIR/deploy.sh" "$NETWORK" "$contract" >> "$LOG_FILE" 2>&1; then
        log "  ✓ $contract deployed"
        DEPLOYED=$((DEPLOYED + 1))
    else
        log "  ✗ $contract FAILED"
        FAILED=$((FAILED + 1))
    fi
done

log "---"
log "Deployment complete: $DEPLOYED succeeded, $FAILED failed"

if [ "$FAILED" -gt 0 ]; then
    log "Some contracts failed to deploy. Check $LOG_FILE for details."
    exit 1
fi
