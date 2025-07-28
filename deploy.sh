# deploy.sh
# This script automates the deployment of the TrafficJamz application in a local development environment.
# It builds Docker images, resets the cluster state, and deploys the application using Kubernetes.

#!/bin/bash
set -e

# 🔧 Config
REGISTRY="richcobrien1"
FRONTEND_IMAGE="$REGISTRY/trafficjamz-frontend:latest"
BACKEND_IMAGE="$REGISTRY/trafficjamz-backend:latest"

# 🎨 Color codes
GREEN='\033[1;32m'
RED='\033[1;31m'
BLUE='\033[1;34m'
NC='\033[0m'

echo -e "${BLUE}🔬 Validating local dev environment...${NC}"
bash docker/test/preflight_check.sh

echo -e "${BLUE}🛠 Building Docker images...${NC}"
bash docker/build/build_all.sh

echo -e "${BLUE}📤 Pushing Docker images to registry...${NC}"
docker push $BACKEND_IMAGE
docker push $FRONTEND_IMAGE

echo -e "${BLUE}🧨 Resetting cluster state...${NC}"
bash kubernetes/reset.sh

echo -e "${BLUE}📡 Running full cluster setup...${NC}"
bash kubernetes/kube.sh

echo -e "${GREEN}✅ TrafficJamz rollout complete!${NC}"
echo -e "${BLUE}📦 Pod Status:${NC}"
kubectl get pods

echo -e "${BLUE}🌐 Service Status:${NC}"
kubectl get svc
