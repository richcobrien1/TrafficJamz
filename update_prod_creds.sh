#!/bin/bash
# Production credential rotation script
# Run on server: ssh root@164.90.150.115 < update_prod_creds.sh

cd /root/TrafficJamz

# Backup
cp jamz-server/.env.local jamz-server/.env.local.backup.$(date +%Y%m%d_%H%M%S)

# Update MongoDB password
sed -i 's/TrafficJamz2026/TrafficJamzFebruary2026/g' jamz-server/.env.local

# Update Clerk secret key  
sed -i 's/sk_test_Q3Mz53XiLPdG7g29KcUYEUVrvHP1Mb9XpJh9qn6oIE/sk_test_MQP73U75GCm9sJX8iyNNFKGI4jpLdSzpWKhEU5pANl/g' jamz-server/.env.local

# Update Postgres password
sed -i 's/tMRyyxjADUl63z44/TJamz_Feb2026_SecureP9wR/g' jamz-server/.env.local

echo "✓ Credentials updated"

# Restart Docker container
docker-compose -f jamz-server/docker-compose.yml down
docker-compose -f jamz-server/docker-compose.yml up -d

echo "✓ Container restarted with new credentials"
docker logs trafficjamz_backend_1 --tail 20
