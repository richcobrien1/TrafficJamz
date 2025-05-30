#!/bin/bash
# Kubernetes control plane (master) node installation script for WSL Ubuntu
# Created for the Jamz project - Multi-node cluster setup

# Exit on any error
set -e

echo "=== Starting Kubernetes control plane node setup ==="

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

# Step 12: Get the IP address to advertise API server
echo "Detecting IP address for API server..."
IP_ADDR=$(ip -4 addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v 127.0.0.1 | head -n 1)
echo "Detected IP address: $IP_ADDR"

# Step 13: Initialize Kubernetes cluster with specific configurations for multi-node
echo "Initializing Kubernetes control plane..."
sudo kubeadm init --pod-network-cidr=10.244.0.0/16 --apiserver-advertise-address=$IP_ADDR

# Step 14: Set up kubectl for your user
echo "Setting up kubectl configuration..."
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Step 15: Install Calico network plugin
echo "Installing Calico network plugin..."
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml

# Step 16: Generate and save the join command for worker nodes
echo "Generating cluster join command for worker nodes..."
kubeadm token create --print-join-command > $HOME/kube-join-command.sh
chmod +x $HOME/kube-join-command.sh
echo "Join command saved to $HOME/kube-join-command.sh"

# Step 17: Verify installation
echo "Verifying installation..."
echo "Node status:"
kubectl get nodes
echo "Pod status:"
kubectl get pods --all-namespaces

echo "=== Kubernetes control plane setup completed ==="
echo "You can now join worker nodes to this cluster using the command in $HOME/kube-join-command.sh"
echo ""
echo "IMPORTANT: Copy the join command to your worker nodes:"
cat $HOME/kube-join-command.sh
