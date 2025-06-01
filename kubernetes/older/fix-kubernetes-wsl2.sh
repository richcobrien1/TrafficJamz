#!/bin/bash
# Comprehensive fix for Kubernetes on WSL2 with cgroup v2
# Created for the Jamz project

# Exit on any error
set -e

echo "=== Starting Kubernetes WSL2 cgroup v2 fix script ==="

# Step 1: Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root. Please use sudo."
    exit 1
fi

echo "Step 1: Stopping Kubernetes services"
systemctl stop kubelet || true
systemctl stop containerd || true

echo "Step 2: Resetting Kubernetes"
kubeadm reset -f || true

echo "Step 3: Cleaning up directories"
rm -rf /etc/kubernetes/
rm -rf /var/lib/kubelet/
rm -rf /var/lib/etcd
rm -rf /home/$(logname)/.kube/

echo "Step 4: Configuring containerd for cgroup v2"
mkdir -p /etc/containerd
containerd config default > /etc/containerd/config.toml
# Update for cgroup v2
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml

echo "Step 5: Creating kubelet configuration for cgroup v2"
mkdir -p /etc/systemd/system/kubelet.service.d/
cat > /etc/systemd/system/kubelet.service.d/wsl.conf << EOF
[Service]
Environment="KUBELET_EXTRA_ARGS=--container-runtime=remote --container-runtime-endpoint=unix:///run/containerd/containerd.sock --cgroup-driver=systemd --feature-gates=NodeSwap=true"
EOF

echo "Step 6: Reloading systemd and restarting services"
systemctl daemon-reload
systemctl enable containerd
systemctl start containerd
systemctl enable kubelet

echo "Step 7: Initializing Kubernetes with cgroup v2 settings"
kubeadm init --pod-network-cidr=10.244.0.0/16 --cri-socket=unix:///run/containerd/containerd.sock --ignore-preflight-errors=all

echo "Step 8: Setting up kubectl configuration"
mkdir -p /home/$(logname)/.kube
cp -i /etc/kubernetes/admin.conf /home/$(logname)/.kube/config
chown $(logname):$(logname) /home/$(logname)/.kube/config

echo "Step 9: Modifying kubectl config to use localhost"
su - $(logname) -c "sed -i 's|server: https://[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+:6443|server: https://127.0.0.1:6443|' /home/$(logname)/.kube/config"

echo "Step 10: Applying Calico network plugin"
su - $(logname) -c "kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/calico.yaml"

echo "Step 11: Allowing pods on control plane node"
su - $(logname) -c "kubectl taint nodes --all node-role.kubernetes.io/control-plane-"

echo "Step 12: Verifying cluster status"
su - $(logname) -c "kubectl get nodes"
su - $(logname) -c "kubectl get pods --all-namespaces"

echo "=== Kubernetes WSL2 cgroup v2 fix completed ==="
echo "Your Kubernetes cluster should now be running properly with cgroup v2 support."
echo "If you restart your WSL instance, you may need to run these commands:"
echo "  sudo systemctl start containerd"
echo "  sudo systemctl start kubelet"
