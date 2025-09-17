# docker/frontend/entrypoint.sh

#!/bin/bash
set -e

echo "🚦 Starting TrafficJamz frontend container..."

CERT_DIR="/etc/nginx/certs"
CERT_PATH="${CERT_DIR}/fullchain.pem"
KEY_PATH="${CERT_DIR}/privkey.pem"
CONFIG_DIR="/etc/nginx"
PROD_CONF="${CONFIG_DIR}/nginx.conf"
TLS_CONF="${CONFIG_DIR}/nginx.dev.conf"

# If TLS certs are present, enable the TLS-capable config (listens on 443).
if [[ -f "$CERT_PATH" && -f "$KEY_PATH" ]]; then
  echo "🔐 TLS certs found. Enabling HTTPS (TLS) nginx config."
  cp "$TLS_CONF" "$CONFIG_DIR/nginx.active.conf"
else
  echo "⚠️ TLS certs missing. Falling back to HTTP-only production config."
  cp "$PROD_CONF" "$CONFIG_DIR/nginx.active.conf"
fi

# Launch nginx with selected config
exec nginx -c "$CONFIG_DIR/nginx.active.conf" -g "daemon off;"
