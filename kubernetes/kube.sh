# kubernetes/kube.sh
# This script sets up a Kubernetes cluster on Ubuntu with Calico networking,
# deploys the TrafficJamz backend and frontend, and configures services.
# It assumes you have the necessary Docker images available in your registry.

#!/bin/bash
set -euo pipefail

# === REGISTRY CONFIG ===
REGISTRY="richcobrien1"
BACKEND_IMAGE="$REGISTRY/trafficjamz-backend:latest"
FRONTEND_IMAGE="$REGISTRY/trafficjamz-frontend:latest"

# === SCRIPT DEFINITIONS ===
SETUP_SCRIPT="kubernetes-cluster-ubuntu-calico.sh"
RESET_SCRIPT="kube-reset.sh"
LOG_FILE="./kube-deploy.log"
REQUIRED_NAMESPACES=("frontend" "backend")
CALICO_CRDS_URL="https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/crds.yaml"
CALICO_MANIFEST_URL="https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml"

echo "🏁 Starting TrafficJamz Kubernetes deployment..." | tee "$LOG_FILE"

# === SANITY CHECK ===
if ! command -v kubectl &>/dev/null; then
  echo "❌ kubectl not installed!" | tee -a "$LOG_FILE"
  exit 1
fi

if [[ ! -f "$SETUP_SCRIPT" ]]; then
  echo "❌ Error: $SETUP_SCRIPT not found!" | tee -a "$LOG_FILE"
  exit 1
fi

# === OPTIONAL RESET PHASE ===
if [[ "${1:-}" == "--reset" ]]; then
  echo "🧹 Reset flag detected. Cleaning up..." | tee -a "$LOG_FILE"
  chmod +x "$RESET_SCRIPT"
  ./"$RESET_SCRIPT"
fi

# === SETUP CLUSTER ===
chmod +x "$SETUP_SCRIPT"
echo "🚀 Initializing cluster with Calico networking..." | tee -a "$LOG_FILE"
./"$SETUP_SCRIPT"

# === APPLY CALICO CRDS ===
echo "🌐 Checking for existing Calico CRDs..." | tee -a "$LOG_FILE"
if ! kubectl get crds | grep -q 'felixconfigurations.crd.projectcalico.org'; then
  echo "📦 Calico CRDs not found — applying manifests..." | tee -a "$LOG_FILE"
  if kubectl apply -f "$CALICO_CRDS_URL" | tee -a "$LOG_FILE"; then
    echo "✅ CRDs applied with validation." | tee -a "$LOG_FILE"
  else
    echo "⚠️ Validation failed — retrying with --validate=false..." | tee -a "$LOG_FILE"
    if kubectl apply --validate=false -f "$CALICO_CRDS_URL" | tee -a "$LOG_FILE"; then
      echo "✅ CRDs applied without validation." | tee -a "$LOG_FILE"
    else
      echo "❌ Failed to apply Calico CRDs. Exiting." | tee -a "$LOG_FILE"
      exit 1
    fi
  fi
else
  echo "✅ Calico CRDs already exist — skipping." | tee -a "$LOG_FILE"
fi

# === APPLY CALICO MAIN MANIFEST ===
echo "📦 Applying Calico manifest..." | tee -a "$LOG_FILE"
kubectl apply -f "$CALICO_MANIFEST_URL" | tee -a "$LOG_FILE"

# === ENSURE NAMESPACES EXIST ===
echo "📦 Verifying namespaces..." | tee -a "$LOG_FILE"
for ns in "${REQUIRED_NAMESPACES[@]}"; do
  if ! kubectl get ns "$ns" &>/dev/null; then
    echo "🛠️ Creating missing namespace: $ns" | tee -a "$LOG_FILE"
    kubectl create ns "$ns"
  else
    echo "✅ Namespace '$ns' exists." | tee -a "$LOG_FILE"
  fi
done

# === DEPLOY BACKEND ===
echo "📦 Deploying TrafficJamz Backend..." | tee -a "$LOG_FILE"
cat <<EOF | kubectl apply -n backend -f - | tee -a "$LOG_FILE"
<same backend deployment spec as before>
EOF

echo "🌐 Creating Backend Service..." | tee -a "$LOG_FILE"
cat <<EOF | kubectl apply -n backend -f - | tee -a "$LOG_FILE"
<same backend service spec as before>
EOF

# === DEPLOY FRONTEND ===
echo "📦 Deploying TrafficJamz Frontend..." | tee -a "$LOG_FILE"
cat <<EOF | kubectl apply -n frontend -f - | tee -a "$LOG_FILE"
<same frontend deployment spec as before>
EOF

echo "🌐 Creating Frontend Service..." | tee -a "$LOG_FILE"
cat <<EOF | kubectl apply -n frontend -f - | tee -a "$LOG_FILE"
<same frontend service spec as before>
EOF

# === VERIFY ===
echo "🔍 Final resource check..." | tee -a "$LOG_FILE"
kubectl get pods --all-namespaces | tee -a "$LOG_FILE"
kubectl get svc --all-namespaces | tee -a "$LOG_FILE"

echo "✅ Deployment complete!" | tee -a "$LOG_FILE"
