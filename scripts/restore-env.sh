#!/bin/bash
# Restore Docker container environment variables from backup
# Usage: ./restore-env.sh [backup-file] [container-name]

set -e

BACKUP_FILE="$1"
CONTAINER_NAME="${2:-trafficjamz}"
IMAGE_NAME="${3:-trafficjamz-server:latest}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file> [container-name] [image-name]"
    echo ""
    echo "Available backups:"
    ls -lht ./env-backups/*.sh 2>/dev/null || echo "No backups found"
    echo ""
    echo "Example: $0 ./env-backups/trafficjamz_env_latest.sh"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Restoring environment variables for container: $CONTAINER_NAME"
echo "📁 From backup: $BACKUP_FILE"
echo ""

# Source the backup file to load environment variables
source "$BACKUP_FILE"

# Build docker run command with all environment variables
DOCKER_CMD="docker run -d --name $CONTAINER_NAME --restart unless-stopped -p 10000:10000"

# Extract all exported variables from backup and add to docker command
while IFS='=' read -r key value; do
    if [[ $key == export* ]]; then
        # Remove 'export ' prefix
        key="${key#export }"
        # Skip PATH and system variables
        if [[ ! "$key" =~ ^(PATH|HOME|HOSTNAME|PWD|SHLVL|_)$ ]]; then
            # Remove quotes if present
            value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/")
            DOCKER_CMD="$DOCKER_CMD -e \"$key=$value\""
        fi
    fi
done < "$BACKUP_FILE"

# Add volume mounts
DOCKER_CMD="$DOCKER_CMD -v /root/trafficjamz/logs:/app/logs -v /root/trafficjamz/music:/app/music $IMAGE_NAME"

echo "🛑 Stopping and removing existing container..."
ssh root@157.230.165.156 "docker stop $CONTAINER_NAME 2>/dev/null || true"
ssh root@157.230.165.156 "docker rm $CONTAINER_NAME 2>/dev/null || true"

echo "🚀 Starting container with restored environment..."
ssh root@157.230.165.156 "$DOCKER_CMD"

echo ""
echo "⏳ Waiting for container to start..."
sleep 5

# Verify container is running
if ssh root@157.230.165.156 "docker ps --format '{{.Names}}' | grep -q '^${CONTAINER_NAME}$'"; then
    echo "✅ Container $CONTAINER_NAME restored successfully!"
    echo ""
    echo "📋 Container status:"
    ssh root@157.230.165.156 "docker ps --filter name=$CONTAINER_NAME"
    echo ""
    echo "📝 Recent logs:"
    ssh root@157.230.165.156 "docker logs $CONTAINER_NAME 2>&1 | tail -20"
else
    echo "❌ Container failed to start. Check logs:"
    ssh root@157.230.165.156 "docker logs $CONTAINER_NAME 2>&1 | tail -50"
    exit 1
fi
