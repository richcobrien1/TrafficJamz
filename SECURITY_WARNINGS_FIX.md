# Security Warnings Fix Guide

## Summary
This guide addresses all 6 security warnings from Supabase database linter.

---

## ✅ Issues 1-3: Function Search Path (AUTOMATED FIX)

**Status:** Automated fix ready

### What's the problem?
Functions without `search_path` set are vulnerable to search path injection attacks.

### Affected Functions:
- `is_group_member`
- `is_group_admin`
- `update_group_timestamp`

### How to fix:
```bash
cd jamz-server
node fix-function-security.js
```

This will:
- Add `SECURITY DEFINER` to all functions
- Set `search_path = public` to prevent injection
- Recreate necessary triggers
- Verify all fixes applied correctly

---

## ⚠️ Issue 4: Leaked Password Protection (MANUAL CONFIG)

**Status:** Requires Supabase Dashboard configuration

### What's the problem?
Password leak checking against HaveIBeenPwned.org is disabled, allowing users to use compromised passwords.

### How to fix:

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **TrafficJamz**
3. Navigate to: **Authentication** → **Policies**
4. Find: **Password Security** section
5. Enable: **"Check against leaked passwords"**
6. Save changes

**Alternative (via Supabase API):**
```bash
# Update auth config
curl -X PATCH 'https://api.supabase.com/v1/projects/YOUR_PROJECT_REF/config/auth' \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "SECURITY_PASSWORD_HIBP_ENABLED": true
  }'
```

**Documentation:**
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

---

## ⚠️ Issue 5: Insufficient MFA Options (MANUAL CONFIG)

**Status:** Requires Supabase Dashboard configuration

### What's the problem?
Only one MFA method enabled. Multiple options improve security.

### Recommended MFA Methods:
1. ✅ **TOTP (Time-based One-Time Password)** - Google Authenticator, Authy
2. ✅ **Phone (SMS)** - Via Twilio/Vonage (you already have Vonage configured!)
3. ⚠️ **WebAuthn** - Hardware keys (optional)

### How to fix:

#### Option 1: Enable Phone/SMS MFA (Recommended - You have Vonage!)

1. Go to Supabase Dashboard
2. Navigate to: **Authentication** → **Providers**
3. Scroll to: **Phone Auth**
4. Enable: **Phone Sign-ups**
5. Configure SMS provider: **Twilio** or **Vonage**
6. Use your existing Vonage credentials from `.env`:
   ```
   VONAGE_API_KEY=your_key
   VONAGE_API_SECRET=your_secret
   VONAGE_SENDER_NUMBER=your_number
   ```

#### Option 2: Enable TOTP MFA

1. Already enabled by default in Supabase Auth
2. Verify in: **Authentication** → **Policies** → **Multi-Factor Authentication**
3. Make sure **"Enable TOTP"** is checked

#### Option 3: Enable WebAuthn (Optional - Advanced)

1. Navigate to: **Authentication** → **Policies**
2. Under **Multi-Factor Authentication**
3. Enable: **"WebAuthn/FIDO2"**
4. Configure allowed origins

**Documentation:**
- https://supabase.com/docs/guides/auth/auth-mfa
- https://supabase.com/docs/guides/auth/phone-login

---

## ⚠️ Issue 6: Vulnerable Postgres Version (DATABASE UPGRADE)

**Status:** Requires Supabase Platform action

### What's the problem?
Current version: `supabase-postgres-15.8.1.121`
Security patches available in newer versions.

### How to fix:

1. Go to Supabase Dashboard
2. Navigate to: **Settings** → **Infrastructure**
3. Find: **Database Version**
4. Click: **"Upgrade Available"** (if shown)
5. Review release notes
6. Schedule maintenance window
7. Click: **"Upgrade Database"**

**⚠️ IMPORTANT:**
- Backup your database first
- Schedule during low-traffic hours
- Expect 1-5 minutes downtime
- Test thoroughly after upgrade

**Backup Command (before upgrade):**
```bash
# Using pg_dump
pg_dump -h db.your-project-ref.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f trafficjamz_backup_$(date +%Y%m%d_%H%M%S).dump

# Or use Supabase Dashboard: Database → Backups → Create Backup
```

**Documentation:**
https://supabase.com/docs/guides/platform/upgrading

---

## Quick Fix Summary

### Run this now (Fixes issues 1-3):
```bash
cd jamz-server
node fix-function-security.js
```

### Configure manually in Supabase Dashboard:

**Issue 4: Leaked Password Protection**
- Dashboard → Authentication → Policies → Enable "Check against leaked passwords"

**Issue 5: MFA Options**
- Dashboard → Authentication → Providers → Enable Phone Auth (use your Vonage config)
- Dashboard → Authentication → Policies → Verify TOTP enabled

**Issue 6: Postgres Upgrade**
- Dashboard → Settings → Infrastructure → Upgrade Database
- (Backup first!)

---

## Verification

After applying all fixes, check Supabase Dashboard:
1. Go to: **Database** → **Linter**
2. Click: **"Run Linter"**
3. Verify: All security warnings resolved ✅

---

## Questions?

- Function fixes: Check `sql/migrations/010_fix_function_search_path.sql`
- Auth config: https://supabase.com/docs/guides/auth
- Database upgrade: https://supabase.com/docs/guides/platform/upgrading
