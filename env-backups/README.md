# Environment Variable Backup System

## Overview
Automated backup and restore system for Docker container environment variables with 30-day rotation.

## Scripts

### 1. Backup Environment Variables
```bash
./scripts/backup-env.sh [container-name]
```
- Exports all environment variables from running/stopped container
- Creates timestamped backup file
- Maintains 30-day rotation (auto-deletes old backups)
- Creates `*_latest.sh` symlink to most recent backup

**Example:**
```bash
./scripts/backup-env.sh trafficjamz
```

### 2. Restore Environment Variables
```bash
./scripts/restore-env.sh <backup-file> [container-name] [image-name]
```
- Restores container with environment variables from backup
- Stops and removes existing container
- Creates new container with all backed-up environment variables

**Examples:**
```bash
# Restore from latest backup
./scripts/restore-env.sh ./env-backups/trafficjamz_env_latest.sh

# Restore from specific date
./scripts/restore-env.sh ./env-backups/trafficjamz_env_20251130_143022.sh trafficjamz trafficjamz-server:latest
```

### 3. List Backups
```bash
./scripts/list-env-backups.sh [container-name]
```
- Shows all available backups with timestamps and sizes
- Displays latest backup link
- Provides usage examples

### 4. Automatic Backups (Cron)
```bash
# Install daily automatic backup (2 AM)
./scripts/auto-backup-cron.sh install

# Check status and view logs
./scripts/auto-backup-cron.sh status

# Uninstall automatic backup
./scripts/auto-backup-cron.sh uninstall
```

## Backup File Format
Backup files are executable shell scripts containing `export` statements:
```bash
export JWT_SECRET=eyJhbGciOiJIUzI1NiJ9...
export YOUTUBE_API_KEY=AIzaSyAvP58n6RhOv...
export SUPABASE_URL=https://wfkopbojgxfpuwmkzhse.supabase.co
...
```

## Retention Policy
- **Automatic deletion:** Backups older than 30 days are automatically removed
- **Storage location:** `./env-backups/`
- **Naming convention:** `{container}_env_{YYYYMMDD_HHMMSS}.sh`

## Quick Recovery Procedure

### If container crashes or environment variables are lost:

1. **List available backups:**
   ```bash
   ./scripts/list-env-backups.sh
   ```

2. **Restore from latest backup:**
   ```bash
   ./scripts/restore-env.sh ./env-backups/trafficjamz_env_latest.sh
   ```

3. **Verify restoration:**
   ```bash
   ssh root@157.230.165.156 'docker exec trafficjamz printenv | grep -E "JWT_SECRET|SUPABASE|YOUTUBE"'
   ```

## Manual Backup Before Critical Changes

**ALWAYS backup before:**
- Adding new environment variables
- Updating container image
- Changing deployment configuration
- Testing new features

```bash
# Create backup with descriptive name
./scripts/backup-env.sh trafficjamz
# Backup saved as: trafficjamz_env_20251130_143022.sh
```

## Security Notes
- ⚠️ Backup files contain sensitive credentials
- ✅ Add `env-backups/` to `.gitignore` (already configured)
- ✅ Never commit backup files to version control
- ✅ Store backups in secure location only
- ✅ Set proper file permissions (chmod 600)

## Disaster Recovery

### Complete System Restoration:
```bash
# 1. List backups to find desired restore point
./scripts/list-env-backups.sh

# 2. Restore container environment
./scripts/restore-env.sh ./env-backups/trafficjamz_env_20251130_120000.sh

# 3. Verify all services
ssh root@157.230.165.156 'docker logs trafficjamz 2>&1 | tail -30'
```

### Roll Back to Previous Day:
```bash
# Find yesterday's backup
ls -lt ./env-backups/ | grep $(date -d yesterday +%Y%m%d)

# Restore it
./scripts/restore-env.sh ./env-backups/trafficjamz_env_YYYYMMDD_*.sh
```

## Monitoring

Check backup health:
```bash
# View backup status
./scripts/auto-backup-cron.sh status

# Check backup log
tail -f /var/log/trafficjamz-env-backup.log

# Verify latest backup
cat ./env-backups/trafficjamz_env_latest.sh | grep -c "export"
```

## Troubleshooting

### Backup failed
- Check SSH access to server: `ssh root@157.230.165.156 'docker ps'`
- Verify container exists: `docker ps -a | grep trafficjamz`
- Check disk space: `df -h`

### Restore failed
- Verify backup file exists and is readable
- Check backup file format: `head ./env-backups/trafficjamz_env_latest.sh`
- Ensure Docker image is available: `ssh root@157.230.165.156 'docker images | grep trafficjamz-server'`

### Missing environment variables after restore
- Compare backup with running container: `diff <(sort backup.sh) <(ssh root@157.230.165.156 'docker exec trafficjamz printenv | sort')`
- Re-run restore with verbose output
