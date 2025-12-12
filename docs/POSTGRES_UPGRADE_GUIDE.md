# Supabase PostgreSQL Upgrade Guide

## Current Status
- **Database Version**: PostgreSQL 15.8 (supabase-postgres-15.8.1.121)
- **Project ID**: nrlaqkpojtvvheosnpaz
- **Backup Status**: ✅ **COMPLETED** 
  - File: `trafficjamz_backup_2025-12-12T02-14-24.sql`
  - Size: 0.03 MB
  - Tables: 10 backed up
  - Functions: 4 backed up
  - Location: `backups/database/`

## Security Warning Context
The Supabase linter identified that your Postgres version has available security patches. This is warning #6 from the security audit.

---

## Upgrade Options

### Option 1: Dashboard Upgrade (Recommended) ⭐

**This is the easiest and safest method for Supabase-hosted databases.**

#### Steps:

1. **Access Dashboard**
   - URL: https://supabase.com/dashboard/project/nrlaqkpojtvvheosnpaz
   - Login with your Supabase credentials

2. **Navigate to Database Settings**
   - Click **Settings** (gear icon) in left sidebar
   - Select **Database** section
   - Look for **Infrastructure** or **Database version** panel

3. **Check Upgrade Availability**
   - Look for notification: "Upgrade available"
   - Review upgrade path:
     - **Minor upgrade**: 15.8 → 15.9 (low risk, recommended)
     - **Major upgrade**: 15.8 → 16.x (more testing required)
   - Click "View release notes" to see what's changed

4. **Review Pre-Upgrade Checklist**
   - ✅ Backup completed
   - ✅ Security fixes applied
   - ⚠️ Low traffic window identified
   - ⚠️ Maintenance window scheduled
   - ⚠️ Team notified of downtime

5. **Schedule & Execute Upgrade**
   - Click **"Schedule upgrade"** or **"Upgrade now"**
   - Choose maintenance window (recommend off-peak hours)
   - Confirm you have backup
   - Click **"Confirm upgrade"**
   - Monitor progress (typically 5-15 minutes)

6. **Post-Upgrade Verification**
   ```bash
   cd jamz-server
   node -e "
   const { Sequelize } = require('sequelize');
   require('dotenv').config({ path: '../.env' });
   const sequelize = new Sequelize('postgres', 'postgres', 'tMRyyxjADUl63z44', {
     host: 'db.nrlaqkpojtvvheosnpaz.supabase.co',
     port: 5432,
     dialect: 'postgres',
     logging: false,
     dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
   });
   (async () => {
     await sequelize.authenticate();
     const [r] = await sequelize.query('SELECT version();');
     console.log('New version:', r[0].version);
     await sequelize.close();
   })();
   "
   ```

---

### Option 2: Supabase CLI (Advanced)

**Note**: Supabase CLI cannot be installed via `npm install -g`. Use platform-specific installers.

#### Installation:

**Windows:**
```powershell
# Using Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or download from GitHub releases
# https://github.com/supabase/cli/releases
```

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Linux:**
```bash
# Using npm (npx)
npx supabase --version

# Or install binary
curl -sL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar xz
```

#### Usage After Installation:
```bash
# Login
supabase login

# List projects
supabase projects list

# Check upgrade options
supabase db upgrade --project-ref nrlaqkpojtvvheosnpaz --help

# Perform upgrade (if supported)
supabase db upgrade --project-ref nrlaqkpojtvvheosnpaz
```

---

### Option 3: Manual Migration (Not Recommended)

This involves creating a new Supabase project with the latest Postgres version and migrating data. **Only use this if dashboard upgrade is not available.**

---

## What to Expect

### During Upgrade (5-15 minutes)
- Database will be **temporarily unavailable**
- Active connections will be terminated
- No data loss (Supabase creates automatic backup)
- Progress visible in dashboard

### After Upgrade
- ✅ Latest security patches applied
- ✅ Performance improvements
- ✅ Bug fixes
- ⚠️ RLS policies remain intact
- ⚠️ Functions remain intact
- ⚠️ Extensions remain intact

### Possible Issues
- **Minor version (15.8 → 15.9)**: Usually seamless, no schema changes
- **Major version (15.x → 16.x)**: May require:
  - Extension updates
  - Function rewrites (rare)
  - Query plan changes (performance testing recommended)

---

## Rollback Plan

**Important**: Postgres upgrades cannot be automatically rolled back.

If issues occur after upgrade:
1. **Use your backup** to restore to previous version
2. **Contact Supabase support** for assistance
3. **Restore steps**:
   ```bash
   # If you need to restore (only as last resort)
   psql -h db.nrlaqkpojtvvheosnpaz.supabase.co \
        -U postgres \
        -d postgres \
        -f backups/database/trafficjamz_backup_2025-12-12T02-14-24.sql
   ```

---

## Post-Upgrade Testing Checklist

Run these tests after upgrade:

```bash
# 1. Test database connectivity
cd jamz-server
node -e "require('./test-db-connection.js')"

# 2. Verify RLS policies
node -e "require('./enable-rls-password-reset.js')"

# 3. Verify function security
node -e "require('./fix-function-security.js')"

# 4. Run application smoke tests
npm test  # if you have tests

# 5. Check for warnings
# Re-run Supabase linter in dashboard
```

---

## Timeline Recommendation

### Immediate (Now)
- ✅ Backup completed
- ✅ Security fixes applied
- ✅ Upgrade guide prepared

### Next 24 Hours
1. Access Supabase Dashboard
2. Review available upgrade options
3. Read release notes for target version
4. Identify low-traffic maintenance window

### During Maintenance Window
1. Notify users of brief downtime
2. Execute upgrade via dashboard
3. Monitor progress
4. Run post-upgrade tests
5. Verify application functionality

### Post-Upgrade
1. Monitor application logs for issues
2. Check performance metrics
3. Re-run Supabase linter
4. Update documentation
5. Document any issues encountered

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs/guides/platform/migrating-and-upgrading-projects
- **Supabase Support**: https://supabase.com/dashboard/support/new
- **Community**: https://github.com/supabase/supabase/discussions
- **Status**: https://status.supabase.com/

---

## Next Steps

**Your immediate next action:**

🌐 **Open Supabase Dashboard**: https://supabase.com/dashboard/project/nrlaqkpojtvvheosnpaz

Look for the upgrade notification in the Database settings or Infrastructure section. The dashboard will show you exactly what version is available and guide you through the upgrade process.

✅ **You're prepared** - your backup is ready, so you can safely proceed!
