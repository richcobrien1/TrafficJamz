# kubernetes/bootstrap-calico.sh
# This script sets up Calico networking for a Kubernetes cluster.
# It applies the necessary CRDs and main manifest, handling validation issues gracefully.
# Ensure you have kubectl configured and the cluster is accessible before running this script.
# Usage: Run this script on the master node after Kubernetes is set up.
# Make sure to have the necessary permissions to apply manifests in the cluster.

#!/bin/bash

echo "[1] Setting up kubeconfig for current user..."
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

echo "[2] Applying Calico CRDs with validation fallback..."
CALICO_CRDS_URL="https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/crds.yaml"

if kubectl apply -f "$CALICO_CRDS_URL"; then
  echo "✅ CRDs applied with validation."
else
  echo "⚠️ Validation failed — retrying with --validate=false..."
  if kubectl apply --validate=false -f "$CALICO_CRDS_URL"; then
    echo "✅ CRDs applied without validation."
  else
    echo "❌ Failed to apply Calico CRDs. Check API server status."
    exit 1
  fi
fi

echo "[3] Applying main Calico manifest..."
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

echo "[4] Calico network components applied. Verifying status..."
kubectl get pods -n kube-system | grep calico

echo "🚀 Kubernetes network stack is on its feet."
