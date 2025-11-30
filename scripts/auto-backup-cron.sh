#!/bin/bash
# Setup automatic daily backups via cron
# Usage: ./auto-backup-cron.sh [install|uninstall|status]

set -e

ACTION="${1:-install}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-env.sh"
CRON_TIME="0 2 * * *"  # 2 AM daily
CRON_JOB="$CRON_TIME cd $(dirname "$SCRIPT_DIR") && $BACKUP_SCRIPT >> /var/log/trafficjamz-env-backup.log 2>&1"

case "$ACTION" in
    install)
        echo "📅 Installing automatic daily environment backup..."
        
        # Check if cron job already exists
        if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
            echo "⚠️  Cron job already exists. Removing old entry..."
            crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
        fi
        
        # Add new cron job
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        
        echo "✅ Automatic backup installed!"
        echo "⏰ Schedule: Daily at 2:00 AM"
        echo "📝 Log file: /var/log/trafficjamz-env-backup.log"
        echo ""
        echo "Current crontab:"
        crontab -l | grep "$BACKUP_SCRIPT"
        ;;
        
    uninstall)
        echo "🗑️  Removing automatic backup..."
        if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
            crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
            echo "✅ Automatic backup removed"
        else
            echo "ℹ️  No automatic backup found"
        fi
        ;;
        
    status)
        echo "📊 Automatic Backup Status"
        echo ""
        if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
            echo "✅ Status: ACTIVE"
            echo "⏰ Schedule:"
            crontab -l | grep "$BACKUP_SCRIPT"
            echo ""
            echo "📝 Recent log entries:"
            tail -20 /var/log/trafficjamz-env-backup.log 2>/dev/null || echo "No log file found"
        else
            echo "❌ Status: NOT INSTALLED"
            echo ""
            echo "To install: $0 install"
        fi
        ;;
        
    *)
        echo "Usage: $0 [install|uninstall|status]"
        echo ""
        echo "Commands:"
        echo "  install   - Setup automatic daily backups at 2 AM"
        echo "  uninstall - Remove automatic backups"
        echo "  status    - Check backup status and view logs"
        exit 1
        ;;
esac
