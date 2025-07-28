# deploy_prod.sh
# This script builds and launches the TrafficJamz production stack using Docker Compose.
# It requires TLS certificates to be present in the specified directory.
# Make sure to run ./ssl-bootstrap.sh to generate the necessary certificates before running this script.

#!/bin/bash
set -e

echo "🚀 Launching TrafficJamz production stack..."

CERT_PATH="./docker/frontend/certs/fullchain.pem"
KEY_PATH="./docker/frontend/certs/privkey.pem"

# Check for certs
if [[ ! -f "$CERT_PATH" || ! -f "$KEY_PATH" ]]; then
  echo "❌ TLS certs not found. Run ./ssl-bootstrap.sh first."
  exit 1
fi

# Build + Launch containers
docker-compose -f docker-compose.prod.yml up --build -d

echo "✅ Production containers launched!"
docker ps --filter "name=trafficjamz"

# Optionally test NGINX endpoint
sleep 2
echo "🌍 Hit https://app.trafficjamz.local in your browser (accept warning if self-signed)"
