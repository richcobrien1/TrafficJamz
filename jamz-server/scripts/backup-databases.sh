#!/bin/bash
# Database Backup Script for TrafficJamz
# Runs daily backups of PostgreSQL and MongoDB Atlas

set -e

BACKUP_DIR="/root/backups/trafficjamz"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backups at $(date)"

# PostgreSQL Backup
echo "📊 Backing up PostgreSQL..."
PGPASSWORD='topgun123' pg_dump \
  -h aws-0-us-east-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.ohbuqqvhxqqilpjrqxhr \
  -d postgres \
  --no-owner --no-acl \
  -F c \
  -f "$BACKUP_DIR/postgres_${DATE}.backup"

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL backup successful: postgres_${DATE}.backup"
    # Compress the backup
    gzip "$BACKUP_DIR/postgres_${DATE}.backup"
    echo "✅ PostgreSQL backup compressed"
else
    echo "❌ PostgreSQL backup failed"
    exit 1
fi

# MongoDB Atlas Backup (using mongodump)
echo "📊 Backing up MongoDB Atlas..."
mongodump \
  --uri="mongodb+srv://richcobrien:***REDACTED***@trafficjam.xk2uszk.mongodb.net/trafficjamz" \
  --out="$BACKUP_DIR/mongodb_${DATE}" \
  --gzip

if [ $? -eq 0 ]; then
    echo "✅ MongoDB backup successful: mongodb_${DATE}"
    # Create tar archive
    cd "$BACKUP_DIR"
    tar -czf "mongodb_${DATE}.tar.gz" "mongodb_${DATE}"
    rm -rf "mongodb_${DATE}"
    echo "✅ MongoDB backup compressed"
else
    echo "❌ MongoDB backup failed"
    exit 1
fi

# Clean up old backups (older than RETENTION_DAYS)
echo "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "postgres_*.backup.gz" -mtime +${RETENTION_DAYS} -delete
find "$BACKUP_DIR" -name "mongodb_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

# List recent backups
echo "📁 Recent backups:"
ls -lh "$BACKUP_DIR" | tail -10

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "💾 Total backup size: $TOTAL_SIZE"

echo "✅ Backup completed successfully at $(date)"

# Send backup notification (optional - can integrate with email/SMS)
echo "📧 Backup notification: PostgreSQL and MongoDB backups completed on $(date)" >> "$BACKUP_DIR/backup.log"
