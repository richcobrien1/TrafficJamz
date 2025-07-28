# dev_build.sh
# This script is used to switch between HTTP and HTTPS development modes for the TrafficJamz application
# It allows developers to quickly set up their environment for testing with or without TLS.

#!/bin/bash
set -e

echo ""
echo "🚀 TrafficJamz Dev Mode Switcher"
echo "================================="
echo "Choose your frontend launch mode:"
echo ""
echo "1️⃣  HTTP  (hot reload, no TLS)"
echo "2️⃣  HTTPS (nginx proxy, cert-secure)"
echo "0️⃣  Cancel"
echo ""

read -p "Your choice [1-2]: " choice
echo ""

CERT_DIR="./docker/frontend/certs"
CERT_PATH="${CERT_DIR}/fullchain.pem"
KEY_PATH="${CERT_DIR}/privkey.pem"

echo "🧨 Killing orphaned containers..."
docker-compose -f docker-compose.override.yml down --remove-orphans

case "$choice" in
  1)
    echo "🌐 Launching HTTP dev mode..."
    docker-compose -f docker-compose.override.yml up -d frontend
    echo "✅ App running at http://localhost:8080"
    ;;

  2)
    if [[ ! -f "$CERT_PATH" || ! -f "$KEY_PATH" ]]; then
      echo "❌ TLS certs missing. Run ./ssl-bootstrap.sh first."
      exit 1
    fi
    echo "🔐 Launching HTTPS dev mode with NGINX proxy..."
    docker-compose -f docker-compose.override.yml up -d frontend nginx
    echo "✅ Secure app running at https://localhost"
    ;;

  0)
    echo "🛑 Cancelled. No containers launched."
    exit 0
    ;;

  *)
    echo "❌ Invalid input. Please choose 1, 2, or 0."
    exit 1
    ;;
esac
