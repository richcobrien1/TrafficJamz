#!/bin/bash
set -e

echo "🔬 Validating local dev environment..."
bash docker/test/preflight_check.sh

echo "🚀 Starting TrafficJamz deployment pipeline..."

### 🔧 Build Images
echo "🛠 Building Docker images..."
bash docker/build/build_all.sh

### 📦 Push to Registry (optional — uncomment to use)
# echo "📤 Pushing Docker images to registry..."
# docker push yourdockerhub/trafficjamz-backend:latest
# docker push yourdockerhub/trafficjamz-frontend:latest

### 🧹 Reset Cluster
echo "🧨 Resetting cluster state..."
bash kubernetes/reset.sh

### 🚀 Deploy with kube.sh
echo "📡 Running full cluster setup..."
bash kubernetes/kube.sh

echo "✅ TrafficJamz rollout complete!"
kubectl get pods
kubectl get svc
