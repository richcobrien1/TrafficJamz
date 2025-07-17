#!/bin/bash
set -e

echo "🧹 Resetting Kubernetes Cluster in /kubernetes..."

# Step 1: Reset Kubernetes via kubeadm
echo "🔁 Running kubeadm reset..."
sudo kubeadm reset -f

# Step 2: Remove CNI configuration
echo "🧼 Removing CNI configuration..."
sudo rm -rf /etc/cni/net.d

# Step 3: Clean local kube config
echo "🧽 Removing $HOME/.kube directory..."
sudo rm -rf $HOME/.kube

# Step 4: Remove lingering Calico manifest (if present)
echo "🧾 Cleaning Calico manifest..."
kubectl delete -f /kubernetes/calico.yaml --ignore-not-found || echo "✅ Calico manifest already removed."

echo "✅ Cluster reset complete! Ready to re-run kube.sh in /kubernetes"
