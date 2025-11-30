#!/bin/bash
# Backup Docker container environment variables with 30-day rotation
# Usage: ./backup-env.sh [container-name]

set -e

CONTAINER_NAME="${1:-trafficjamz}"
BACKUP_DIR="./env-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${CONTAINER_NAME}_env_${TIMESTAMP}.sh"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔒 Backing up environment variables for container: $CONTAINER_NAME"

# Check if container exists
if ! ssh root@157.230.165.156 "docker ps -a --format '{{.Names}}' | grep -q '^${CONTAINER_NAME}$'"; then
    echo "❌ Container $CONTAINER_NAME not found"
    exit 1
fi

# Extract environment variables from running/stopped container
ssh root@157.230.165.156 "docker inspect $CONTAINER_NAME --format='{{range \$index, \$value := .Config.Env}}export {{\$value}}
{{end}}'" > "$BACKUP_FILE"

# Make backup executable
chmod +x "$BACKUP_FILE"

echo "✅ Environment variables backed up to: $BACKUP_FILE"
echo "📊 Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Create latest symlink
ln -sf "$(basename "$BACKUP_FILE")" "${BACKUP_DIR}/${CONTAINER_NAME}_env_latest.sh"

# Clean up old backups (older than RETENTION_DAYS)
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "${CONTAINER_NAME}_env_*.sh" -type f -mtime +$RETENTION_DAYS -delete

# List remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "${CONTAINER_NAME}_env_*.sh" -type f | wc -l)
echo "📦 Total backups: $BACKUP_COUNT"
echo ""
echo "Recent backups:"
ls -lht "$BACKUP_DIR"/${CONTAINER_NAME}_env_*.sh | head -5

echo ""
echo "💾 Backup complete!"
