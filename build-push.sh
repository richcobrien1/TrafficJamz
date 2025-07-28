# build-push.sh
# This script builds and pushes Docker images for the TrafficJamz project.
# It uses the current git commit hash as the image tag.

#!/bin/bash
set -e

# Config
DOCKER_USER="richcobrien1"
TAG=$(git rev-parse --short HEAD)
SERVICES=("jamz-server" "jamz-client-vite")

for SERVICE in "${SERVICES[@]}"; do
  echo "🔧 Building $SERVICE..."
  docker build -t $DOCKER_USER/$SERVICE:$TAG ./docker/$SERVICE

  echo "🚀 Pushing $SERVICE..."
  docker push $DOCKER_USER/$SERVICE:$TAG
done

echo "✅ All services built and pushed with tag: $TAG"
