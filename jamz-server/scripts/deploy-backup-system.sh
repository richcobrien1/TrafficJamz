#!/bin/bash
# Deploy Backup System for TrafficJamz
# Sets up automated daily backups and MongoDB→PostgreSQL sync

set -e

echo "🚀 Deploying TrafficJamz Backup System"
echo "======================================"

# 1. Install required tools
echo "📦 Installing backup tools..."
apt-get update -qq
apt-get install -y postgresql-client mongodb-database-tools cron

# 2. Create backup directory
echo "📁 Creating backup directory..."
mkdir -p /root/backups/trafficjamz
chmod 700 /root/backups/trafficjamz

# 3. Copy backup scripts to server
echo "📋 Installing backup scripts..."
cp jamz-server/scripts/backup-databases.sh /usr/local/bin/backup-trafficjamz
cp jamz-server/scripts/restore-databases.sh /usr/local/bin/restore-trafficjamz
chmod +x /usr/local/bin/backup-trafficjamz
chmod +x /usr/local/bin/restore-trafficjamz

# 4. Set up cron job for daily backups (2 AM daily)
echo "⏰ Setting up daily backup cron job..."
(crontab -l 2>/dev/null | grep -v backup-trafficjamz; echo "0 2 * * * /usr/local/bin/backup-trafficjamz >> /root/backups/trafficjamz/backup.log 2>&1") | crontab -

# 5. Run initial backup
echo "🔄 Running initial backup..."
/usr/local/bin/backup-trafficjamz

# 6. Display backup info
echo ""
echo "✅ Backup system deployed successfully!"
echo ""
echo "📊 Backup Configuration:"
echo "  - Backup directory: /root/backups/trafficjamz"
echo "  - Schedule: Daily at 2:00 AM"
echo "  - Retention: 30 days"
echo "  - Backup script: /usr/local/bin/backup-trafficjamz"
echo "  - Restore script: /usr/local/bin/restore-trafficjamz"
echo ""
echo "📝 Manual Commands:"
echo "  - Run backup now:     /usr/local/bin/backup-trafficjamz"
echo "  - List backups:       /usr/local/bin/restore-trafficjamz list"
echo "  - Restore PostgreSQL: /usr/local/bin/restore-trafficjamz restore-postgres <file>"
echo "  - Restore MongoDB:    /usr/local/bin/restore-trafficjamz restore-mongodb <file>"
echo "  - View backup logs:   tail -f /root/backups/trafficjamz/backup.log"
echo ""
echo "✅ Setup complete!"
