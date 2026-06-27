#!/usr/bin/env bash
# Bootstrap ELK stack: apply ILM policy, index template, and Kibana saved objects.
set -euo pipefail

ES_HOST="${ELASTICSEARCH_HOST:-http://localhost:9200}"
KIBANA_HOST="${KIBANA_HOST:-http://localhost:5601}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/../infra/logging"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

wait_for_service() {
  local url="$1" name="$2" attempts=0 max=30
  log "Waiting for $name at $url..."
  until curl -sf "$url" > /dev/null 2>&1; do
    attempts=$((attempts + 1))
    [ "$attempts" -ge "$max" ] && { log "ERROR: $name not reachable after ${max} attempts"; exit 1; }
    sleep 5
  done
  log "$name is ready."
}

wait_for_service "$ES_HOST/_cluster/health" "Elasticsearch"
wait_for_service "$KIBANA_HOST/api/status" "Kibana"

log "Applying ILM retention policy..."
curl -sf -X PUT "$ES_HOST/_ilm/policy/brain-storm-logs-policy" \
  -H 'Content-Type: application/json' \
  -d @"$INFRA_DIR/elasticsearch/ilm-policy.json"

log "Applying index template..."
curl -sf -X PUT "$ES_HOST/_index_template/brain-storm-logs" \
  -H 'Content-Type: application/json' \
  -d @"$INFRA_DIR/elasticsearch/index-template.json"

log "Importing Kibana saved objects (dashboards & searches)..."
curl -sf -X POST "$KIBANA_HOST/api/saved_objects/_import?overwrite=true" \
  -H 'kbn-xsrf: true' \
  --form file=@"$INFRA_DIR/kibana/saved-objects/log-search-dashboards.ndjson"

log "Done. ELK stack is configured."
log "  Kibana:        $KIBANA_HOST"
log "  Elasticsearch: $ES_HOST"
