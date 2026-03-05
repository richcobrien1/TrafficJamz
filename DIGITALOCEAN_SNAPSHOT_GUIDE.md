# DigitalOcean Droplet Snapshot Guide

## 🎯 Purpose
Create a backup snapshot of your production DigitalOcean droplet before making significant changes.

## 📍 Your Production Droplet Info
- **IP Address**: 164.90.150.115
- **Location**: SFO3 (San Francisco Datacenter 3)
- **Name**: ubuntu-s-1vcpu-1gb-35gb-intel-sfo3-01
- **Size**: 1 vCPU, 1GB RAM, 35GB SSD
- **OS**: Ubuntu
- **Domain**: trafficjamz.v2u.us

## 🖥️ Method 1: DigitalOcean Web Dashboard (Recommended)

### Step-by-Step:

1. **Login to DigitalOcean**
   - Go to: [https://cloud.digitalocean.com/](https://cloud.digitalocean.com/)
   - Login with your credentials

2. **Navigate to Your Droplet**
   - Click **"Droplets"** in the left sidebar
   - Find your droplet: **ubuntu-s-1vcpu-1gb-35gb-intel-sfo3-01** (164.90.150.115)
   - Click on the droplet name

3. **Create Snapshot**
   - Scroll down to the **"Snapshots"** section (left sidebar)
   - OR click the droplet → **"Snapshots"** tab
   - Click **"Take snapshot"** or **"Take live snapshot"**

4. **Configure Snapshot**
   ```
   Snapshot Name: trafficjamz-prod-2026-03-05-post-secret-cleanup
   ```
   
   **Naming Convention**: `{project}-{environment}-{date}-{reason}`
   
   Examples:
   - `trafficjamz-prod-2026-03-05-post-secret-cleanup`
   - `trafficjamz-prod-2026-03-05-before-major-update`
   - `trafficjamz-prod-2026-03-05-stable-working`

5. **Choose Snapshot Type**
   - **Live Snapshot** (Recommended): 
     - ✅ No downtime
     - ✅ Server keeps running
     - ⚠️ Costs $1.00 extra (one-time)
     - ✅ Best for production
   
   - **Regular Snapshot** (Power off first):
     - ⚠️ Requires stopping the droplet
     - ⚠️ Causes downtime (5-15 minutes)
     - ✅ Free
     - ❌ Not recommended for production

6. **Start Snapshot**
   - Click **"Take snapshot"**
   - Wait 5-20 minutes depending on disk usage
   - You'll see progress in the Snapshots section

7. **Verify Snapshot**
   - Once complete, snapshot appears in **"Snapshots"** section
   - Check:
     - ✅ Name is correct
     - ✅ Size matches your droplet
     - ✅ Status shows "Available"

## 🔧 Method 2: DigitalOcean API (Advanced)

### Prerequisites:
```bash
# Install doctl (DigitalOcean CLI)
# On Windows with chocolatey:
choco install doctl

# On Mac with homebrew:
brew install doctl

# On Linux:
cd ~
wget https://github.com/digitalocean/doctl/releases/download/v1.98.1/doctl-1.98.1-linux-amd64.tar.gz
tar xf ~/doctl-1.98.1-linux-amd64.tar.gz
sudo mv ~/doctl /usr/local/bin
```

### Setup Authentication:
```bash
# Get API token from: https://cloud.digitalocean.com/account/api/tokens
doctl auth init

# Paste your API token when prompted
```

### Create Snapshot via CLI:
```bash
# List your droplets to get the ID
doctl compute droplet list

# Create snapshot (replace DROPLET_ID with your actual ID)
doctl compute droplet-action snapshot YOUR_DROPLET_ID \
  --snapshot-name "trafficjamz-prod-2026-03-05-post-secret-cleanup"

# Check snapshot progress
doctl compute droplet-action get YOUR_DROPLET_ID --action-id ACTION_ID

# List all snapshots
doctl compute snapshot list --resource droplet
```

## 🔧 Method 3: Automated Script (Via SSH)

**Note**: This uses the API, so you need a DigitalOcean API token.

Create this script on your local machine:

```bash
#!/bin/bash
# save as: create-do-snapshot.sh

# Configuration
DO_TOKEN="your_digitalocean_api_token_here"
DROPLET_IP="164.90.150.115"
SNAPSHOT_NAME="trafficjamz-prod-$(date +%Y-%m-%d)-backup"

# Get droplet ID from IP
echo "🔍 Finding droplet ID..."
DROPLET_ID=$(curl -sX GET \
  -H "Authorization: Bearer $DO_TOKEN" \
  "https://api.digitalocean.com/v2/droplets" | \
  jq -r ".droplets[] | select(.networks.v4[].ip_address == \"$DROPLET_IP\") | .id")

if [ -z "$DROPLET_ID" ]; then
    echo "❌ Could not find droplet with IP $DROPLET_IP"
    exit 1
fi

echo "✅ Found droplet ID: $DROPLET_ID"

# Create snapshot
echo "📸 Creating snapshot: $SNAPSHOT_NAME"
RESPONSE=$(curl -sX POST \
  -H "Authorization: Bearer $DO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\": \"snapshot\", \"name\": \"$SNAPSHOT_NAME\"}" \
  "https://api.digitalocean.com/v2/droplets/$DROPLET_ID/actions")

ACTION_ID=$(echo $RESPONSE | jq -r '.action.id')

if [ -z "$ACTION_ID" ] || [ "$ACTION_ID" = "null" ]; then
    echo "❌ Failed to create snapshot"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "✅ Snapshot initiated (Action ID: $ACTION_ID)"
echo "⏳ Waiting for snapshot to complete..."

# Poll for completion
while true; do
    STATUS=$(curl -sX GET \
      -H "Authorization: Bearer $DO_TOKEN" \
      "https://api.digitalocean.com/v2/droplets/$DROPLET_ID/actions/$ACTION_ID" | \
      jq -r '.action.status')
    
    echo "   Status: $STATUS"
    
    if [ "$STATUS" = "completed" ]; then
        echo "✅ Snapshot completed successfully!"
        break
    elif [ "$STATUS" = "errored" ]; then
        echo "❌ Snapshot failed"
        exit 1
    fi
    
    sleep 10
done

echo ""
echo "📸 Snapshot Details:"
echo "   Name: $SNAPSHOT_NAME"
echo "   Droplet ID: $DROPLET_ID"
echo "   Action ID: $ACTION_ID"
```

### Run the Script:
```bash
chmod +x create-do-snapshot.sh
./create-do-snapshot.sh
```

## 💰 Snapshot Costs

| Type | Cost | Downtime |
|------|------|----------|
| **Live Snapshot** | $1.00/snapshot (one-time) | None |
| **Regular Snapshot** | Free | 5-15 min |
| **Snapshot Storage** | $0.05/GB/month | N/A |

**Example**: 35GB snapshot costs $1.75/month to keep

## 🗄️ Snapshot Management

### Storage Cost Optimization:
- Keep only recent snapshots (last 3-6)
- Delete old snapshots over 90 days
- Critical snapshots (before major changes) can be kept longer

### Recommended Retention:
```
✅ Keep: Last 3 snapshots (rolling)
✅ Keep: Pre-production deployment snapshots (30 days)
✅ Keep: Major milestone snapshots (90 days)
❌ Delete: Routine snapshots older than 30 days
```

### Delete Old Snapshots:
```bash
# Via web dashboard:
Droplets → Your Droplet → Snapshots → Click trash icon

# Via CLI:
doctl compute snapshot list --resource droplet
doctl compute snapshot delete SNAPSHOT_ID
```

## 📋 Snapshot Checklist

Before taking snapshot, verify:
- [ ] All recent code changes are deployed
- [ ] Database is in consistent state (if applicable)
- [ ] No active deployments running
- [ ] You have API token ready (if using CLI)
- [ ] Chosen meaningful snapshot name

After taking snapshot:
- [ ] Verify snapshot appears in dashboard
- [ ] Check snapshot size is reasonable (~matching droplet size)
- [ ] Document what state the snapshot represents
- [ ] Add to your runbook/documentation

## 🔄 What if Snapshot Fails?

Common causes and solutions:

1. **Insufficient Space in Your Account**
   - Solution: Delete old snapshots or upgrade account

2. **Droplet is Currently Being Modified**
   - Solution: Wait for current action to complete

3. **API Token Invalid/Expired**
   - Solution: Generate new token at https://cloud.digitalocean.com/account/api/tokens

4. **Droplet is Powered Off** (for live snapshots)
   - Solution: Power on droplet or use regular snapshot

## 🚀 Restoring from Snapshot

If you ever need to restore:

### Method 1: Restore in Place
1. Droplets → Your Droplet → Destroy → Confirm
2. Snapshots → Your Snapshot → Create Droplet
3. Configure same size/region
4. Update DNS (if IP changed)

### Method 2: Create Test Instance
1. Snapshots → Your Snapshot → Create Droplet
2. Choose name: "trafficjamz-test"
3. Different IP will be assigned
4. Test before making it production

## 📊 Current Snapshot Status

- 🎯 **Action Required**: Create snapshot after secret cleanup
- 📅 **Recommended Name**: `trafficjamz-prod-2026-03-05-post-secret-cleanup`
- 💰 **Cost**: $1.00 (live) + $1.75/month storage
- ⏱️ **Time to Complete**: 5-20 minutes
- 🔗 **Dashboard URL**: [https://cloud.digitalocean.com/droplets](https://cloud.digitalocean.com/droplets)

## ✅ After Creating Snapshot

Document in your runbook:
```
Snapshot: trafficjamz-prod-2026-03-05-post-secret-cleanup
Date: March 5, 2026
Purpose: Backup after git history secret cleanup
State: Clean repo, all services running, Clerk production active
Commands run: git-filter-repo, removed GitHub PAT + Mapbox tokens
```

---

**Next Steps:**
1. ✅ Read this guide
2. 🔗 [Login to DigitalOcean](https://cloud.digitalocean.com/)
3. 📸 Create live snapshot
4. ⏳ Wait for completion (5-20 min)
5. ✅ Verify and mark as complete!
