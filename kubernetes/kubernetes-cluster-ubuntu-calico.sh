#!/bin/bash
set -e  # Exit on errors

echo "🚀 Starting Kubernetes Cluster Setup on Ubuntu with Calico"

### 1️⃣ Install Kubernetes & Dependencies
echo "🔧 Installing Kubernetes components..."
sudo apt update && sudo apt install -y \
  kubelet kubeadm kubectl containerd 

# Enable containerd
sudo systemctl enable --now containerd

### 2️⃣ Initialize the Kubernetes Control Plane
echo "🚀 Initializing Kubernetes cluster..."
sudo kubeadm init --pod-network-cidr=192.168.0.0/16

# Configure kubectl for the current user
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

### 3️⃣ Apply Calico (Modified for WSL2)
echo "🌐 Deploying Calico networking..."
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml

# Modify the DaemonSet to remove `/var/run/calico` volume mounts
echo "🔧 Adjusting Calico configuration for WSL2..."

kubectl patch daemonset calico-node -n kube-system --type=json -p '[
  {"op": "remove", "path": "/spec/template/spec/containers/0/volumeMounts/3"},
  {"op": "remove", "path": "/spec/template/spec/volumes/3"}
]'

### 4️⃣ Remove Control-Plane Taint to Allow Scheduling
echo "🛠 Removing control-plane scheduling restrictions..."
kubectl taint nodes --all node-role.kubernetes.io/control-plane-

### 5️⃣ Verify Everything is Running
echo "🔍 Checking cluster status..."
kubectl get nodes
kubectl get pods -n kube-system

echo "✅ Kubernetes setup complete with Calico on Ubuntu!"