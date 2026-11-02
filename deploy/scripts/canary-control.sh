#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Canary Deployment Controller Script
# Usage:
#   ./deploy/scripts/canary-control.sh status
#   ./deploy/scripts/canary-control.sh set-weight <stable_pct> <canary_pct>
#   ./deploy/scripts/canary-control.sh promote
#   ./deploy/scripts/canary-control.sh rollback
# ============================================================================

CONF_FILE="deploy/nginx/nginx.canary.conf"
ROUTER_CONTAINER="postcomposer-canary-router"

cmd="${1:-status}"

case "$cmd" in
  status)
    echo "=== Probing 20 requests through Canary Router (http://localhost:8080/api/v1/system/version) ==="
    stable_count=0
    canary_count=0
    for i in $(seq 1 20); do
      track=$(curl -s http://localhost:8080/api/v1/system/version | grep -o '"track":"[^"]*"' | cut -d'"' -f4 || echo "unreachable")
      if [ "$track" = "canary" ]; then
        canary_count=$((canary_count + 1))
      elif [ "$track" = "stable" ]; then
        stable_count=$((stable_count + 1))
      fi
    done
    echo "Stable responses : $stable_count / 20"
    echo "Canary responses : $canary_count / 20"
    ;;

  set-weight)
    stable_pct="${2:-90}"
    canary_pct="${3:-10}"
    sed -i.bak -E "s/[0-9]+%([[:space:]]+backend_stable;)/${stable_pct}%\1/" "$CONF_FILE"
    sed -i.bak -E "s/[0-9]+%([[:space:]]+backend_canary;)/${canary_pct}%\1/" "$CONF_FILE"
    rm -f "${CONF_FILE}.bak"
    docker exec "$ROUTER_CONTAINER" nginx -s reload
    echo "Updated traffic split: Stable=${stable_pct}%, Canary=${canary_pct}%"
    ;;

  promote)
    ./deploy/scripts/canary-control.sh set-weight 0 100
    echo "Canary promoted to 100% of production traffic."
    ;;

  rollback)
    sed -i.bak -E "s/default[[:space:]]+\$canary_upstream;/default  backend_stable;/" "$CONF_FILE"
    rm -f "${CONF_FILE}.bak"
    docker exec "$ROUTER_CONTAINER" nginx -s reload
    echo "Instant rollback complete: 100% of traffic routed to backend_stable."
    ;;

  *)
    echo "Usage: $0 {status|set-weight <stable%> <canary%>|promote|rollback}"
    exit 1
    ;;
esac
