#!/usr/bin/env bash
# Build and bring up backend and infra services for local testing
# Usage:
#   ./build_backend_and_services.sh [--no-nginx] [--only-backend]
#
# Options:
#  --no-nginx      Do not start nginx (useful when you run frontend via Vite locally)
#  --only-backend  Build and start only the backend (server) service

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/../docker-compose.prod.yml"

START_NGINX=true
ONLY_BACKEND=false

for arg in "$@"; do
  case "$arg" in
    --no-nginx) START_NGINX=false ;;
    --only-backend) ONLY_BACKEND=true ;;
    -h|--help)
      sed -n '1,120p' "$0"
      exit 0
      ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

# Ensure docker compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "docker-compose file not found at: $COMPOSE_FILE"
  exit 1
fi

# Check that docker CLI is available
if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker CLI not found in PATH."
  echo "- On Windows install Docker Desktop: https://www.docker.com/products/docker-desktop"
  echo "- If using WSL, ensure Docker Desktop WSL integration is enabled OR install Docker inside your WSL distro and make sure 'docker' is on PATH."
  echo "- Alternatively run these commands from PowerShell or a terminal where Docker is available."
  exit 127
fi

# Check for 'docker compose' availability (plugin or builtin)
if ! docker compose version >/dev/null 2>&1; then
  echo "Warning: 'docker compose' command not available. If you have Docker Desktop, ensure the compose plugin is installed or use 'docker-compose' binary if present."
fi

if [ "$ONLY_BACKEND" = true ]; then
  echo "Building and starting backend (server) only..."
  docker compose -f "$COMPOSE_FILE" build server
  docker compose -f "$COMPOSE_FILE" up -d server
  echo "Done. Backend is starting (check logs with: docker compose -f $COMPOSE_FILE logs -f server)"
  exit 0
fi

# Build and start infra + server
echo "Building infra and server images..."
docker compose -f "$COMPOSE_FILE" build server

echo "Starting infra and server services (postgres, mongodb, redis, influxdb, zookeeper, kafka, server)..."
docker compose -f "$COMPOSE_FILE" up -d postgres mongodb redis mongodb influxdb zookeeper kafka server || true

# Optionally start nginx
if [ "$START_NGINX" = true ]; then
  echo "Starting nginx (trafficjamz-nginx)..."
  docker compose -f "$COMPOSE_FILE" up -d nginx
else
  echo "Skipping nginx startup as requested (--no-nginx)"
fi

echo "All requested services started. Use 'docker compose -f $COMPOSE_FILE ps' to inspect."