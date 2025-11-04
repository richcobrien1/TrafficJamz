# DigitalOcean Droplet Setup for TrafficJamz Mediasoup

## Why DigitalOcean?
✅ **No phone verification required** (for most accounts)  
✅ **Easier signup** - Just email + credit card  
✅ **Better UI** - Simpler than AWS  
✅ **Cheaper** - $6/month vs $15/month AWS  
✅ **Same setup** - Everything works identically  

---

## 1. Create DigitalOcean Account (2 minutes)

1. Go to https://www.digitalocean.com
2. Click **"Sign Up"**
3. Enter email + password (or use GitHub/Google)
4. Add credit card (they give you $200 free credit for 60 days!)
5. **No phone verification needed** ✅

---

## 2. Create Droplet (3 minutes)

### Click "Create" → "Droplets"

### Choose Configuration:
```
Region: New York (or closest to you)
Image: Ubuntu 22.04 (LTS) x64
Droplet Type: Basic
CPU Options: Regular
Plan: $6/month (1 GB RAM, 1 vCPU, 25 GB SSD)
         OR $12/month (2 GB RAM - recommended for production)
```

### Authentication:
```
☑️ SSH Key (recommended)
   - Click "New SSH Key"
   - Paste your public key (from ~/.ssh/id_rsa.pub)
   - Name it "trafficjamz"
   
OR

☑️ Password (simpler)
   - Set a root password
```

### Hostname:
```
trafficjamz-mediasoup
```

### Click **"Create Droplet"**

**Wait 60 seconds** - Your droplet will be ready!

---

## 3. Configure Firewall (2 minutes)

### In DigitalOcean Dashboard:
1. Click on your droplet name
2. Go to **"Networking"** tab
3. Click **"Firewalls"** → **"Create Firewall"**

### Firewall Rules:
```
Name: trafficjamz-firewall

Inbound Rules:
Type        Protocol  Port Range    Sources
SSH         TCP       22            All IPv4, All IPv6
HTTP        TCP       5000          All IPv4, All IPv6
HTTPS       TCP       443           All IPv4, All IPv6
Custom      TCP       10000-10100   All IPv4, All IPv6
Custom      UDP       10000-10100   All IPv4, All IPv6

Outbound Rules:
All TCP     TCP       All ports     All IPv4, All IPv6
All UDP     UDP       All ports     All IPv4, All IPv6
```

### Apply to Droplet:
- Select your `trafficjamz-mediasoup` droplet
- Click **"Create Firewall"**

---

## 4. Connect to Droplet (1 minute)

### Get Your Droplet IP:
In the DigitalOcean dashboard, copy the **Public IPv4** address

### SSH Connect:

**If using SSH key:**
```bash
ssh root@YOUR_DROPLET_IP
```

**If using password:**
```bash
ssh root@YOUR_DROPLET_IP
# Enter the password you set earlier
```

**First time connecting?** Type `yes` when asked about fingerprint.

---

## 5. Install Dependencies (3 minutes)

Once connected via SSH, run these commands:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
apt install -y git

# Verify installations
docker --version
docker-compose --version
git --version
```

---

## 6. Deploy TrafficJamz (2 minutes)

```bash
# Clone your repository
git clone https://github.com/richcobrien1/TrafficJamz.git
cd TrafficJamz

# Create production environment file
cat > .env.production <<EOF
NODE_ENV=production
PORT=5000

# MongoDB (use your existing connection string)
MONGODB_URI=your_mongodb_connection_string_here

# PostgreSQL (use your existing connection string)
DATABASE_URL=your_postgres_connection_string_here

# Mediasoup Configuration
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)
MEDIASOUP_MIN_PORT=10000
MEDIASOUP_MAX_PORT=10100

# JWT Secret (use your existing secret)
JWT_SECRET=your_jwt_secret_here

# Add any other environment variables from your Render setup
EOF

# Edit the file to add your real credentials
nano .env.production
# Press Ctrl+X, then Y, then Enter to save

# Build and run backend
cd jamz-server
docker build -t trafficjamz-backend -f Dockerfile.prod .
docker run -d \
  --name trafficjamz \
  --restart always \
  -p 5000:5000 \
  -p 10000-10100:10000-10100/tcp \
  -p 10000-10100:10000-10100/udp \
  --env-file ../. env.production \
  trafficjamz-backend

# Check it's running
docker ps
docker logs trafficjamz
```

**Look for:** `✅ 15 mediasoup Workers created successfully`

---

## 7. Update Frontend Environment (1 minute)

### Get your Droplet IP address:
```bash
curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address
```

### Update `jamz-client-vite/.env.production`:
```bash
VITE_API_BASE=http://YOUR_DROPLET_IP:5000/api
VITE_BACKEND_URL=http://YOUR_DROPLET_IP:5000
VITE_WS_URL=ws://YOUR_DROPLET_IP:5000
VITE_MAPBOX_TOKEN=your_existing_token
```

### If frontend is on Vercel:
1. Go to Vercel dashboard
2. Select your project
3. Settings → Environment Variables
4. Update the three VITE_ variables above
5. Redeploy

---

## 8. Test Mediasoup (NOW!)

### Test backend is running:
```bash
curl http://YOUR_DROPLET_IP:5000
```

Should return: `{"message":"Welcome to the Audio Group Communication API"}`

### Test in browser:
1. Navigate to your audio session
2. Open browser console (F12)
3. Look for: `✅ 15 mediasoup Workers created successfully`
4. Check logs: `ssh root@YOUR_DROPLET_IP` then `docker logs -f trafficjamz`

---

## 🎯 Re-enable Mediasoup in Code

In `jamz-client-vite/src/pages/sessions/AudioSession.jsx` line 810:

**Change this:**
```javascript
const useMediasoup = false; // TEMPORARY: Skip mediasoup
```

**To this:**
```javascript
const useMediasoup = true; // Enabled on DigitalOcean!
```

**Commit and push:**
```bash
cd ~/TrafficJamz
git add .
git commit -m "Enable mediasoup on DigitalOcean Droplet"
git push
```

---

## 💰 Cost Breakdown

| Item | Monthly Cost |
|------|-------------|
| **Basic Droplet (1GB)** | **$6** |
| Basic Droplet (2GB) - Recommended | $12 |
| Storage (25 GB included) | $0 |
| Data Transfer (1 TB included) | $0 |
| **Total (Production)** | **$12/month** |

**vs Render:** $21/month (and doesn't work!)  
**vs AWS EC2 t3.small:** $15/month + $2 storage = $17/month

---

## 🚀 Deploy Updates (30 seconds!)

```bash
# SSH to your droplet
ssh root@YOUR_DROPLET_IP

# Pull latest code
cd TrafficJamz
git pull

# Rebuild and restart (30 seconds!)
cd jamz-server
docker build -t trafficjamz-backend -f Dockerfile.prod .
docker stop trafficjamz
docker rm trafficjamz
docker run -d \
  --name trafficjamz \
  --restart always \
  -p 5000:5000 \
  -p 10000-10100:10000-10100/tcp \
  -p 10000-10100:10000-10100/udp \
  --env-file ../.env.production \
  trafficjamz-backend

# Check it worked
docker logs -f trafficjamz
```

---

## 📝 Optional: Add Domain Name (Later)

### 1. Point your domain to the droplet:
- In your domain registrar (Namecheap, GoDaddy, etc.)
- Create an A record pointing to `YOUR_DROPLET_IP`
- Wait 5-60 minutes for DNS propagation

### 2. Install SSL certificate:
```bash
apt install -y certbot
certbot certonly --standalone -d yourdomain.com
```

### 3. Update environment variables:
```bash
VITE_API_BASE=https://yourdomain.com/api
VITE_BACKEND_URL=https://yourdomain.com
VITE_WS_URL=wss://yourdomain.com
```

---

## 🆘 Troubleshooting

### Can't SSH to droplet?
```bash
# Make sure you're using the correct IP
# Check firewall allows SSH on port 22
# Try password authentication if SSH key fails
```

### Docker command not found?
```bash
# Log out and back in
exit
ssh root@YOUR_DROPLET_IP
```

### Mediasoup workers not starting?
```bash
# Check logs
docker logs trafficjamz

# Check if ports are exposed
docker ps
# Should show: 0.0.0.0:10000-10100->10000-10100/tcp, 0.0.0.0:10000-10100->10000-10100/udp
```

### Out of memory?
```bash
# Upgrade to 2GB droplet ($12/month)
# In DigitalOcean: Droplet → Resize → CPU and RAM only
```

### Need more help?
```bash
# Check system resources
htop

# Check network connectivity
curl http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address

# Check disk space
df -h
```

---

## ⚡ Why This Works (vs Render)

| Feature | DigitalOcean | Render |
|---------|-------------|---------|
| **UDP/TCP Ports 10000-10100** | ✅ Full access | ❌ Blocked by load balancer |
| **Direct network access** | ✅ Yes | ❌ No |
| **Mediasoup RTP** | ✅ Works perfectly | ❌ Load balancer blocks |
| **Deploy speed** | ✅ 30 seconds | ❌ 15 minutes |
| **Cost** | ✅ $6-12/month | ❌ $21/month (broken) |
| **SSH access** | ✅ Full root access | ❌ Limited |
| **Setup difficulty** | ✅ Simple | ✅ Simple |

---

## 🎉 Next Steps

1. **Sign up:** https://www.digitalocean.com (2 min)
2. **Create droplet:** Follow steps above (3 min)
3. **Deploy backend:** Copy-paste commands (3 min)
4. **Update frontend:** Change env vars (1 min)
5. **Enable mediasoup:** Change `useMediasoup = true` (10 sec)
6. **TEST!** Open your app and hear audio! 🎵

**Total time: 10 minutes**

**Ready to go? Let me know when you're signed up and I'll walk you through it step-by-step!**
