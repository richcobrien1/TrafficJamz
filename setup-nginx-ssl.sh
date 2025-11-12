#!/bin/bash
# Setup Nginx reverse proxy with SSL for TrafficJamz backend
# This allows HTTPS access to the backend API

set -e

echo "🔧 Setting up Nginx reverse proxy with SSL..."

# Install Nginx and Certbot
echo "📦 Installing Nginx..."
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

# Create Nginx configuration
cat > /etc/nginx/sites-available/trafficjamz-api <<'EOF'
server {
    listen 80;
    server_name api.trafficjamz.v2u.us;

    location / {
        proxy_pass http://localhost:10000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:10000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/trafficjamz-api /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx

echo "✅ Nginx configured!"
echo ""
echo "📋 Next steps:"
echo "1. Point your DNS A record for api.trafficjamz.v2u.us to your server IP: 157.230.165.156"
echo "2. Wait for DNS propagation (5-10 minutes)"
echo "3. Run: certbot --nginx -d api.trafficjamz.v2u.us"
echo "4. Update frontend VITE_API_BASE to https://api.trafficjamz.v2u.us"
echo ""
echo "Or, for testing without domain:"
echo "Update frontend to use https://157.230.165.156 (self-signed cert)"
