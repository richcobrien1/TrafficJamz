# Environment Variable & Port Configuration Standards

## CRITICAL RULES - NO EXCEPTIONS ⚠️

### 1. Environment Variable Quote Rules

**DO NOT USE QUOTES** for environment variables unless the value contains spaces:

```bash
# ✅ CORRECT - No quotes needed
PORT=10000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@host/db
MEDIASOUP_ANNOUNCED_IP=157.230.165.156
JWT_SECRET=eyJhbGciOiJIUzI1NiJ9...

# ❌ WRONG - Unnecessary quotes cause type errors
PORT="10000"                    # Becomes string, breaks server.listen()
MEDIASOUP_ANNOUNCED_IP="0.0.0.0"  # Becomes invalid IP "0.0.0.0"

# ✅ CORRECT - Quotes only when needed for spaces
MESSAGE="Hello World"
DB_URL="postgres://user:p@ss word@host/db"

# ❌ WRONG - No spaces, don't use quotes
CORS_ORIGIN="*"
LOG_LEVEL="debug"
```

**Why This Matters**:
- `PORT="10000"` → `server.listen("10000")` → Silent failure, no listener bound
- `MEDIASOUP_ANNOUNCED_IP="0.0.0.0"` → `invalid IP '"0.0.0.0"'` error
- Node.js doesn't auto-parse quoted values to correct types

---

### 2. Port Configuration Standard

#### Production Environment (DigitalOcean - 157.230.165.156)

| Service | Port | Protocol | Purpose | Nginx Proxy |
|---------|------|----------|---------|-------------|
| **Backend API** | 10000 | TCP | Express server | ✅ Yes → trafficjamz.v2u.us |
| **WebRTC RTP** | 40000-40100 | UDP/TCP | Mediasoup voice/video | ❌ No (direct) |
| **MongoDB** | 27017 | TCP | Database (Atlas) | ❌ No (cloud) |
| **PostgreSQL** | 6543 | TCP | Supabase pooler | ❌ No (cloud) |

**Nginx Configuration**:
```nginx
# /etc/nginx/sites-enabled/trafficjamz
server {
    server_name trafficjamz.v2u.us;
    
    location /api/health {
        proxy_pass http://127.0.0.1:10000;  # Must match PORT env var
    }
    
    listen 443 ssl;
}
```

**Docker Port Mapping**:
```bash
docker run -d \
  --name trafficjamz \
  -p 10000:10000 \              # API port (must match PORT env var)
  -p 40000-40100:40000-40100/tcp \  # RTP media
  -p 40000-40100:40000-40100/udp \  # RTP media
  --env-file /root/TrafficJamz/jamz-server/.env.local \
  trafficjamz-server:latest
```

**Environment Variables**:
```bash
PORT=10000                              # Must match nginx proxy_pass
MEDIASOUP_ANNOUNCED_IP=157.230.165.156  # Production public IP
MEDIASOUP_LISTEN_IP=0.0.0.0            # Listen on all interfaces
MEDIASOUP_MIN_PORT=40000               # RTP range start
MEDIASOUP_MAX_PORT=40100               # RTP range end
```

#### Development Environment (Local)

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| **Frontend** | 5173 | TCP | Vite dev server |
| **Backend API** | 5000 | TCP | Express server |
| **WebRTC RTP** | 10000-10100 | UDP/TCP | Mediasoup (local) |
| **MongoDB** | 27017 | TCP | Local or Atlas |

**Environment Variables**:
```bash
PORT=5000                      # Development backend port
MEDIASOUP_ANNOUNCED_IP=127.0.0.1  # Localhost for dev
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_MIN_PORT=10000       # Different range than prod
MEDIASOUP_MAX_PORT=10100
```

---

### 3. Configuration Checklist

**Before Every Deployment**:
- [ ] Run `./scripts/validate-env.sh jamz-server/.env.local`
- [ ] Verify PORT matches nginx configuration
- [ ] Verify MEDIASOUP_ANNOUNCED_IP is production IP (not 127.0.0.1)
- [ ] Verify MEDIASOUP port range matches Docker mapping
- [ ] Check NO quotes on numeric/URL values
- [ ] Backup .env.local before changes

**Production .env.local Requirements**:
```bash
# Server
PORT=10000                              # NO QUOTES

# WebRTC
MEDIASOUP_ANNOUNCED_IP=157.230.165.156  # NO QUOTES, production IP
MEDIASOUP_LISTEN_IP=0.0.0.0            # NO QUOTES
MEDIASOUP_MIN_PORT=40000               # NO QUOTES
MEDIASOUP_MAX_PORT=40100               # NO QUOTES

# Database
MONGODB_URI=mongodb+srv://...          # NO QUOTES
JWT_SECRET=eyJhbGci...                 # NO QUOTES
```

---

### 4. Common Mistakes & Fixes

| ❌ Wrong | ✅ Correct | Issue |
|---------|-----------|-------|
| `PORT="10000"` | `PORT=10000` | String vs number |
| `MEDIASOUP_ANNOUNCED_IP="127.0.0.1"` | `MEDIASOUP_ANNOUNCED_IP=157.230.165.156` | Wrong IP + quotes |
| `PORT=5000` (prod) | `PORT=10000` (prod) | Doesn't match nginx |
| Docker `-p 5000:5000` | Docker `-p 10000:10000` | Doesn't match PORT |
| RTP ports `10000-10100` | RTP ports `40000-40100` | Conflict with API port |

---

### 5. Validation Tools

**Auto-clean quotes**:
```bash
./scripts/clean-env-file.sh jamz-server/.env.local
```

**Validate before deploy**:
```bash
./scripts/validate-env.sh jamz-server/.env.local
```

**Safe deployment**:
```bash
./scripts/safe-deploy.sh
```

---

### 6. Emergency Recovery

**If server won't start**:
1. Check PORT is numeric without quotes
2. Verify PORT matches nginx config (10000 for prod)
3. Ensure MEDIASOUP_ANNOUNCED_IP has no quotes
4. Check Docker port mapping matches PORT env var
5. Review logs: `docker logs trafficjamz 2>&1 | grep -E '(PORT|MEDIASOUP|Error)'`

**Quick fix**:
```bash
ssh root@157.230.165.156
cd /root/TrafficJamz
./scripts/clean-env-file.sh jamz-server/.env.local
docker restart trafficjamz
```

---

## Summary

1. **NO QUOTES** in .env files (except values with spaces)
2. **Production PORT = 10000** (matches nginx)
3. **MEDIASOUP_ANNOUNCED_IP = 157.230.165.156** (production IP)
4. **RTP ports = 40000-40100** (avoid conflict with API)
5. **Always validate** before deployment
