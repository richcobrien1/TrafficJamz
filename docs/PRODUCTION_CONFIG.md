# Production Configuration Reference

**Last Updated:** November 17, 2025  
**Environment:** DigitalOcean Droplet (157.230.165.156)

## Critical Production Settings

### Docker Container
```bash
Container Name: trafficjamz
Image: trafficjamz-backend:latest
Port Mapping: 5000:5000
Restart Policy: unless-stopped
Env File: /root/TrafficJamz/jamz-server/.env.local
```

**Start Command:**
```bash
docker run -d \
  --name trafficjamz \
  --restart=unless-stopped \
  --env-file /root/TrafficJamz/jamz-server/.env.local \
  -p 5000:5000 \
  trafficjamz-backend:latest
```

### Nginx Configuration
**File:** `/etc/nginx/sites-enabled/trafficjamz`

**Critical Settings:**
- Proxy Port: `http://127.0.0.1:5000` ⚠️ MUST match Docker port
- SSL: Enabled via Let's Encrypt
- WebSocket Support: Enabled for Socket.IO

**Reload Command:**
```bash
nginx -t && systemctl reload nginx
```

### Environment Variables (.env.local)

**Format Rules:**
- ❌ NO quotes around values
- ❌ NO spaces around `=`
- ✅ Direct values only

**Required Services:**

#### Port
```bash
PORT=5000
```

#### MongoDB (Music Library, Groups, Sessions)
```bash
MONGODB_URI=mongodb+srv://richcobrien:1TrafficJamz123@trafficjam.xk2uszk.mongodb.net/?retryWrites=true&w=majority&appName=trafficjam
```

#### PostgreSQL (Users, Auth)
```bash
POSTGRES_HOST=aws-0-us-east-1.pooler.supabase.com
POSTGRES_PORT=6543
POSTGRES_DB=postgres
POSTGRES_USER=postgres.zmgdzbhozobqojqhmfxd
POSTGRES_PASSWORD=***REDACTED***
```

#### InfluxDB (Location Time-Series Data)
```bash
INFLUXDB_URL=https://us-east-1-1.aws.cloud2.influxdata.com
INFLUXDB_TOKEN=***REDACTED***
INFLUXDB_ORG=V2U
INFLUXDB_BUCKET=trafficjam
```

#### Cloudflare R2 (Music Storage)
```bash
R2_ACCOUNT_ID=2bc2ea85ab9a04b8de6ddc6e83efc7eb
R2_ACCESS_KEY_ID=***REDACTED***
R2_SECRET_ACCESS_KEY=***REDACTED***
R2_BUCKET_NAME=trafficjamz
R2_PUBLIC_URL=https://pub-3db25e1ebf6d46a38e8cffdd22a48c64.r2.dev
```

## Service Health Check

**All services MUST be running:**

```bash
docker logs trafficjamz 2>&1 | grep -E '(MongoDB|PostgreSQL|InfluxDB|Server.*listening)'
```

**Expected Output:**
```
✅ Server successfully started and listening on port 5000
MongoDB connection state: connected
✅ PostgreSQL connection established successfully
InfluxDB connection has been established successfully.
```

## Deployment Procedure

### 1. Code Changes
```bash
# On dev machine
git add .
git commit -m "Description"
git push origin main
```

### 2. Deploy to Production
```bash
ssh root@157.230.165.156
cd /root/TrafficJamz
git pull origin main
docker build -t trafficjamz-backend:latest -f docker/api/Dockerfile.prod .
docker rm -f trafficjamz
docker run -d --name trafficjamz --restart=unless-stopped --env-file /root/TrafficJamz/jamz-server/.env.local -p 5000:5000 trafficjamz-backend:latest
```

### 3. Verify Deployment
```bash
# Check all services started
docker logs trafficjamz --tail=50

# Test API endpoint
curl https://trafficjamz.v2u.us/api/status

# Monitor for Socket.IO connections
docker logs -f trafficjamz
```

## Common Issues & Fixes

### Issue: 502 Bad Gateway
**Cause:** Nginx proxying to wrong port  
**Fix:**
```bash
grep proxy_pass /etc/nginx/sites-enabled/trafficjamz
# Should show: http://127.0.0.1:5000
sed -i 's|http://127.0.0.1:XXXX|http://127.0.0.1:5000|g' /etc/nginx/sites-enabled/trafficjamz
nginx -t && systemctl reload nginx
```

### Issue: MongoDB Connection Failed
**Cause:** Quotes in MONGODB_URI or wrong password  
**Fix:**
```bash
# Check env file
grep MONGODB_URI /root/TrafficJamz/jamz-server/.env.local
# Should have NO quotes around value
# Password must be: 1MongoDB123$
```

### Issue: InfluxDB Parse Error
**Cause:** Double quotes in INFLUXDB_URL  
**Fix:** Remove all quotes from InfluxDB vars in .env.local

### Issue: Port Already in Use
**Cause:** Old container still running or PORT has quotes  
**Fix:**
```bash
docker rm -f trafficjamz
grep ^PORT /root/TrafficJamz/jamz-server/.env.local
# Should be: PORT=5000 (no quotes)
```

### Issue: Socket.IO Not Working
**Causes:**
1. Server not started (check logs)
2. Nginx blocking WebSocket upgrade
3. Port mismatch between Docker and nginx

**Fix:** Verify all services running, check nginx config has WebSocket headers

## Pre-Kubernetes Checklist

Before migrating to Kubernetes/Calico, verify:

- [ ] All Docker services stable for 48+ hours
- [ ] No environment variable formatting issues
- [ ] Nginx config locked and documented
- [ ] MongoDB, PostgreSQL, InfluxDB all connecting
- [ ] Socket.IO connections working
- [ ] Port mappings consistent (5000 everywhere)
- [ ] .env.local file backed up
- [ ] Deployment procedure tested and documented

## Backup Commands

### Backup Environment File
```bash
scp root@157.230.165.156:/root/TrafficJamz/jamz-server/.env.local ./backup/.env.local.$(date +%Y%m%d)
```

### Backup Nginx Config
```bash
scp root@157.230.165.156:/etc/nginx/sites-enabled/trafficjamz ./backup/nginx-trafficjamz.$(date +%Y%m%d)
```

## Production URLs

- **Frontend:** https://jamz.v2u.us (Vercel)
- **Backend API:** https://trafficjamz.v2u.us (DigitalOcean)
- **WebSocket:** wss://trafficjamz.v2u.us/socket.io (Same origin)

---

**⚠️ CRITICAL:** Any changes to port numbers, proxy settings, or env file format MUST update this document immediately.
