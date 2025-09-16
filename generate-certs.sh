#!/usr/bin/env bash
# File: generate-certs.sh
# Purpose: Generate self-signed TLS certs for local HTTPS testing with nginx
# Usage: ./generate-certs.sh

set -euo pipefail

CERTS_DIR="./certs"
mkdir -p "$CERTS_DIR"

# Generate a self-signed cert valid for 365 days
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$CERTS_DIR/privkey.pem" \
  -out "$CERTS_DIR/fullchain.pem" \
  -subj "/C=US/ST=Colorado/L=CastleRock/O=TrafficJamz/OU=Dev/CN=localhost"

echo "✅ Self-signed certs generated in $CERTS_DIR"
echo "   - $CERTS_DIR/privkey.pem"
echo "   - $CERTS_DIR/fullchain.pem"
