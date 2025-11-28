#!/bin/bash
# Database Restoration Script for TrafficJamz
# Restores PostgreSQL and MongoDB from backups

set -e

BACKUP_DIR="/root/backups/trafficjamz"

echo "🔄 Database Restoration Script"
echo "=============================="

# Function to list available backups
list_backups() {
    echo ""
    echo "📁 Available PostgreSQL backups:"
    ls -lh "$BACKUP_DIR"/postgres_*.backup.gz 2>/dev/null | tail -10 || echo "No PostgreSQL backups found"
    
    echo ""
    echo "📁 Available MongoDB backups:"
    ls -lh "$BACKUP_DIR"/mongodb_*.tar.gz 2>/dev/null | tail -10 || echo "No MongoDB backups found"
}

# Function to restore PostgreSQL
restore_postgres() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        echo "❌ Backup file not found: $backup_file"
        exit 1
    fi
    
    echo "⚠️  WARNING: This will restore PostgreSQL from backup!"
    echo "Backup file: $backup_file"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Restoration cancelled"
        exit 0
    fi
    
    echo "🔄 Decompressing backup..."
    gunzip -c "$backup_file" > /tmp/postgres_restore.backup
    
    echo "🔄 Restoring PostgreSQL..."
    PGPASSWORD='topgun123' pg_restore \
      -h aws-0-us-east-1.pooler.supabase.com \
      -p 6543 \
      -U postgres.ohbuqqvhxqqilpjrqxhr \
      -d postgres \
      --clean \
      --if-exists \
      --no-owner --no-acl \
      /tmp/postgres_restore.backup
    
    rm /tmp/postgres_restore.backup
    echo "✅ PostgreSQL restoration completed"
}

# Function to restore MongoDB
restore_mongodb() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        echo "❌ Backup file not found: $backup_file"
        exit 1
    fi
    
    echo "⚠️  WARNING: This will restore MongoDB from backup!"
    echo "Backup file: $backup_file"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Restoration cancelled"
        exit 0
    fi
    
    echo "🔄 Extracting backup..."
    mkdir -p /tmp/mongodb_restore
    tar -xzf "$backup_file" -C /tmp/mongodb_restore
    
    echo "🔄 Restoring MongoDB..."
    mongorestore \
      --uri="mongodb+srv://richcobrien:1MongoDB123$@trafficjam.xk2uszk.mongodb.net/trafficjamz" \
      --drop \
      --gzip \
      /tmp/mongodb_restore/mongodb_*/trafficjamz
    
    rm -rf /tmp/mongodb_restore
    echo "✅ MongoDB restoration completed"
}

# Main script
case "$1" in
    list)
        list_backups
        ;;
    restore-postgres)
        if [ -z "$2" ]; then
            echo "Usage: $0 restore-postgres <backup_file>"
            list_backups
            exit 1
        fi
        restore_postgres "$2"
        ;;
    restore-mongodb)
        if [ -z "$2" ]; then
            echo "Usage: $0 restore-mongodb <backup_file>"
            list_backups
            exit 1
        fi
        restore_mongodb "$2"
        ;;
    *)
        echo "Usage: $0 {list|restore-postgres|restore-mongodb} [backup_file]"
        echo ""
        echo "Commands:"
        echo "  list                          - List available backups"
        echo "  restore-postgres <file>       - Restore PostgreSQL from backup"
        echo "  restore-mongodb <file>        - Restore MongoDB from backup"
        echo ""
        echo "Examples:"
        echo "  $0 list"
        echo "  $0 restore-postgres $BACKUP_DIR/postgres_20250113_120000.backup.gz"
        echo "  $0 restore-mongodb $BACKUP_DIR/mongodb_20250113_120000.tar.gz"
        exit 1
        ;;
esac
