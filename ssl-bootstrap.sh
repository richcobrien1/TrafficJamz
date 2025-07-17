#!/bin/bash
set -e

echo "🔐 Generating self-signed TLS certs for TrafficJamz..."

# Define cert directory relative to project root
CERT_DIR="./docker/frontend/certs"

# Create directory if not exists
mkdir -p "$CERT_DIR"

# Generate self-signed certs with properly escaped subject
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -subj "/C=US/ST=Colorado/L=Centennial/O=TrafficJamz/OU=Dev/CN=app.trafficjamz.local"

echo "✅ TLS certs generated at $CERT_DIR"
echo "📁 privkey.pem and fullchain.pem are ready for nginx.conf SSL mounting"
