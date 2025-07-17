# docker/build/dev_compose.sh
# This script builds and runs the Docker containers for the TrafficJamz development environment.
# It uses docker-compose to manage the services defined in the docker-compose.yml and docker-compose.override

#!/bin/bash
set -e

echo "🚀 Launching TrafficJamz Dev Stack (Override)..."

# Launch with override for full local services
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build -d

echo "📦 Containers are running!"
echo "📺 Tailing service logs (Ctrl+C to stop)..."
docker-compose logs -f
