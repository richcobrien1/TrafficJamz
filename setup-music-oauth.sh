#!/bin/bash
# Music Platform OAuth Credentials Setup Script
# This script helps you obtain and configure OAuth credentials for all music platforms

echo "═══════════════════════════════════════════════════════════════"
echo "  TrafficJamz - Music Platform OAuth Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display section header
section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to add/update .env variable
update_env() {
    local key=$1
    local value=$2
    local env_file=$3
    
    if grep -q "^${key}=" "$env_file" 2>/dev/null; then
        # Update existing
        sed -i "s|^${key}=.*|${key}=${value}|" "$env_file"
        echo -e "${GREEN}✓${NC} Updated $key in $env_file"
    else
        # Add new
        echo "${key}=${value}" >> "$env_file"
        echo -e "${GREEN}✓${NC} Added $key to $env_file"
    fi
}

# ═══════════════════════════════════════════════════════════════
section "1. YouTube OAuth Credentials"
# ═══════════════════════════════════════════════════════════════

echo ""
echo "YouTube Client ID found: 882773733351-501lsh97cpv23qi3rgffrskd0cnm3r9l.apps.googleusercontent.com"
echo ""
echo -e "${YELLOW}To get your YouTube Client Secret:${NC}"
echo "1. Go to: https://console.cloud.google.com/apis/credentials"
echo "2. Select your project (or create one)"
echo "3. Find the OAuth 2.0 Client ID: 882773733351-501lsh97cpv23qi3rgffrskd0cnm3r9l"
echo "4. Click on it to view details"
echo "5. Copy the 'Client secret' value (starts with GOCSPX-)"
echo ""
read -p "Enter YouTube Client Secret (or press Enter to skip): " YOUTUBE_SECRET

if [ ! -z "$YOUTUBE_SECRET" ]; then
    update_env "YOUTUBE_CLIENT_SECRET" "$YOUTUBE_SECRET" "jamz-server/.env"
else
    echo -e "${YELLOW}⚠${NC}  Skipped YouTube Client Secret"
fi

# ═══════════════════════════════════════════════════════════════
section "2. Spotify OAuth Credentials"
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${YELLOW}To get your Spotify credentials:${NC}"
echo "1. Go to: https://developer.spotify.com/dashboard"
echo "2. Log in with your Spotify account"
echo "3. Click 'Create app'"
echo "   - App name: TrafficJamz"
echo "   - Redirect URI: https://jamz.v2u.us/auth/spotify/callback"
echo "   - Redirect URI: https://jamz.v2u.us/auth/spotify/integration-callback"
echo "4. Copy the 'Client ID' and 'Client secret'"
echo ""
read -p "Enter Spotify Client ID (or press Enter to skip): " SPOTIFY_ID
read -p "Enter Spotify Client Secret (or press Enter to skip): " SPOTIFY_SECRET

if [ ! -z "$SPOTIFY_ID" ]; then
    update_env "SPOTIFY_CLIENT_ID" "$SPOTIFY_ID" "jamz-server/.env"
fi

if [ ! -z "$SPOTIFY_SECRET" ]; then
    update_env "SPOTIFY_CLIENT_SECRET" "$SPOTIFY_SECRET" "jamz-server/.env"
fi

if [ -z "$SPOTIFY_ID" ] && [ -z "$SPOTIFY_SECRET" ]; then
    echo -e "${YELLOW}⚠${NC}  Skipped Spotify credentials"
fi

# ═══════════════════════════════════════════════════════════════
section "3. Apple Music Credentials"
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${YELLOW}To get your Apple Music credentials:${NC}"
echo "1. Go to: https://developer.apple.com/account"
echo "2. Navigate to: Certificates, Identifiers & Profiles"
echo "3. Select 'Keys' from the left menu"
echo "4. Click '+' to create a new key"
echo "   - Key Name: TrafficJamz MusicKit"
echo "   - Enable: MusicKit"
echo "5. Download the .p8 file (AuthKey_XXXXXXXX.p8)"
echo "6. Note the Key ID (10 characters)"
echo "7. Note your Team ID (found in top right or Membership page)"
echo ""
read -p "Enter Apple Team ID (or press Enter to skip): " APPLE_TEAM
read -p "Enter Apple Key ID (or press Enter to skip): " APPLE_KEY
read -p "Enter path to AuthKey .p8 file (or press Enter to skip): " APPLE_P8_PATH

if [ ! -z "$APPLE_TEAM" ]; then
    update_env "APPLE_TEAM_ID" "$APPLE_TEAM" "jamz-server/.env"
fi

if [ ! -z "$APPLE_KEY" ]; then
    update_env "APPLE_KEY_ID" "$APPLE_KEY" "jamz-server/.env"
fi

if [ ! -z "$APPLE_P8_PATH" ] && [ -f "$APPLE_P8_PATH" ]; then
    # Copy to server certs directory
    mkdir -p jamz-server/certs
    cp "$APPLE_P8_PATH" jamz-server/certs/AuthKey.p8
    echo -e "${GREEN}✓${NC} Copied AuthKey.p8 to jamz-server/certs/"
    update_env "APPLE_PRIVATE_KEY_PATH" "./certs/AuthKey.p8" "jamz-server/.env"
fi

if [ -z "$APPLE_TEAM" ] && [ -z "$APPLE_KEY" ] && [ -z "$APPLE_P8_PATH" ]; then
    echo -e "${YELLOW}⚠${NC}  Skipped Apple Music credentials"
fi

# ═══════════════════════════════════════════════════════════════
section "4. Deploy to Production"
# ═══════════════════════════════════════════════════════════════

echo ""
read -p "Deploy credentials to production server? (y/N): " DEPLOY

if [ "$DEPLOY" = "y" ] || [ "$DEPLOY" = "Y" ]; then
    echo ""
    echo "Deploying to production..."
    
    # Copy .env to server
    scp jamz-server/.env root@157.230.165.156:/root/TrafficJamz/jamz-server/.env
    
    # Copy AuthKey if exists
    if [ -f "jamz-server/certs/AuthKey.p8" ]; then
        ssh root@157.230.165.156 "mkdir -p /root/TrafficJamz/jamz-server/certs"
        scp jamz-server/certs/AuthKey.p8 root@157.230.165.156:/root/TrafficJamz/jamz-server/certs/
    fi
    
    # Restart Docker
    ssh root@157.230.165.156 "cd /root/TrafficJamz && docker restart trafficjamz"
    
    echo -e "${GREEN}✓${NC} Deployed to production and restarted backend"
else
    echo -e "${YELLOW}⚠${NC}  Skipped deployment"
fi

# ═══════════════════════════════════════════════════════════════
section "Setup Complete!"
# ═══════════════════════════════════════════════════════════════

echo ""
echo "Next steps:"
echo "1. If you skipped any credentials, run this script again"
echo "2. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)"
echo "3. Test each platform:"
echo "   - Spotify: Click 'Connect Spotify' button"
echo "   - YouTube: Click 'Connect YouTube' button"
echo "   - Apple Music: Click 'Connect Apple Music' button"
echo ""
echo -e "${GREEN}Happy jamming! 🎵${NC}"
echo ""
