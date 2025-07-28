#!/bin/bash
set -euo pipefail

echo "🧹 Cleaning up TrafficJamz Kubernetes resources..."

# === Stop services ===
echo "⏹️ Stopping kubelet and containerd..."
sudo systemctl stop kubelet || true
sudo systemctl stop containerd || true

# === Reset kubeadm ===
echo "⚙️ Running kubeadm reset..."
sudo kubeadm reset -f

# === Remove Kubernetes certs and config ===
echo "🧨 Removing certs and cluster metadata..."
sudo rm -rf /etc/kubernetes/pki
sudo rm -rf /etc/kubernetes/*.conf
sudo rm -rf /var/lib/kubelet/*
sudo rm -rf /etc/cni/net.d

# === Clean kubeconfig ===
echo "🧼 Resetting local kubeconfig..."
mkdir -p ~/.kube
rm -f ~/.kube/config

# === Rebuild kubeconfig from fresh cluster (after re-setup) ===
echo "⏳ Waiting for fresh kubeconfig to be available..."
while [ ! -f /etc/kubernetes/admin.conf ]; do
  sleep 2
done

echo "🔗 Linking admin.conf to kubeconfig..."
sudo cp /etc/kubernetes/admin.conf ~/.kube/config
sudo chown "$(id -u):$(id -g)" ~/.kube/config

# === Verify cluster status ===
echo "🔍 Verifying API server connectivity..."
until kubectl version &>/dev/null; do
  echo "⏳ Waiting for Kubernetes API to become available..."
  sleep 3
done

echo "✅ Cluster reset and reconfigured successfully!"
