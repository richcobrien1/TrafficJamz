#!/bin/bash
# Kubernetes worker node installation script for WSL Ubuntu
# Created for the Jamz project - Multi-node cluster setup

# Exit on any error
set -e

echo "=== Starting Kubernetes worker node setup ==="

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

# Step 12: Prompt for join command
echo "===================================================================="
echo "IMPORTANT: You need the join command from the control plane node."
echo "On your control plane node, run: cat ~/kube-join-command.sh"
echo "Then paste the command below when prompted."
echo "===================================================================="
echo ""
read -p "Paste the 'kubeadm join' command from the control plane node: " JOIN_COMMAND

# Step 13: Join the cluster
echo "Joining the Kubernetes cluster..."
sudo $JOIN_COMMAND

echo "=== Kubernetes worker node setup completed ==="
echo "This node has now joined the cluster. On the control plane node, run:"
echo "kubectl get nodes"
echo "to verify that this node has joined successfully."
