# CRITICAL SECURITY INCIDENT - Exposed Credentials

**Date:** November 30, 2025  
**Severity:** CRITICAL  
**Status:** IN PROGRESS

## Issue
Production credentials were accidentally committed to git in commit `d4d7511d` and pushed to GitHub.

## Exposed Credentials
1. **MongoDB Atlas**
   - URI: `mongodb+srv://richcobrien:1TrafficJamz123@trafficjam.xk2uszk.mongodb.net/`
   - User: `richcobrien`
   - Password: `1TrafficJamz123`
   - Cluster: `trafficjam.xk2uszk.mongodb.net`

2. **PostgreSQL/Supabase**
   - Host: `db.nrlaqkpojtvvheosnpaz.supabase.co`
   - Password 1: `topgun`
   - Password 2: `tMRyyxjADUl63z44`
   - Port: 5432 and 6543

3. **InfluxDB**
   - Token 1: `ZttzsuLcxV5ZqAZxZ5DIOQtEzG4VWgqKNqvSp-YNbRWnIQiHm-YbFG49DOT9UDP8WBInb9JR4NcFAafb3BOVMw==`
   - Token 2: `lf6L-WIkl8-BREIpcNkhNKERMHQd0M03ATZuydYYruY0kJh6K5gmj_HnyLKZdOwCxuhYFyOq8sjdylzx_KTQ9A==`
   - URL: `https://us-east-1-1.aws.cloud2.influxdata.com`

## Actions Taken
- [x] Created `.env.prod.example` templates without credentials
- [x] Removed `.env.prod` and `.env.local` from git tracking
- [x] Committed security fix to main branch
- [ ] **DO NOT PUSH YET** - Git history still contains credentials

## IMMEDIATE ACTIONS REQUIRED

### 1. Clean Git History (BEFORE PUSHING)
```bash
# Option A: Using BFG Repo Cleaner (RECOMMENDED - faster)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files '.env.prod' .
java -jar bfg.jar --delete-files '.env.local' .
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Option B: Using git filter-branch
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.prod jamz-server/.env.prod jamz-server/.env.local" \
  --prune-empty --tag-name-filter cat -- --all
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### 2. Force Push (DANGEROUS - COORDINATE WITH TEAM)
```bash
git push origin --force --all
git push origin --force --tags
```

### 3. Rotate ALL Credentials

#### MongoDB Atlas
1. Log in to https://cloud.mongodb.com/
2. Go to Database Access
3. Delete user `richcobrien` OR change password
4. Create new user with strong password
5. Update local `.env.prod` files (NOT IN GIT)

#### Supabase/PostgreSQL
1. Log in to https://supabase.com/dashboard
2. Go to Settings > Database
3. Reset database password
4. Update local `.env.prod` files (NOT IN GIT)

#### InfluxDB
1. Log in to https://cloud2.influxdata.com/
2. Go to Load Data > API Tokens
3. Revoke both exposed tokens
4. Generate new tokens
5. Update local `.env.prod` files (NOT IN GIT)

### 4. Review GitHub Security Alerts
1. Visit: https://github.com/richcobrien1/TrafficJamz/security
2. Mark all alerts as "Revoked" after rotating credentials
3. Review any other exposed secrets (10 total alerts mentioned)

## Prevention Measures
- [x] `.gitignore` already configured correctly
- [ ] Consider using environment variable management service (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] Add pre-commit hook to prevent credential commits
- [ ] Enable GitHub secret scanning push protection
- [ ] Regular security audits

## Timeline
- **15:29 Nov 30**: Credentials committed in d4d7511d
- **[Current Time]**: Issue discovered
- **[Current Time]**: Files removed from tracking
- **PENDING**: Git history purge
- **PENDING**: Credential rotation
- **PENDING**: Force push

## Notes
- The `.gitignore` was correctly configured but files were already tracked
- Must use `git rm --cached` to untrack without deleting local files
- Git history contains full credential exposure - MUST be purged
