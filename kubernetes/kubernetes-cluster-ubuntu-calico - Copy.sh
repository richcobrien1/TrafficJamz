# kubernetes/kubernetes-cluster-ubuntu-calico.sh
# This script sets up a Kubernetes cluster on Ubuntu with Calico networking.
# It includes steps to disable swap, install necessary packages, configure container runtime,
# initialize the cluster, and deploy Calico networking.
# It also handles WSL2 specific configurations and ensures kubelet is properly set up.

#!/bin/bash
set -e  # Exit on errors

echo "🚀 Starting Kubernetes Cluster Setup on Ubuntu with Calico"

### 1️⃣ Disable Swap (Required for Kubernetes)
echo "🛠 Checking for swap..."
if sudo swapon --summary | grep -q "partition"; then
    echo "⚠️ Swap is enabled, disabling..."
    sudo swapoff -a
    sudo sed -i '/ swap / s/^/#/' /etc/fstab
    echo "✅ Swap disabled successfully!"
else
    echo "✅ No active swap found."
fi

### 2️⃣ Update & Install Dependencies
echo "🔧 Updating system packages..."
sudo apt update && sudo apt install -y curl apt-transport-https

### 3️⃣ Add Kubernetes Repository
echo "🔗 Adding Kubernetes repository..."
sudo rm -f /etc/apt/sources.list.d/kubernetes.list
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt update

### 4️⃣ Install Kubernetes & Container Runtime
echo "📦 Installing kubeadm, kubelet, kubectl, and containerd..."
sudo apt install -y kubeadm kubelet kubectl containerd

### 5️⃣ Validate & Restart Containerd
echo "🛠 Checking containerd..."
if ! sudo systemctl is-active --quiet containerd; then
    echo "⚠️ Containerd is not running, fixing..."
    [ -f /etc/containerd/config.toml ] || sudo containerd config default | sudo tee /etc/containerd/config.toml
    sudo systemctl restart containerd
    sudo systemctl enable containerd
fi

### 6️⃣ Fix CRI Sandbox Image Mismatch
echo "🚀 Removing outdated sandbox image and setting correct version..."
sudo ctr -n k8s.io images rm registry.k8s.io/pause:3.8 || echo "✅ No need to remove, already cleared."
sudo ctr -n k8s.io images pull registry.k8s.io/pause:3.9
sudo ctr -n k8s.io images tag registry.k8s.io/pause:3.9 registry.k8s.io/pause:3.8

### 7️⃣ Set IP Forwarding (Single Entry)
echo "🌐 Enabling IP forwarding..."
sudo sysctl -w net.ipv4.ip_forward=1

### 8️⃣ Clean Previous Kubernetes Manifests
echo "🧹 Cleaning previous Kubernetes manifests..."
sudo rm -rf /etc/kubernetes/manifests/*.yaml

### 9️⃣ Detect WSL2 IP & Configure Kubelet Node Binding
echo "🔍 Detecting WSL2 network interface..."
WSL_IP=$(ip -o -4 addr show eth0 | awk '{print $4}' | cut -d/ -f1)
echo "💡 Detected Node IP: $WSL_IP"

if [ -f /var/lib/kubelet/kubeadm-flags.env ]; then
    echo "🛠 Ensuring kubelet binds to correct IP..."
    sudo sed -i "/^KUBELET_EXTRA_ARGS=/c\KUBELET_EXTRA_ARGS=--node-ip=$WSL_IP" /var/lib/kubelet/kubeadm-flags.env
    sudo systemctl restart kubelet
else
    echo "⚠️ kubeadm-flags.env not found yet — deferring node IP binding until after kubeadm init."
fi

### 🔟 Initialize Kubernetes Cluster
echo "🚀 Initializing Kubernetes Cluster..."
sudo kubeadm init --pod-network-cidr=192.168.0.0/16 --apiserver-advertise-address=$WSL_IP --ignore-preflight-errors=FileAvailable || {
    echo "❌ Kubernetes initialization failed, resetting..."
    sudo kubeadm reset -f
    sudo systemctl restart containerd
    sudo kubeadm init --pod-network-cidr=192.168.0.0/16 --apiserver-advertise-address=$WSL_IP --ignore-preflight-errors=FileAvailable
}

### 🔟 Wait for API Server Before Applying Calico CRDs
echo "📦 Applying Calico CRDs with fallback..."
CALICO_CRDS_URL="https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/crds.yaml"
MAX_RETRIES=24
RETRY_DELAY=5
RETRY_COUNT=0

until kubectl get --request-timeout=10s --raw="/healthz" &>/dev/null || [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
    echo "⏳ Waiting for API server to become available... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep $RETRY_DELAY
    ((RETRY_COUNT++))
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ API server failed to respond after $((MAX_RETRIES * RETRY_DELAY))s. Exiting..."
    exit 1
fi

if ! kubectl get crds | grep -q 'felixconfigurations.crd.projectcalico.org'; then
    echo "🔍 Calico CRDs not found — applying..."
    if kubectl apply -f "$CALICO_CRDS_URL"; then
        echo "✅ CRDs applied with validation."
    else
        echo "⚠️ Validation failed — retrying with --validate=false..."
        if kubectl apply --validate=false -f "$CALICO_CRDS_URL"; then
            echo "✅ CRDs applied without validation."
        else
            echo "❌ Failed to apply Calico CRDs. Exiting..."
            exit 1
        fi
    fi
else
    echo "✅ Calico CRDs already exist — skipping."
fi

### 🔟 Configure Kubectl for User
echo "🔧 Setting up kubectl access..."
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

### 🔟 Modify Calico YAML Before Deployment
echo "🌐 Downloading and modifying Calico manifest..."
curl -sSL -o calico.yaml https://docs.projectcalico.org/manifests/calico.yaml

### Validate Download
if [ ! -s calico.yaml ]; then
    echo "❌ Failed to download Calico manifest! Exiting..."
    exit 1
fi

### Remove Unsupported Volume Mounts
sed -i '/name: bpffs/d' calico.yaml
sed -i '/name: var-run-calico/d' calico.yaml
sed -i '/mountPath: \/sys\/fs\/bpffs/d' calico.yaml
sed -i '/mountPath: \/var\/run\/calico/d' calico.yaml

### 🔟 Deploy Modified Calico
echo "🚀 Applying modified Calico..."
kubectl apply -f calico.yaml --validate=false

### 🔟 Remove Control-Plane Taint
echo "🛠 Removing control-plane scheduling restrictions..."
kubectl taint nodes --all node-role.kubernetes.io/control-plane- || true

### 🔟 Verify Cluster Health
echo "🔍 Checking cluster status..."
kubectl get nodes
kubectl get pods -n kube-system

### 🔟 Final Kubelet Health Check & Debugging
echo "🛠 Checking kubelet status..."
sudo systemctl restart kubelet
sleep 10
if ! sudo systemctl is-active --quiet kubelet; then
    echo "⚠️ Kubelet is not running, checking logs..."
    sudo journalctl -u kubelet --no-pager | tail -40
    echo "🔧 Attempting kubelet recovery..."
    sudo kubeadm init phase kubelet-start --config /etc/kubernetes/kubelet-config.yaml
    sudo systemctl restart kubelet
fi

### 🔟 Verify Kubelet Port Accessibility
echo "🔍 Checking kube-apiserver accessibility..."
curl -sSL http://$WSL_IP:6443 || {
    echo "⚠️ API server unreachable, adjusting firewall..."
    sudo ufw allow 6443/tcp
    sudo ufw allow 10248/tcp
    sudo systemctl restart kubelet
}

echo "✅ Kubernetes setup complete with modified Calico!"
echo "🚀 TrafficJam cluster hub and nodes setup complete!"
