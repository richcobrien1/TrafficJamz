#!/bin/bash
set -e  # Exit on errors

# Define script path
SCRIPT_NAME="kubernetes-cluster-ubuntu-calico.sh"

# Ensure we're in the correct directory
if [[ ! -f "$SCRIPT_NAME" ]]; then
  echo "❌ Error: $SCRIPT_NAME not found in the current directory!"
  exit 1
fi

# Set execution permissions
echo "🔧 Setting executable permissions..."
chmod +x "$SCRIPT_NAME"

# Run the Kubernetes setup script
echo "🚀 Running $SCRIPT_NAME..."
./"$SCRIPT_NAME"

echo "✅ Kubernetes setup complete!"

### 🚀 Deploying TrafficJamz Backend
echo "📦 Deploying TrafficJamz Backend..."
cat <<EOF | kubectl apply -f -
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
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 5000
          readinessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "5000"
EOF

echo "🌐 Creating Backend Service..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: trafficjamz-backend-service
spec:
  type: LoadBalancer
  selector:
    app: trafficjamz-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 5000
EOF

### 🚀 Deploying TrafficJamz Frontend
echo "📦 Deploying TrafficJamz Frontend..."
cat <<EOF | kubectl apply -f -
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
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3000"
EOF

echo "🌐 Creating Frontend Service..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: trafficjamz-frontend-service
spec:
  type: LoadBalancer
  selector:
    app: trafficjamz-frontend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
EOF

echo "✅ TrafficJamz frontend and backend successfully deployed!"
kubectl get pods
kubectl get svc
