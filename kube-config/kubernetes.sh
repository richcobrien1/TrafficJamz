#!/bin/bash
# Kubernetes single node installation, configuration, and initialization script for WSL Ubuntu
# Created for the Jamz project

# Exit on any error
set -e

echo "=== Starting Kubernetes installation and setup ==="

# Step 1: Update package lists
echo "Updating package lists..."
sudo apt-get update

# Step 2: Install dependencies
echo "Installing dependencies..."
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg

# Step 3: Add Kubernetes apt repository key
echo "Adding Kubernetes repository key..."
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

# Step 4: Add Kubernetes apt repository
echo "Adding Kubernetes repository..."
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list

# Step 5: Update package lists again
echo "Updating package lists with new repository..."
sudo apt-get update

# Step 6: Install Kubernetes components
echo "Installing Kubernetes components..."
sudo apt-get install -y kubelet kubeadm kubectl

# Step 7: Pin the versions to prevent accidental upgrades
echo "Pinning Kubernetes package versions..."
sudo apt-mark hold kubelet kubeadm kubectl

# Step 8: Disable swap (required for Kubernetes)
echo "Disabling swap..."
sudo swapoff -a
# Note: To permanently disable swap, comment out any swap lines in /etc/fstab

# Step 9: Enable required kernel modules
echo "Enabling required kernel modules..."
sudo modprobe overlay
sudo modprobe br_netfilter

# Step 10: Set up required sysctl parameters
echo "Setting up sysctl parameters for Kubernetes..."
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

# Step 11: Apply sysctl parameters
echo "Applying sysctl parameters..."
sudo sysctl --system

# Step 12: Initialize Kubernetes cluster
echo "Initializing Kubernetes cluster..."
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

# Step 13: Set up kubectl for your user
echo "Setting up kubectl configuration..."
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Step 14: Install Calico network plugin
echo "Installing Calico network plugin..."
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml

# Step 15: Allow pods to run on the control-plane node (for single-node setup)
echo "Allowing pods to run on control-plane node..."
kubectl taint nodes --all node-role.kubernetes.io/control-plane-

# Step 16: Verify installation
echo "Verifying installation..."
echo "Node status:"
kubectl get nodes
echo "Pod status:"
kubectl get pods --all-namespaces

echo "=== Kubernetes installation and setup completed ==="
echo "You can now use 'kubectl' to manage your cluster."
