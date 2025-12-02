#!/bin/bash
# Safe deployment script with environment validation
# Prevents deployment issues caused by malformed .env files

set -e

SERVER="root@157.230.165.156"
PROJECT_DIR="/root/TrafficJamz"

echo "🚀 Starting safe deployment to production..."
echo "=========================================="

# Step 1: Pull latest code
echo ""
echo "📥 Step 1: Pulling latest code..."
ssh $SERVER << 'ENDSSH'
cd /root/TrafficJamz
git stash
git pull origin main
ENDSSH

# Step 2: Validate environment file
echo ""
echo "🔍 Step 2: Validating environment file..."
ssh $SERVER << 'ENDSSH'
cd /root/TrafficJamz
chmod +x scripts/*.sh

# Run validation
if ./scripts/validate-env.sh jamz-server/.env.local; then
    echo "✅ Environment validation passed"
else
    echo "⚠️  Environment validation failed, attempting to fix..."
    ./scripts/clean-env-file.sh jamz-server/.env.local
    
    # Validate again after cleaning
    if ./scripts/validate-env.sh jamz-server/.env.local; then
        echo "✅ Environment cleaned and validated successfully"
    else
        echo "❌ Environment validation still failing, aborting deployment"
        exit 1
    fi
fi
ENDSSH

# Step 3: Build Docker image
echo ""
echo "🔨 Step 3: Building Docker image..."
ssh $SERVER << 'ENDSSH'
cd /root/TrafficJamz
docker build -f docker/api/Dockerfile.prod -t trafficjamz-server:latest .
ENDSSH

# Step 4: Stop old container
echo ""
echo "🛑 Step 4: Stopping old container..."
ssh $SERVER << 'ENDSSH'
docker stop trafficjamz 2>/dev/null || true
docker rm trafficjamz 2>/dev/null || true
ENDSSH

# Step 5: Start new container
echo ""
echo "▶️  Step 5: Starting new container..."
ssh $SERVER << 'ENDSSH'
cd /root/TrafficJamz
docker run -d \
  --name trafficjamz \
  --restart=unless-stopped \
  -p 10000:10000 \
  -p 40000-40100:40000-40100/tcp \
  -p 40000-40100:40000-40100/udp \
  --env-file jamz-server/.env.local \
  trafficjamz-server:latest
ENDSSH

# Step 6: Wait for startup
echo ""
echo "⏳ Step 6: Waiting for server to start..."
sleep 10

# Step 7: Verify deployment
echo ""
echo "✅ Step 7: Verifying deployment..."
ssh $SERVER << 'ENDSSH'
# Check if container is running
if ! docker ps | grep -q trafficjamz; then
    echo "❌ Container is not running!"
    docker logs trafficjamz --tail 50
    exit 1
fi

# Check if server is listening
if ! ss -tlnp | grep -q 10000; then
    echo "❌ Server is not listening on port 10000!"
    docker logs trafficjamz --tail 50
    exit 1
fi

# Check health endpoint
if curl -sf http://localhost:10000/api/health > /dev/null; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed!"
    docker logs trafficjamz --tail 50
    exit 1
fi

# Show recent logs
echo ""
echo "📋 Recent logs:"
docker logs trafficjamz --tail 20
ENDSSH

echo ""
echo "=========================================="
echo "🎉 Deployment completed successfully!"
echo ""
echo "Test the API:"
echo "  curl https://trafficjamz.v2u.us/api/health"
echo ""
echo "View logs:"
echo "  ssh $SERVER 'docker logs trafficjamz -f'"
