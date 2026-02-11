# TrafficJamz Deployment Guide

**Last Updated:** February 9, 2026

This guide documents the complete deployment workflow for TrafficJamz, including frontend, backend, and database updates.

---

## Table of Contents

1. [Platform Architecture](#platform-architecture)
2. [Frontend Deployment](#frontend-deployment)
3. [Backend Deployment](#backend-deployment)
4. [Database Migrations](#database-migrations)
5. [Environment Variables](#environment-variables)
6. [Testing & Verification](#testing--verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Common Issues & Solutions](#common-issues--solutions)

---

## Platform Architecture

### Frontend
- **Framework:** React 19.1.0 + Vite 5.4.20
- **Hosting:** Vercel
- **Domain:** https://jamz.v2u.us
- **Authentication:** Clerk (@clerk/clerk-react v5.60.0)
- **Deployment:** Auto-deploy from `main` branch via GitHub integration

### Backend
- **Framework:** Express.js (Node.js)
- **Hosting:** DigitalOcean Droplet (164.90.150.115)
- **Container:** Docker via docker-compose
- **Domain:** https://trafficjamz.v2u.us/api
- **Databases:** PostgreSQL (users), MongoDB (groups/locations)
- **Deployment:** GitHub Actions → Docker Registry → Manual pull on droplet

### Infrastructure
- **Repository:** https://github.com/richcobrien1/TrafficJamz
- **Container Registry:** ghcr.io/richcobrien1/trafficjamz-jamz-server
- **CI/CD:** GitHub Actions (.github/workflows/)

---

## Frontend Deployment

### Automatic Deployment (Recommended)

**Process:**
1. Make changes to files in `jamz-client-vite/`
2. Commit and push to `main` branch
3. Vercel automatically builds and deploys (1-2 minutes)
4. Verify at https://jamz.v2u.us

**Commands:**
```bash
cd jamz-client-vite
# Make your changes
git add .
git commit -m "feat: Description of changes"
git push origin main
```

**Verification:**
```bash
# Watch deployment
vercel --prod --confirm
# Or check Vercel dashboard
```

### Manual Deployment (GitHub Issues)

If GitHub has outages (500 errors), use Vercel CLI directly:

```bash
cd jamz-client-vite
vercel --prod --confirm
# Follow prompts, select production environment
```

### Environment Variables

Update in Vercel dashboard (Settings → Environment Variables):

**Required:**
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk public key (pk_test_... or pk_live_...)

**After updating:**
1. Trigger redeploy in Vercel dashboard
2. Or push an empty commit: `git commit --allow-empty -m "chore: Trigger redeploy"`

---

## Backend Deployment

### Overview

Backend deployment is a **three-step process:**
1. **Build:** GitHub Actions builds Docker image
2. **Push:** Image pushed to ghcr.io container registry
3. **Deploy:** Manual pull and restart on droplet

### Step 1: Push Code Changes

```bash
cd jamz-server
# Make your changes
git add .
git commit -m "feat: Description of changes"
git push origin main
```

**This triggers:**
- GitHub Actions workflow: `.github/workflows/backend.yml`
- Docker image build (~5-10 minutes)
- Push to ghcr.io registry

### Step 2: Monitor Build

```bash
# Watch GitHub Actions build
gh run watch

# Or check specific run
gh run list --limit 1
gh run view <run-id>
```

**Success indicators:**
- ✅ All steps green
- ✅ "pushing manifest for ghcr.io/richcobrien1/trafficjamz-jamz-server:latest"

**If build fails:**
- Check for missing files (`require('./file')` without file in repo)
- Check for syntax errors
- Review logs: `gh run view <run-id> --log-failed`

### Step 3: Deploy to Droplet

**SSH to droplet:**
```bash
ssh root@164.90.150.115
```

**Pull latest code:**
```bash
cd /root/TrafficJamz
git pull origin main
```

**Pull new Docker image:**
```bash
docker pull ghcr.io/richcobrien1/trafficjamz-jamz-server:latest
```

**Restart backend container:**
```bash
cd /root/TrafficJamz
docker-compose down backend
docker-compose up -d backend
```

**Verify deployment:**
```bash
docker logs trafficjamz_backend_1 -f --tail 50
```

**Expected logs:**
```
✅ Server successfully started and listening on port 5000
✅ PostgreSQL connection established successfully
✅ MongoDB connection established successfully
```

**Test API:**
```bash
curl https://trafficjamz.v2u.us/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

## Database Migrations

### PostgreSQL Migrations

**Location:** `jamz-server/src/migrations/`

**Process:**

1. **Create migration file:**
   ```sql
   -- jamz-server/src/migrations/add-new-column.sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);
   CREATE INDEX IF NOT EXISTS idx_users_new_column ON users(new_column);
   ```

2. **Test locally (if possible):**
   ```bash
   psql -U trafficjamz -d trafficjamz_dev -f jamz-server/src/migrations/add-new-column.sql
   ```

3. **Deploy migration to production:**
   ```bash
   ssh root@164.90.150.115
   cd /root/TrafficJamz
   git pull origin main
   
   # Run migration
   psql -U trafficjamz -d trafficjamz_prod -f jamz-server/src/migrations/add-new-column.sql
   ```

4. **Verify schema changes:**
   ```bash
   psql -U trafficjamz -d trafficjamz_prod -c "\d users"
   ```

**⚠️ CRITICAL:**
- Migrations are NOT automatic - must be run manually on production
- Always include `IF NOT EXISTS` for idempotency
- Test on dev database first if possible
- Coordinate with code deployment (may need to run before or after backend restart)

### MongoDB Migrations

**Process:**
```bash
ssh root@164.90.150.115
mongo trafficjamz_prod --eval 'db.collection.updateMany({}, {$set: {newField: null}})'
```

---

## Environment Variables

### Frontend (.env.local - Vercel)

```bash
VITE_API_BASE_URL=https://trafficjamz.v2u.us/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Backend (.env.local - Droplet)

**Location:** `/root/TrafficJamz/.env.local`

**Critical variables:**
```bash
# Database
DATABASE_URL=postgresql://trafficjamz:password@localhost:5432/trafficjamz_prod
MONGODB_URI=mongodb://user:pass@localhost:27017/trafficjamz_prod

# Authentication
JWT_SECRET=...
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# External Services
INFLUXDB_URL=...
INFLUXDB_TOKEN=...
```

**After updating:**
```bash
ssh root@164.90.150.115
cd /root/TrafficJamz
vi .env.local
# Make changes
docker-compose restart backend
```

---

## Testing & Verification

### After Frontend Deployment

**1. Visual Check:**
- Navigate to https://jamz.v2u.us
- Check for console errors (F12)
- Test login/logout flow

**2. API Integration:**
- Open browser console
- Look for: `✅ Clerk token attached to request headers`
- Network tab: Verify API calls return 200 (not 401)

**3. Clerk Authentication:**
- Test registration: `/auth/register`
- Test email verification (check email)
- Test login: `/auth/login`
- Verify user created in Clerk dashboard

### After Backend Deployment

**1. Health Check:**
```bash
curl https://trafficjamz.v2u.us/api/health
```

**2. Database Connections:**
```bash
ssh root@164.90.150.115
docker logs trafficjamz_backend_1 --tail 100 | grep -E "PostgreSQL|MongoDB"
# Should see: ✅ PostgreSQL connection established
# Should see: ✅ MongoDB connection established
```

**3. Authentication Endpoints:**
```bash
# Test Clerk token validation (requires valid token)
curl -H "Authorization: Bearer <clerk-token>" https://trafficjamz.v2u.us/api/groups
```

**4. Application Testing:**
- Login at https://jamz.v2u.us
- Access dashboard
- Create/view groups
- Check location tracking
- Verify notifications

---

## Rollback Procedures

### Frontend Rollback

**Via Vercel Dashboard:**
1. Go to Vercel dashboard → Deployments
2. Find previous working deployment
3. Click "Promote to Production"

**Via Git:**
```bash
cd jamz-client-vite
git revert <commit-hash>
git push origin main
# Vercel auto-deploys reverted version
```

### Backend Rollback

**Option 1: Previous Docker Image**
```bash
ssh root@164.90.150.115
cd /root/TrafficJamz

# Find previous image
docker images | grep trafficjamz-jamz-server

# Tag previous image as latest
docker tag ghcr.io/richcobrien1/trafficjamz-jamz-server:<old-tag> ghcr.io/richcobrien1/trafficjamz-jamz-server:latest

# Restart
docker-compose down backend
docker-compose up -d backend
```

**Option 2: Git Revert + Rebuild**
```bash
# Local
cd jamz-server
git revert <commit-hash>
git push origin main

# Wait for GitHub Actions build

# Droplet
ssh root@164.90.150.115
cd /root/TrafficJamz
git pull origin main
docker pull ghcr.io/richcobrien1/trafficjamz-jamz-server:latest
docker-compose restart backend
```

### Database Rollback

**⚠️ DANGEROUS - No automatic rollback**

**For additive changes (new columns):**
```sql
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

**For data changes:**
- Requires database backup restore
- Coordinate with DevOps

**Best practice:**
- Always backup before migration: `pg_dump -U trafficjamz trafficjamz_prod > backup_$(date +%Y%m%d).sql`
- Test migrations on dev first

---

## Common Issues & Solutions

### Issue: GitHub 500 Errors (Cannot Push)

**Symptoms:**
```
remote: Internal Server Error
error: failed to push some refs
```

**Solution:**
1. Check GitHub status: https://www.githubstatus.com/
2. Use Vercel CLI for frontend: `vercel --prod --confirm`
3. Wait for GitHub to recover before backend updates

---

### Issue: Backend Build Failing

**Symptoms:**
```
Error: Cannot find module './routes/file'
```

**Root Cause:** Code references file not in repository

**Solution:**
1. Check what's in repo: `git ls-files | grep routes/`
2. Add missing file: `git add src/routes/file.js && git commit && git push`
3. **OR** comment out reference temporarily:
   ```javascript
   // app.use('/api/endpoint', require('./routes/file'));
   // TEMPORARILY DISABLED: File not yet in repo
   ```

**Prevention:**
- Never `require('./file')` before verifying file exists in git
- Check `git status` before committing

---

### Issue: Email Verification Redirect Loop

**Symptoms:**
- User clicks "Verify Email" but redirects to login
- Console: "Current location: /auth/register/verify-email-address" then redirects

**Root Cause:** React Router exact path matching

**Solution:**
```jsx
// Use wildcard route for Clerk verification flows
<Route path="/auth/register/*" element={<Register />} />
// NOT: <Route path="/auth/register" element={<Register />} />
```

**Why:** Clerk navigates to sub-paths like `/auth/register/verify-email-address`

---

### Issue: API Returns 401 After Clerk Login

**Symptoms:**
- Clerk login succeeds
- All API calls return 401 Unauthorized
- Console: `⚠️ No token found for API request`

**Root Cause:** Frontend not sending Clerk tokens OR backend not validating them

**Solution (Frontend):**
```javascript
// api.js - Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Get Clerk session token
    if (window.Clerk && window.Clerk.session) {
      const token = await window.Clerk.session.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      }
    }
    return config;
  }
);
```

**Solution (Backend):**
```javascript
// Use Clerk middleware
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

router.get('/api/groups', 
  ClerkExpressRequireAuth(),
  attachInternalUser,  // Maps clerk_user_id to user_id
  groupsController.getGroups
);
```

**Verification:**
- Frontend console: `✅ Clerk token attached to request headers`
- Backend logs: Clerk token validation messages
- Network tab: Authorization header present

---

### Issue: Database Migration Not Applied

**Symptoms:**
- Code references new column
- Error: `column "new_column" does not exist`

**Root Cause:** Migration file exists but not executed on production

**Solution:**
```bash
ssh root@164.90.150.115
cd /root/TrafficJamz
git pull origin main
psql -U trafficjamz -d trafficjamz_prod -f jamz-server/src/migrations/filename.sql
```

**Verification:**
```bash
psql -U trafficjamz -d trafficjamz_prod -c "\d users"
# Check for new column in output
```

**Prevention:**
- Document required migrations in commit message
- Add migration checklist to deployment process

---

### Issue: Container Won't Start After Update

**Symptoms:**
```
docker-compose up -d backend
ERROR: Container failed to start
```

**Diagnosis:**
```bash
docker logs trafficjamz_backend_1 --tail 100
```

**Common causes:**
1. **Syntax Error:** Check logs for JavaScript errors
2. **Missing Dependency:** `npm install` not run during build
3. **Port Conflict:** Port 5000 already in use
4. **Database Connection:** Check DATABASE_URL in .env.local
5. **Missing Environment Variable:** Check .env.local

**Solution:**
```bash
# Fix code or environment, then:
docker-compose down
docker-compose up -d backend
docker logs trafficjamz_backend_1 -f
```

---

## Deployment Checklist

### Before Every Deployment

- [ ] Code tested locally
- [ ] All tests passing (if applicable)
- [ ] Environment variables documented
- [ ] Database migrations identified
- [ ] Breaking changes documented
- [ ] Rollback plan prepared

### Frontend Deployment

- [ ] Push to main branch
- [ ] Monitor Vercel build (1-2 min)
- [ ] Check https://jamz.v2u.us loads
- [ ] Test login/logout
- [ ] Check browser console for errors
- [ ] Verify API calls work (Network tab)

### Backend Deployment

- [ ] Push to main branch
- [ ] Monitor GitHub Actions (5-10 min)
- [ ] SSH to droplet
- [ ] Pull latest code: `git pull origin main`
- [ ] Pull Docker image: `docker pull ghcr.io/...`
- [ ] Run migrations (if any): `psql -U trafficjamz...`
- [ ] Restart container: `docker-compose restart backend`
- [ ] Check logs: `docker logs trafficjamz_backend_1 -f`
- [ ] Test health endpoint: `curl .../api/health`
- [ ] Test API endpoints from frontend

### Post-Deployment

- [ ] Verify user flows work end-to-end
- [ ] Check error rates/logs for issues
- [ ] Monitor for 5-10 minutes
- [ ] Document any issues encountered

---

## Quick Reference

### Useful Commands

**Check what's deployed:**
```bash
# Frontend
curl -I https://jamz.v2u.us | grep -i "x-vercel"

# Backend
ssh root@164.90.150.115 "docker ps | grep backend"
ssh root@164.90.150.115 "cd /root/TrafficJamz && git log --oneline -1"
```

**View logs:**
```bash
# Backend
ssh root@164.90.150.115 "docker logs trafficjamz_backend_1 -f --tail 100"

# Database
ssh root@164.90.150.115 "docker logs trafficjamz_postgres_1 -f --tail 50"
```

**Database access:**
```bash
# PostgreSQL
ssh root@164.90.150.115 "psql -U trafficjamz -d trafficjamz_prod"

# MongoDB
ssh root@164.90.150.115 "mongo trafficjamz_prod"
```

**Container management:**
```bash
# Restart all
ssh root@164.90.150.115 "cd /root/TrafficJamz && docker-compose restart"

# Rebuild and restart backend
ssh root@164.90.150.115 "cd /root/TrafficJamz && docker-compose up -d --build backend"

# View all containers
ssh root@164.90.150.115 "docker ps -a"
```

---

## Contact & Support

**Repository:** https://github.com/richcobrien1/TrafficJamz
**Droplet IP:** 164.90.150.115
**Frontend:** https://jamz.v2u.us
**Backend:** https://trafficjamz.v2u.us/api

**Key Services:**
- Vercel Dashboard: https://vercel.com/dashboard
- Clerk Dashboard: https://dashboard.clerk.com
- GitHub Actions: https://github.com/richcobrien1/TrafficJamz/actions

---

## Lessons Learned

### From Recent Deployments (Feb 2026)

1. **Never require files before pushing to git**
   - Always verify file exists in repo before adding `require('./file')`
   - Use `git ls-files | grep filename` to check

2. **React Router wildcards for sub-routes**
   - Use `/path/*` not `/path` when component handles sub-routes
   - Critical for Clerk verification flows

3. **Clerk token integration**
   - Frontend: `await window.Clerk.session.getToken()`
   - Backend: `ClerkExpressRequireAuth()` middleware
   - Don't forget user mapping: `attachInternalUser`

4. **Database migrations are manual**
   - Not automatic with code deployment
   - Must SSH and run `psql ... -f migration.sql`
   - Always include `IF NOT EXISTS`

5. **Have backup deployment methods**
   - Vercel CLI for when GitHub is down
   - Keep previous Docker images for quick rollback

6. **Monitor builds actively**
   - Don't assume success - watch GitHub Actions
   - Backend builds take 5-10 minutes
   - Check logs if anything seems wrong

---

**Last Updated:** February 9, 2026 - After Clerk integration deployment
