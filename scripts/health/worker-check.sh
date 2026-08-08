#!/usr/bin/env bash
# FC-07: Redis capacity planning — worker health-check
# Usage: REDIS_URL=redis://... bash scripts/health/worker-check.sh
#
# Checks:
#   1. Redis ping (connectivity)
#   2. Redis memory usage — alerts at ≥80% of Upstash free-tier limit (256 MB)
#
# Exit codes:
#   0  — all checks passed
#   1  — Redis unreachable
#   2  — Redis memory usage ≥ 80%

set -euo pipefail

UPSTASH_FREE_TIER_BYTES=$((256 * 1024 * 1024))   # 256 MB
ALERT_THRESHOLD=80                                 # percent

REDIS_URL="${REDIS_URL:-redis://localhost:6379}"

# ---------------------------------------------------------------------------
# Helper: run a Redis command via redis-cli (or redis-cli embedded in URL)
# ---------------------------------------------------------------------------
redis_cmd() {
  redis-cli -u "$REDIS_URL" "$@" 2>/dev/null
}

echo "=== Redis Worker Health Check ==="
echo "Timestamp : $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Redis URL : ${REDIS_URL//:*@/:***@}"   # mask credentials

# ---------------------------------------------------------------------------
# 1. Ping
# ---------------------------------------------------------------------------
echo ""
echo "--- [1/2] Connectivity ---"
if redis_cmd PING | grep -qi "PONG"; then
  echo "PING: OK"
else
  echo "PING: FAILED — Redis is unreachable"
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Memory / capacity
# ---------------------------------------------------------------------------
echo ""
echo "--- [2/2] Capacity ---"

MEMORY_INFO="$(redis_cmd INFO memory)"

USED_MEMORY=$(echo "$MEMORY_INFO" | grep -m1 "^used_memory:" | tr -d $'\r' | cut -d: -f2 || true)
MAX_MEMORY=$(echo  "$MEMORY_INFO" | grep -m1 "^maxmemory:"   | tr -d $'\r' | cut -d: -f2 || true)

if [[ -z "$USED_MEMORY" ]]; then
  echo "ERROR: could not parse used_memory from Redis INFO"
  exit 1
fi

# When maxmemory == 0 Redis has no hard cap; use Upstash free-tier limit instead.
if [[ "$MAX_MEMORY" == "0" || -z "$MAX_MEMORY" ]]; then
  MAX_MEMORY=$UPSTASH_FREE_TIER_BYTES
  echo "maxmemory not set — using Upstash free-tier limit (${UPSTASH_FREE_TIER_BYTES} bytes)"
fi

USED_MB=$(echo "scale=2; $USED_MEMORY / 1048576" | bc)
MAX_MB=$(echo  "scale=2; $MAX_MEMORY  / 1048576" | bc)

# Integer percentage (rounded, consistent with ≥80 threshold check)
PCT=$(echo "$USED_MEMORY $MAX_MEMORY" | awk '{printf "%.0f", ($1/$2)*100}')

echo "Used  : ${USED_MB} MB"
echo "Limit : ${MAX_MB} MB"
echo "Usage : ${PCT}%"

if (( PCT >= ALERT_THRESHOLD )); then
  echo ""
  echo "WARNING: Redis usage is at ${PCT}% — approaching Upstash free-tier limits!"
  echo "ACTION : Investigate key eviction policy, purge stale queues, or upgrade tier."
  exit 2
else
  echo "Status: OK (below ${ALERT_THRESHOLD}% threshold)"
fi
