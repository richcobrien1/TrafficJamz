# docker/test/prefight_check.sh
# This script checks the health of critical services before running tests.
# It is intended to be run in a Docker environment.

#!/bin/bash
echo "🧪 Running preflight checks..."

# List critical services
critical_services=("api" "postgres" "mongodb" "redis" "influxdb")

for service in "${critical_services[@]}"; do
  echo "🔍 Checking health for: $service"
  docker inspect --format='{{.State.Health.Status}}' "trafficjamz_${service}_1" 2>/dev/null || echo "⚠️ $service has no healthcheck"
done

echo "✅ Preflight validation complete!"
