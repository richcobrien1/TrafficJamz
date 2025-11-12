#!/bin/bash
# Quick backend deployment script
ssh root@139.144.79.247 << 'ENDSSH'
cd /root/TrafficJamz
git pull origin main
cd jamz-server
npm install
pm2 restart jamz-server || pm2 start src/server.js --name jamz-server
pm2 logs jamz-server --lines 20
ENDSSH
