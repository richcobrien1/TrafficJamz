# TrafficJamz Deployment
To deploy the TrafficJamz Application in a Docker container within a Kubernetes Cluster Plane environment, follow these steps:

## Step 1: Clone the Repository

Clone the TrafficJamz codebase from GitHub:
```
git clone https://github.com/richcobrien1/Jamz
cd Jamz
```
## Step 2: Create Dockerfiles for Frontend and Backend

Navigate to the frontend directory and create a Dockerfile:
```
# Use an official Node.js runtime as a parent image
FROM node:16

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install dependencies
RUN npm install

# Build the frontend
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the frontend
CMD ["npm", "start"]
```
Navigate to the backend directory and create a Dockerfile:
```
# Use an official Node.js runtime as a parent image
FROM node:16

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install dependencies
RUN npm install

# Start the backend
CMD ["node", "app.js"]
```
## Step 3: Build and Test the Docker Images

Build the Docker image for the frontend:
```
docker build -t trafficjamz-frontend ./frontend
```
Build the Docker image for the backend:
```
docker build -t trafficjamz-backend ./backend
```
Test the Docker images locally:
```
docker run -p 3000:3000 trafficjamz-frontend
docker run -p 5000:5000 trafficjamz-backend
```
## FOR ONLY LOCAL DEVELOPEMENT (NO INTERNET): 
## Step 4: Use Docker Compose for Local Development Only
Create a docker-compose.yml file at the project root:
```
version: '3'
services:
  frontend:
    image: trafficjamz-frontend
    ports:
      - "3000:3000"
  backend:
    image: trafficjamz-backend
    ports:
      - "5000:5000"
```
Run Docker-Compose
```
docker-compose up
```
## FOR INTERNET DEPLOYMENT 
## Step 4: Generate Kubernetes requirements.txt for Backend and Frontend
Add these dependencies to the backend/requirements.txt file:
```
flask
requests
bcrypt
pymongo
sqlalchemy
redis
psycopg2-binary
gunicorn
influxdb-client
supabase
jwt
geopy
python-socketio
stripe
uuid
```
Add these dependencies to the frontend/requirements.txt file:
```
requests
socketio
mapbox-sdk
```
## Step 6: Create Kubernetes Deployment Files
Create a frontend-deployment.yaml file for the frontend Kubernetes deployment:
```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trafficjamz-frontend-deployment
spec:
  replicas: 2
  selector:
    matchLabels:
      app: trafficjamz-frontend
  template:
    metadata:
      labels:
        app: trafficjamz-frontend
    spec:
      containers:
      - name: trafficjamz-frontend
        image: trafficjamz-frontend:latest
        ports:
        - containerPort: 3000
```
Create a backend-deployment.yaml file for the backend Kubernetes deployment:
```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trafficjamz-backend-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: trafficjamz-backend
  template:
    metadata:
      labels:
        app: trafficjamz-backend
    spec:
      containers:
      - name: trafficjamz-backend
        image: trafficjamz-backend:latest
        ports:
        - containerPort: 5000
```
Create a frontend-service.yaml file for the frontend Kubernetes service:
```
apiVersion: v1
kind: Service
metadata:
  name: trafficjamz-frontend-service
spec:
  selector:
    app: trafficjamz-frontend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```
Create a backend-service.yaml file for the backend Kubernetes service:
```
apiVersion: v1
kind: Service
metadata:
  name: trafficjamz-backend-service
spec:
  selector:
    app: trafficjamz-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 5000
  type: LoadBalancer
```
## Step 6: Create Kubernetes Cluster Setup on Ubuntu with Calico script
Create script file kubernetes-cluster-ubuntu-calico.sh file 
```
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

echo "🛠 Ensuring kubelet binds to correct IP..."
sudo sed -i "/^KUBELET_EXTRA_ARGS=/c\KUBELET_EXTRA_ARGS=--node-ip=$WSL_IP" /var/lib/kubelet/kubeadm-flags.env
sudo systemctl restart kubelet

### 🔟 Initialize Kubernetes Cluster
echo "🚀 Initializing Kubernetes Cluster..."
sudo kubeadm init --pod-network-cidr=192.168.0.0/16 --apiserver-advertise-address=$WSL_IP --ignore-preflight-errors=FileAvailable || {
    echo "❌ Kubernetes initialization failed, resetting..."
    sudo kubeadm reset -f
    sudo systemctl restart containerd
    sudo kubeadm init --pod-network-cidr=192.168.0.0/16 --apiserver-advertise-address=$WSL_IP --ignore-preflight-errors=FileAvailable
}

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
kubectl taint nodes --all node-role.kubernetes.io/control-plane-

### 🔟 Verify Cluster Health
echo "🔍 Checking cluster status..."
kubectl get nodes
kubectl get pods -n kube-system

### 🔟 Final Kubelet Health Check & Debugging
echo "🛠 Checking kubelet status..."
sudo systemctl restart kubelet
sleep 10  # Allow stabilization
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

echo "✅ Deploying TrafficJamz Application..."
kubectl apply -f frontend-deployment.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-service.yaml
kubectl apply -f backend-service.yaml

kubectl get pods
kubectl get services

echo "🚀 TrafficJam cluster hub and nodes setup complete!"
```
## Step 7: Install and Run Kubernetes, Deploy and Run Docker images for backend and frontend
Deploy Docker images and run the deployment and service files:
```
./kubernetes-cluster-ubuntu-calico.sh
```
## Step 8: Monitor the Application
Use the external IPs provided by the Kubernetes services to access the frontend and backend applications.

Monitor the logs if needed:
```
kubectl logs <pod-name>
```
