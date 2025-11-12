# TrafficJamz Production Deployment Guide

## Current Production Architecture

### Infrastructure Overview
- **Frontend**: Vercel (https://jamz.v2u.us)
- **Backend**: DigitalOcean Droplet (https://trafficjamz.v2u.us)
- **Database**: MongoDB (local on DigitalOcean droplet)
- **Storage**: Cloudflare R2
- **CDN**: Cloudflare (DNS management)

### Server Details
- **IP Address**: 157.230.165.156
- **OS**: Ubuntu
- **Web Server**: Nginx 1.28.0 with Let's Encrypt SSL
- **Container Runtime**: Docker
- **Backend Port**: 10000 (internal)

## DNS Configuration

### Domain Records
```
trafficjamz.v2u.us  →  A record  →  157.230.165.156  (Backend API)
jamz.v2u.us         →  CNAME     →  Vercel           (Frontend)
```

## Backend Setup

### Nginx Reverse Proxy Configuration
Location: `/etc/nginx/sites-available/trafficjamz`

```nginx
server {
    server_name trafficjamz.v2u.us;

    # Allow large file uploads (100MB for MP3s)
    client_max_body_size 100M;
    client_body_timeout 300s;

    # WebSocket upgrade support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Standard proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Increase timeouts for uploads and long-running connections
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;

    location / {
        proxy_pass http://127.0.0.1:10000;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:10000;
        proxy_buffering off;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://127.0.0.1:10000;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/trafficjamz.v2u.us/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/trafficjamz.v2u.us/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    server_name trafficjamz.v2u.us;
    return 301 https://$host$request_uri;
}
```

### Docker Backend Container

**Image**: `trafficjamz-backend` (built from `jamz-server/Dockerfile.prod`)

**Environment Variables**:
```bash
PORT=10000
MONGODB_URI=mongodb://mongodb:27017/trafficjamz
JWT_SECRET=[redacted]
SUPABASE_URL=https://nrlaqkpojtvvheosnpaz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[redacted]
R2_ACCOUNT_ID=cbf04e97b07d046d20e9dda26f8d8e72
R2_ACCESS_KEY_ID=[redacted]
R2_SECRET_ACCESS_KEY=[redacted]
R2_BUCKET_MUSIC=trafficjamz-music
R2_BUCKET_PUBLIC=trafficjamz-public
```

**Container Start Command**:
```bash
docker run -d \
  --name trafficjamz \
  --restart always \
  --link mongodb:mongodb \
  --dns 8.8.8.8 \
  --dns 8.8.4.4 \
  -p 10000:10000 \
  -e PORT=10000 \
  -e MONGODB_URI='mongodb://mongodb:27017/trafficjamz' \
  -e JWT_SECRET='...' \
  -e SUPABASE_URL='...' \
  -e SUPABASE_SERVICE_ROLE_KEY='...' \
  -e R2_ACCOUNT_ID='...' \
  -e R2_ACCESS_KEY_ID='...' \
  -e R2_SECRET_ACCESS_KEY='...' \
  -e R2_BUCKET_MUSIC='trafficjamz-music' \
  -e R2_BUCKET_PUBLIC='trafficjamz-public' \
  trafficjamz-backend
```

### MongoDB Setup

**Container**: `mongodb` (linked to backend)
**Database**: `trafficjamz`
**Connection**: Local Docker network

**Note**: Previously used MongoDB Atlas, but switched to local MongoDB due to DNS resolution issues. All previous data was lost in the migration.

## Frontend Setup

### Vercel Configuration

**Project**: TrafficJamz
**Git Integration**: GitHub (richcobrien1/TrafficJamz)
**Branch**: main (auto-deploy enabled)
**Build Command**: `npm run build` (in jamz-client-vite/)
**Output Directory**: `jamz-client-vite/dist`

### Environment Variables

Set in Vercel Dashboard → Settings → Environment Variables:

```bash
VITE_API_BASE=https://trafficjamz.v2u.us
VITE_BACKEND_URL=https://trafficjamz.v2u.us
VITE_WS_URL=wss://trafficjamz.v2u.us
VITE_APP_ENV=production
VITE_APP_NAME=TrafficJamz
VITE_MAPBOX_TOKEN=[redacted]
VITE_YOUTUBE_CLIENT_ID=[redacted]
```

**Important**: The `.env.production` file in the repository is used as a template. Vercel environment variables take precedence.

## Cloudflare R2 Storage

### Configuration
- **Account ID**: cbf04e97b07d046d20e9dda26f8d8e72
- **Bucket (Music)**: trafficjamz-music
- **Bucket (Public)**: trafficjamz-public
- **Public URL**: https://pub-c4cf281613c744fabfa8830d27954687.r2.dev

### Usage
- MP3 files uploaded via `/api/v1/audio/upload-music` endpoint
- Files stored with path: `session-music/{sessionId}/{timestamp}-{filename}`
- Public access enabled via R2 public development URL
- Metadata extracted via `music-metadata` package (ID3 tags)

## Deployment Process

### Backend Deployment (DigitalOcean)

1. **SSH into server**:
   ```bash
   ssh root@157.230.165.156
   ```

2. **Pull latest code**:
   ```bash
   cd /root/TrafficJamz
   git pull origin main
   ```

3. **Rebuild Docker image**:
   ```bash
   cd jamz-server
   docker build -t trafficjamz-backend -f Dockerfile.prod .
   ```

4. **Stop and remove old container**:
   ```bash
   docker stop trafficjamz
   docker rm trafficjamz
   ```

5. **Start new container** (see Docker Backend Container section above)

6. **Verify deployment**:
   ```bash
   docker ps | grep trafficjamz
   docker logs trafficjamz --tail 50
   curl -I https://trafficjamz.v2u.us/api/v1/health
   ```

### Frontend Deployment (Vercel)

**Automatic**: Pushes to `main` branch trigger automatic deployment.

**Manual** (if needed):
1. Push code to GitHub
2. Vercel detects changes and builds
3. Check deployment status at vercel.com

**Local testing before deploy**:
```bash
cd jamz-client-vite
npm run build
npm run preview
```

## Troubleshooting

### Common Issues

**503 Service Unavailable**
- Check if backend container is running: `docker ps`
- Check backend logs: `docker logs trafficjamz`
- Verify MongoDB connection in logs
- Check Nginx status: `systemctl status nginx`

**CORS Errors**
- Verify `https://jamz.v2u.us` is in backend allowed origins
- Check browser console for specific error
- Verify SSL certificates are valid

**MongoDB Connection Failed**
- Container needs `--link mongodb:mongodb` and DNS servers
- Check if MongoDB container exists: `docker ps -a | grep mongo`
- Verify connection string uses correct host: `mongodb://mongodb:27017`

**R2 Upload Failures**
- Verify R2 credentials in environment variables
- Check backend logs for R2 SDK errors
- Verify bucket names match environment variables
- Test R2 public URL accessibility

**Black Screen on Frontend**
- Check browser console for API connection errors
- Verify `VITE_API_BASE` is set correctly
- Check if backend is responding: `curl https://trafficjamz.v2u.us/api/v1/health`
- Clear browser cache and reload

### Useful Commands

**Backend Health Check**:
```bash
curl https://trafficjamz.v2u.us/api/v1/health
```

**View Real-time Logs**:
```bash
ssh root@157.230.165.156
docker logs -f trafficjamz
```

**Restart Nginx**:
```bash
ssh root@157.230.165.156
systemctl restart nginx
```

**Check SSL Certificate Expiry**:
```bash
ssh root@157.230.165.156
certbot certificates
```

**Renew SSL Certificate**:
```bash
ssh root@157.230.165.156
certbot renew
systemctl reload nginx
```

## Security Notes

- SSL certificates managed by Let's Encrypt (auto-renewal via certbot)
- Backend runs in Docker with isolated network
- MongoDB not exposed to public internet
- JWT tokens for authentication
- CORS strictly configured for known origins
- Environment variables never committed to repository

## Backup & Recovery

### Database Backup
```bash
ssh root@157.230.165.156
docker exec mongodb mongodump --out /backup/$(date +%Y%m%d)
```

### Database Restore
```bash
docker exec mongodb mongorestore /backup/YYYYMMDD
```

### R2 Storage
- Files are immutable once uploaded
- No automatic backup needed (Cloudflare redundancy)
- Track uploaded files in MongoDB for recovery

## Monitoring

### Health Endpoints
- Backend: `https://trafficjamz.v2u.us/api/v1/health`
- Frontend: `https://jamz.v2u.us` (check page load)

### Logs
- Backend: `docker logs trafficjamz`
- Nginx: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`

## Migration Notes (November 12, 2025)

### Backend Migration: Render → DigitalOcean
- **Reason**: Better control, cost savings, mediasoup support
- **Old URL**: https://trafficjamz.onrender.com (deprecated)
- **New URL**: https://trafficjamz.v2u.us
- **Impact**: All users logged out, need to re-register (MongoDB reset)

### Database Migration: MongoDB Atlas → Local MongoDB
- **Reason**: Atlas cluster no longer accessible (DNS resolution failed)
- **Old Connection**: `mongodb+srv://cluster0.xnzfb.mongodb.net`
- **New Connection**: `mongodb://mongodb:27017/trafficjamz`
- **Impact**: All data lost (users, groups, tracks, sessions)
- **Benefit**: Fresh start with correct R2 URLs, no migration needed

### R2 URL Fix
- **Old Hash**: d54e57481e824e8752d0f6caa9b37ba7 (incorrect)
- **New Hash**: pub-c4cf281613c744fabfa8830d27954687 (correct)
- **Impact**: All tracks uploaded after migration use correct URLs
