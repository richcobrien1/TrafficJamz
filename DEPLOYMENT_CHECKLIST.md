# Production Deployment Checklist

## ✅ PRE-DEPLOYMENT CHECKLIST

### Environment File Validation
- [ ] **NO QUOTES** on environment variables (except values with spaces)
- [ ] Run `./scripts/validate-env.sh jamz-server/.env.local`
- [ ] If validation fails, run `./scripts/clean-env-file.sh jamz-server/.env.local`
- [ ] Review backup file if auto-clean makes unexpected changes

### Critical Environment Variables (Production)
```bash
# Server - MUST match nginx config
PORT=10000                              # ✅ NO QUOTES, matches nginx proxy_pass

# Environment
NODE_ENV=production                     # ✅ NO QUOTES

# WebRTC - MUST match Docker port mappings
MEDIASOUP_ANNOUNCED_IP=157.230.165.156  # ✅ NO QUOTES, production public IP
MEDIASOUP_LISTEN_IP=0.0.0.0            # ✅ NO QUOTES
MEDIASOUP_MIN_PORT=40000               # ✅ NO QUOTES, no conflict with API port
MEDIASOUP_MAX_PORT=40100               # ✅ NO QUOTES

# Database
MONGODB_URI=mongodb+srv://...          # ✅ NO QUOTES
JWT_SECRET=eyJhbGci...                 # ✅ NO QUOTES
```

### Port Configuration Verification
- [ ] **API Port**: `PORT=10000` (no quotes)
- [ ] **Nginx Config**: `/etc/nginx/sites-enabled/trafficjamz` → `proxy_pass http://127.0.0.1:10000`
- [ ] **Docker Mapping**: `-p 10000:10000` matches `PORT` env var
- [ ] **RTP Ports**: `40000-40100` (separate from API port)
- [ ] **Docker RTP Mapping**: `-p 40000-40100:40000-40100/tcp -p 40000-40100:40000-40100/udp`

### Docker Container Configuration
```bash
# Correct production command:
docker run -d \
  --name trafficjamz \
  -p 10000:10000 \                      # API port
  -p 40000-40100:40000-40100/tcp \      # RTP media (TCP)
  -p 40000-40100:40000-40100/udp \      # RTP media (UDP)
  --env-file /root/TrafficJamz/jamz-server/.env.local \
  trafficjamz-server:latest
```

---

## 🚀 DEPLOYMENT PROCESS

### Option 1: Safe Automated Deployment
```bash
./scripts/safe-deploy.sh
```
This will:
1. Pull latest code
2. Validate environment file
3. Auto-clean quotes if needed
4. Build Docker image
5. Stop old container
6. Start new container
7. Wait for startup
8. Verify health endpoint

### Option 2: Manual Deployment
```bash
# 1. SSH to production server
ssh root@157.230.165.156

# 2. Pull latest code
cd /root/TrafficJamz
git stash
git pull origin main

# 3. Validate environment
./scripts/validate-env.sh jamz-server/.env.local

# 4. Build Docker image
docker build -f docker/Dockerfile.prod -t trafficjamz-server:latest .

# 5. Stop and remove old container
docker stop trafficjamz
docker rm trafficjamz

# 6. Start new container with correct ports
docker run -d \
  --name trafficjamz \
  -p 10000:10000 \
  -p 40000-40100:40000-40100/tcp \
  -p 40000-40100:40000-40100/udp \
  --env-file /root/TrafficJamz/jamz-server/.env.local \
  trafficjamz-server:latest

# 7. Wait for startup
sleep 10

# 8. Check logs
docker logs --tail 50 trafficjamz
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### 1. Health Check
```bash
curl https://trafficjamz.v2u.us/api/health
# Expected: {"status":"ok","timestamp":"2025-12-02T..."}
```

### 2. Verify Environment Variables in Container
```bash
ssh root@157.230.165.156 "docker exec trafficjamz printenv | grep -E '^(PORT|NODE_ENV|MEDIASOUP)'"
```
Expected output:
```
NODE_ENV=production
PORT=10000
MEDIASOUP_ANNOUNCED_IP=157.230.165.156
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_MIN_PORT=40000
MEDIASOUP_MAX_PORT=40100
```

### 3. Check Server Logs
```bash
ssh root@157.230.165.156 "docker logs --tail 30 trafficjamz 2>&1"
```
Look for:
- ✅ `Server successfully started and listening on port 10000`
- ✅ `Using MEDIASOUP_ANNOUNCED_IP: 157.230.165.156`
- ✅ `mediasoup Workers created successfully`
- ❌ NO errors about invalid IP or port binding failures

### 4. Verify Port Listeners
```bash
ssh root@157.230.165.156 "ss -tlnp | grep ':10000'"
```
Expected: Docker proxy listening on port 10000

### 5. Test WebRTC (if possible)
- Join a group with voice enabled
- Attempt to create audio transport
- Check browser console for WebRTC errors
- Verify no "Failed to create send transport" errors

---

## 🚨 TROUBLESHOOTING

### Server Won't Start
1. **Check PORT is numeric**:
   ```bash
   grep '^PORT=' jamz-server/.env.local
   # Should be: PORT=10000 (NO QUOTES)
   ```

2. **Check for port conflicts**:
   ```bash
   docker ps -a
   ss -tlnp | grep ':10000'
   ```

3. **Review container logs**:
   ```bash
   docker logs trafficjamz 2>&1 | grep -E '(Error|PORT|MEDIASOUP)'
   ```

### WebRTC Transport Errors
1. **Verify MEDIASOUP_ANNOUNCED_IP**:
   ```bash
   docker exec trafficjamz printenv MEDIASOUP_ANNOUNCED_IP
   # Should be: 157.230.165.156 (NO QUOTES, NO COMMENTS)
   ```

2. **Check RTP port range**:
   ```bash
   docker exec trafficjamz printenv | grep MEDIASOUP_.*_PORT
   # Should be: MEDIASOUP_MIN_PORT=40000, MEDIASOUP_MAX_PORT=40100
   ```

3. **Verify Docker port mapping**:
   ```bash
   docker ps --filter name=trafficjamz --format '{{.Ports}}'
   # Should include: 40000-40100/tcp, 40000-40100/udp
   ```

### 502 Bad Gateway
1. **Check nginx config matches PORT**:
   ```bash
   grep proxy_pass /etc/nginx/sites-enabled/trafficjamz
   # Should be: proxy_pass http://127.0.0.1:10000
   ```

2. **Verify container is running**:
   ```bash
   docker ps | grep trafficjamz
   ```

3. **Test from inside server**:
   ```bash
   curl http://localhost:10000/api/health
   ```

---

## 📋 RECURRING ISSUE PREVENTION

### Common Mistakes (NEVER DO THIS)
| ❌ Wrong | ✅ Correct | Why |
|---------|-----------|-----|
| `PORT="10000"` | `PORT=10000` | Quotes make it a string, breaks server.listen() |
| `MEDIASOUP_ANNOUNCED_IP="0.0.0.0"` | `MEDIASOUP_ANNOUNCED_IP=157.230.165.156` | Quotes cause invalid IP error |
| `PORT=5000` (prod) | `PORT=10000` (prod) | Must match nginx config |
| `-p 5000:5000` (prod) | `-p 10000:10000` (prod) | Must match PORT env var |
| RTP `10000-10100` | RTP `40000-40100` | Prevents conflict with API port |
| `MEDIASOUP_ANNOUNCED_IP=127.0.0.1` (prod) | `MEDIASOUP_ANNOUNCED_IP=157.230.165.156` | Localhost won't work for remote clients |

### Automated Prevention
1. **Pre-commit hook** (optional):
   ```bash
   # .git/hooks/pre-commit
   ./scripts/validate-env.sh jamz-server/.env.local || exit 1
   ```

2. **Always use safe-deploy.sh**:
   - Validates before deployment
   - Auto-cleans quotes
   - Prevents bad deployments

3. **Review ENVIRONMENT_STANDARDS.md** before making changes:
   - `docs/ENVIRONMENT_STANDARDS.md`

---

## 📚 REFERENCE DOCUMENTS

- **Environment Standards**: `docs/ENVIRONMENT_STANDARDS.md`
- **Port Configuration**: `docs/PORT_CONFIGURATION.md`
- **Production Config**: `docs/PRODUCTION_CONFIG.md`
- **Deployment Guide**: `docs/PRODUCTION_DEPLOYMENT.md`

---

## 🎯 QUICK REFERENCE

**Production Environment Summary**:
```
Server:    157.230.165.156
API Port:  10000 (HTTP/HTTPS via nginx)
RTP Ports: 40000-40100 (UDP/TCP direct)
Domain:    trafficjamz.v2u.us (API)
           jamz.v2u.us (Frontend)
```

**Emergency Commands**:
```bash
# Quick restart
ssh root@157.230.165.156 "docker restart trafficjamz"

# View logs
ssh root@157.230.165.156 "docker logs -f trafficjamz"

# Fix env quotes
ssh root@157.230.165.156 "cd /root/TrafficJamz && ./scripts/clean-env-file.sh jamz-server/.env.local"
```
