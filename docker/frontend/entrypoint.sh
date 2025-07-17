# docker/frontend/entrypoint.sh

#!/bin/bash
set -e

echo "🚦 Starting TrafficJamz frontend container..."

CERT_DIR="/etc/nginx/certs"
CERT_PATH="${CERT_DIR}/fullchain.pem"
KEY_PATH="${CERT_DIR}/privkey.pem"
CONFIG_DIR="/etc/nginx"
MAIN_CONF="${CONFIG_DIR}/nginx.conf"
DEV_CONF="${CONFIG_DIR}/nginx.dev.conf"

# Check for TLS certs
if [[ -f "$CERT_PATH" && -f "$KEY_PATH" ]]; then
  echo "🔐 TLS certs found. Using production HTTPS config."
  cp "$MAIN_CONF" "$CONFIG_DIR/nginx.active.conf"
else
  echo "⚠️ TLS certs missing. Switching to dev HTTP-only config."
  cp "$DEV_CONF" "$CONFIG_DIR/nginx.active.conf"
fi

# Launch nginx with selected config
exec nginx -c "$CONFIG_DIR/nginx.active.conf" -g "daemon off;"
