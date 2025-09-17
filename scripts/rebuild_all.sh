#!/usr/bin/env bash
set -euo pipefail

# scripts/rebuild_all.sh
# Purpose: Automate a robust clean + rebuild of the TrafficJamz prod compose stack.
# - Stops and removes the stack
# - Optionally removes local images
# - Attempts to build server with host networking first (helps around apt/CA issues)
# - Falls back to non-host-network builds if the host-network option isn't supported
# - Builds client, brings the stack up, and prints status + logs
# - Captures output to logs/rebuild_all.log for later inspection

SCRIPTDIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOTDIR=$(cd "$SCRIPTDIR/.." && pwd)
LOGDIR="$ROOTDIR/logs"
LOGFILE="$LOGDIR/rebuild_all.log"
COMPOSE_FILE="$ROOTDIR/docker-compose.prod.yml"

mkdir -p "$LOGDIR"
rm -f "$LOGFILE"
exec > >(tee -a "$LOGFILE") 2>&1

echo "[rebuild_all] Starting at $(date)"

# Confirm environment
echo "[rebuild_all] Using compose file: $COMPOSE_FILE"
command -v docker >/dev/null 2>&1 || { echo "docker not found in PATH"; exit 1; }

# Step 0: Stop and remove current compose stack
echo "[rebuild_all] Bringing down existing compose stack (if any)"
docker compose -f "$COMPOSE_FILE" down --remove-orphans || true

# Remove specific images (non-fatal if absent)
echo "[rebuild_all] Removing existing trafficjamz images (if present)"
docker image rm trafficjamz-client trafficjamz-server || true

# Helper: attempt a build with optional extra args; if it fails, capture status
try_build() {
  local svc="$1"
  shift
  local args=("$@")
  echo "[rebuild_all] Building service: $svc with args: ${args[*]}"
  if docker compose -f "$COMPOSE_FILE" build --no-cache "${args[@]}" "$svc"; then
    echo "[rebuild_all] Build succeeded for $svc"
    return 0
  else
    echo "[rebuild_all] Build FAILED for $svc with args: ${args[*]}"
    return 1
  fi
}

# Step 1: Build server; try with host network first (works around some CA/mirror issues)
echo "[rebuild_all] Building server (try host-network first)"
if try_build server --progress=plain --network=host; then
  echo "[rebuild_all] Server built with host network"
else
  echo "[rebuild_all] Host-network build failed or not supported; trying without --network"
  if try_build server --progress=plain; then
    echo "[rebuild_all] Server built without host network"
  else
    echo "[rebuild_all] Server build failed. Dumping last 200 lines of docker build output from log and exiting"
    tail -n 200 "$LOGFILE" || true
    exit 1
  fi
fi

# Step 2: Build client
echo "[rebuild_all] Building client"
if try_build client --progress=plain; then
  echo "[rebuild_all] Client build succeeded"
else
  echo "[rebuild_all] Client build failed. See $LOGFILE for details"
  tail -n 200 "$LOGFILE" || true
  exit 1
fi

# Step 3: Start the full stack
echo "[rebuild_all] Starting compose stack"
docker compose -f "$COMPOSE_FILE" up -d

# Step 4: Status and quick logs
echo "[rebuild_all] Waiting 5s for services to initialize..."
sleep 5

echo "[rebuild_all] Compose ps:"
docker compose -f "$COMPOSE_FILE" ps

echo "[rebuild_all] Server logs (last 200 lines):"
docker compose -f "$COMPOSE_FILE" logs server --since 2m --tail 200 || true

echo "[rebuild_all] Client logs (last 200 lines):"
docker compose -f "$COMPOSE_FILE" logs client --since 2m --tail 200 || true

echo "[rebuild_all] Done at $(date)"

echo "[rebuild_all] Log file: $LOGFILE"

echo "If server build fails during apt with clearsigned/NOSPLIT errors, run the script again with host networking explicitly enabled in your environment or run the local dev servers while we diagnose network/proxy/CA issues."
