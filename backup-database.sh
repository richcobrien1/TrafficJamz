#!/bin/bash
# TrafficJamz Database Backup Script
# Backs up Supabase PostgreSQL database using pg_dump

echo "🔐 TrafficJamz Database Backup Script"
echo "======================================"
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

# Set backup configuration
BACKUP_DIR="backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="trafficjamz_backup_${TIMESTAMP}.sql"
BACKUP_COMPRESSED="trafficjamz_backup_${TIMESTAMP}.sql.gz"

# Supabase connection details
DB_HOST="db.nrlaqkpojtvvheosnpaz.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="tMRyyxjADUl63z44"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📦 Backup Configuration:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Output: $BACKUP_DIR/$BACKUP_FILE"
echo ""

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "❌ ERROR: pg_dump is not installed!"
    echo "   Install PostgreSQL client tools:"
    echo "   - Windows: Download from https://www.postgresql.org/download/windows/"
    echo "   - Mac: brew install postgresql"
    echo "   - Linux: sudo apt-get install postgresql-client"
    exit 1
fi

echo "🚀 Starting database backup..."
echo ""

# Set password for pg_dump
export PGPASSWORD="$DB_PASSWORD"

# Run pg_dump
echo "⏳ Dumping database (this may take a few minutes)..."
pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --verbose \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  -f "$BACKUP_DIR/$BACKUP_FILE" 2>&1

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database backup completed successfully!"
    
    # Get file size
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo "   File: $BACKUP_FILE"
    echo "   Size: $BACKUP_SIZE"
    
    # Compress the backup
    echo ""
    echo "🗜️  Compressing backup..."
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        COMPRESSED_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_COMPRESSED" | cut -f1)
        echo "✅ Compression complete!"
        echo "   Compressed file: $BACKUP_COMPRESSED"
        echo "   Compressed size: $COMPRESSED_SIZE"
        
        # List recent backups
        echo ""
        echo "📋 Recent backups in $BACKUP_DIR:"
        ls -lht "$BACKUP_DIR" | head -6
        
        echo ""
        echo "✅ BACKUP COMPLETE!"
        echo ""
        echo "📍 Backup saved to: $BACKUP_DIR/$BACKUP_COMPRESSED"
        echo ""
        echo "💡 To restore this backup:"
        echo "   gunzip $BACKUP_DIR/$BACKUP_COMPRESSED"
        echo "   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f $BACKUP_DIR/$BACKUP_FILE"
        echo ""
    else
        echo "⚠️  Compression failed, but uncompressed backup is available"
        echo "   File: $BACKUP_DIR/$BACKUP_FILE"
    fi
else
    echo ""
    echo "❌ ERROR: Database backup failed!"
    echo "   Please check your connection details and try again."
    exit 1
fi

# Unset password
unset PGPASSWORD

echo "🎉 Done!"
