#!/bin/bash
# List all environment variable backups with details
# Usage: ./list-env-backups.sh [container-name]

CONTAINER_NAME="${1:-trafficjamz}"
BACKUP_DIR="./env-backups"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ No backup directory found: $BACKUP_DIR"
    exit 1
fi

echo "📦 Environment Variable Backups for: $CONTAINER_NAME"
echo "📁 Location: $BACKUP_DIR"
echo ""

# Count total backups
TOTAL=$(find "$BACKUP_DIR" -name "${CONTAINER_NAME}_env_*.sh" -type f | wc -l)
echo "Total backups: $TOTAL"
echo ""

# List backups with details
echo "Date                 Time      Size    File"
echo "─────────────────────────────────────────────────────────────────"
find "$BACKUP_DIR" -name "${CONTAINER_NAME}_env_*.sh" -type f -printf '%TY-%Tm-%Td  %TH:%TM  %10s  %f\n' | sort -r

echo ""

# Show latest backup link
if [ -L "${BACKUP_DIR}/${CONTAINER_NAME}_env_latest.sh" ]; then
    LATEST=$(readlink "${BACKUP_DIR}/${CONTAINER_NAME}_env_latest.sh")
    echo "➜ Latest backup: $LATEST"
fi

echo ""
echo "Usage examples:"
echo "  View backup:    cat $BACKUP_DIR/${CONTAINER_NAME}_env_latest.sh"
echo "  Restore latest: ./restore-env.sh $BACKUP_DIR/${CONTAINER_NAME}_env_latest.sh"
echo "  Restore specific: ./restore-env.sh $BACKUP_DIR/${CONTAINER_NAME}_env_YYYYMMDD_HHMMSS.sh"
