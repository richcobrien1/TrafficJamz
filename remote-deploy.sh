#!/bin/bash
# Remote deployment script for TrafficJamz backend
# This script connects to the production server and restarts the backend container

SERVER="157.230.165.156"
USER="root"

echo "🚀 Deploying TrafficJamz backend to $SERVER"

# Check if we can connect
if ! ping -c 1 -W 2 $SERVER &> /dev/null; then
    echo "❌ Cannot reach server $SERVER"
    echo "Please check:"
    echo "  1. Server is running"
    echo "  2. Network connection"
    echo "  3. Firewall allows connection"
    exit 1
fi

# Execute deployment commands on remote server
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $USER@$SERVER << 'ENDSSH'
    set -e
    
    echo "📂 Navigating to project directory..."
    cd /root/TrafficJamz || cd /home/*/TrafficJamz || { echo "❌ Project directory not found"; exit 1; }
    
    echo "🔄 Pulling latest code..."
    git pull origin main
    
    echo "🐳 Restarting backend container..."
    docker restart trafficjamz
    
    echo "⏳ Waiting for container to stabilize..."
    sleep 5
    
    echo "✅ Checking container status..."
    docker ps | grep trafficjamz
    
    echo "📋 Recent logs:"
    docker logs --tail=20 trafficjamz
    
    echo "✅ Deployment complete!"
ENDSSH

echo "🎉 Backend deployed successfully!"
