#!/bin/bash
# wait-and-reset.sh
# Wait for Render deployment and reset password

echo "⏳ Waiting for Render to deploy (checking every 10 seconds)..."
echo ""

for i in {1..20}; do
  echo "Attempt $i/20: Checking if endpoint is available..."
  
  response=$(curl -s -X POST https://trafficjamz.v2u.us/api/temp-reset/fix-password 2>/dev/null)
  
  if echo "$response" | grep -q "success"; then
    echo ""
    echo "✅ DEPLOYMENT COMPLETE!"
    echo ""
    echo "📋 Password Reset Result:"
    echo "$response" | grep -o '"success":[^,]*' | head -1
    echo "$response" | grep -o '"email":"[^"]*"' | head -1
    echo "$response" | grep -o '"newPassword":"[^"]*"' | head -1
    echo "$response" | grep -o '"passwordVerified":[^,}]*' | head -1
    echo ""
    echo "🎉 YOU CAN NOW LOGIN WITH:"
    echo "   Email: richcobrien@hotmail.com"
    echo "   Password: TrafficJamz2024!"
    echo ""
    exit 0
  fi
  
  if [ $i -lt 20 ]; then
    sleep 10
  fi
done

echo ""
echo "❌ Deployment timed out after 3+ minutes"
echo "Check Render dashboard: https://dashboard.render.com"
echo ""
