# AWS EC2 Setup for TrafficJamz Mediasoup

## 1. Launch EC2 Instance (3 minutes)

### Access AWS Console
1. Go to https://console.aws.amazon.com/ec2
2. Click "Launch Instance"

### Instance Configuration
```
Name: trafficjamz-mediasoup
AMI: Ubuntu Server 22.04 LTS (Free Tier Eligible)
Instance Type: t3.small ($0.0208/hour = ~$15/month)
              OR t3.micro for testing ($0.0104/hour = ~$7.50/month)
Key Pair: Create new → "trafficjamz-key" → Download .pem file
```

### Network Settings (CRITICAL)
Click "Edit" and configure:
```
VPC: Default
Auto-assign Public IP: ENABLE
Security Group: Create new "trafficjamz-sg"
```

### Security Group Rules (Add these):
```
Type          Protocol  Port Range    Source      Description
SSH           TCP       22            0.0.0.0/0   SSH access
HTTP          TCP       5000          0.0.0.0/0   Backend API
HTTPS         TCP       443           0.0.0.0/0   HTTPS (future)
Custom TCP    TCP       10000-10100   0.0.0.0/0   Mediasoup RTP
Custom UDP    UDP       10000-10100   0.0.0.0/0   Mediasoup RTP
```

### Storage
```
Root volume: 20 GB gp3 (default is fine)
```

Click **Launch Instance**

---

## 2. Connect to Instance (2 minutes)

### Windows (Using Git Bash or WSL)
```bash
# Move your key file to a safe location
mv ~/Downloads/trafficjamz-key.pem ~/.ssh/
chmod 400 ~/.ssh/trafficjamz-key.pem

# Get your instance public IP from AWS console
# Connect via SSH
ssh -i ~/.ssh/trafficjamz-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## 3. Install Dependencies (3 minutes)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install -y git

# Verify installations
docker --version
docker-compose --version
git --version
```

---

## 4. Deploy TrafficJamz (2 minutes)

```bash
# Clone your repo
git clone https://github.com/richcobrien1/TrafficJamz.git
cd TrafficJamz

# Create production environment file
cat > .env.production <<EOF
NODE_ENV=production
PORT=5000

# MongoDB (use your existing connection string)
MONGODB_URI=your_mongodb_connection_string

# PostgreSQL (use your existing)
DATABASE_URL=your_postgres_connection_string

# Mediasoup
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
MEDIASOUP_MIN_PORT=10000
MEDIASOUP_MAX_PORT=10100

# Your existing secrets
JWT_SECRET=your_jwt_secret
# ... add other env vars from your Render setup
EOF

# Start the backend
cd jamz-server
docker build -t trafficjamz-backend -f Dockerfile.prod .
docker run -d \
  --name trafficjamz \
  --restart always \
  -p 5000:5000 \
  -p 10000-10100:10000-10100/tcp \
  -p 10000-10100:10000-10100/udp \
  --env-file ../.env.production \
  trafficjamz-backend

# Check it's running
docker ps
docker logs trafficjamz
```

---

## 5. Update Frontend (1 minute)

### Update your `.env.production` in `jamz-client-vite`:
```bash
VITE_API_BASE=http://YOUR_EC2_PUBLIC_IP:5000/api
VITE_BACKEND_URL=http://YOUR_EC2_PUBLIC_IP:5000
VITE_WS_URL=ws://YOUR_EC2_PUBLIC_IP:5000
```

### Deploy to Vercel (or keep testing locally):
```bash
cd ../jamz-client-vite
# If on Vercel, update env vars in Vercel dashboard
# OR test locally first:
npm run build
npm run preview
```

---

## 6. Test Mediasoup (NOW!)

1. Open browser: `http://YOUR_EC2_PUBLIC_IP:5000`
2. Should see: `{"message":"Welcome to the Audio Group Communication API"}`
3. Navigate to audio session in your app
4. Check backend logs: `docker logs -f trafficjamz`
5. Look for: `✅ 15 mediasoup Workers created successfully`

---

## 🎯 Re-enable Mediasoup in Code

In `jamz-client-vite/src/pages/sessions/AudioSession.jsx` line 810:
```javascript
const useMediasoup = true; // Changed from false!
```

Commit and push:
```bash
git add .
git commit -m "Enable mediasoup on AWS EC2"
git push
```

---

## 💰 Cost Breakdown

| Item | Monthly Cost |
|------|-------------|
| EC2 t3.small | ~$15 |
| 20 GB Storage | ~$2 |
| Data Transfer (first 100GB free) | ~$0-5 |
| **Total** | **~$17-22/month** |

---

## 🚀 Deploy Updates (30 seconds!)

```bash
# SSH to EC2
ssh -i ~/.ssh/trafficjamz-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

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
```

---

## 📝 Next Steps (Optional - Do Later)

### Add Domain Name
1. Register domain (Namecheap, GoDaddy, etc.)
2. Point A record to EC2 public IP
3. Update env vars with domain instead of IP

### Add SSL/HTTPS
```bash
# Install Certbot
sudo apt install -y certbot
sudo certbot certonly --standalone -d yourdomain.com
```

### Set Up Nginx Reverse Proxy
```bash
sudo apt install -y nginx
# Configure nginx to proxy to Docker container
```

### Auto-deploy with GitHub Actions (Later)
Create `.github/workflows/deploy-aws.yml` for push-to-deploy

---

## ⚡ Why This Works

✅ **Direct network access** - No load balancer blocking RTP  
✅ **UDP/TCP ports open** - Mediasoup can send/receive media  
✅ **30-second deploys** - Docker rebuild vs 15-minute platform builds  
✅ **Full control** - No platform limitations  
✅ **Cheap** - $17/month vs $21/month on Render (which doesn't work)  

---

## 🆘 Troubleshooting

### Can't connect to EC2?
```bash
# Check security group allows SSH from your IP
# In AWS Console: EC2 → Security Groups → trafficjamz-sg → Inbound rules
```

### Mediasoup not working?
```bash
# Check ports are exposed
docker ps
# Should show: 0.0.0.0:10000-10100->10000-10100/tcp, 0.0.0.0:10000-10100->10000-10100/udp

# Check logs
docker logs -f trafficjamz | grep mediasoup
```

### Out of memory?
```bash
# Upgrade to t3.small (1GB → 2GB RAM)
# In AWS Console: Instance → Actions → Instance Settings → Change Instance Type
```
