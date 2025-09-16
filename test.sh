#!/usr/bin/env bash
# File: test.sh
# Purpose: Sanity check TrafficJamz stack via nginx proxy
# Usage: ./test.sh
# Notes:
#   - Tests frontend (/) and backend (/api/health) endpoints
#   - Uses curl with timeouts and clear status messages
#   - Add -k to HTTPS curl if using self-signed certs

set -euo pipefail

echo "🔎 Testing TrafficJamz stack..."

# Frontend check
echo -n "➡️  Checking frontend (http://localhost) ... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
  echo "✅ Frontend reachable"
else
  echo "❌ Frontend check failed"
fi

# Backend health check via nginx proxy
echo -n "➡️  Checking backend health (http://localhost/api/health) ... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health | grep -q "200"; then
  echo "✅ Backend reachable"
else
  echo "❌ Backend health check failed"
fi

# Optional HTTPS check (ignores self-signed cert warnings)
echo -n "➡️  Checking HTTPS frontend (https://localhost) ... "
if curl -sk -o /dev/null -w "%{http_code}" https://localhost | grep -q "200"; then
  echo "✅ HTTPS reachable"
else
  echo "⚠️  HTTPS check failed (self-signed certs may cause warnings)"
fi

echo "🎉 Tests complete."
