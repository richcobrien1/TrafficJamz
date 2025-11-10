#!/bin/bash
# Music Platform Integration Setup Script
# This script helps you add music platform credentials to .env.production

ENV_FILE="/root/TrafficJamz/jamz-server/.env.production"

echo "==================================="
echo "TrafficJamz Music Platform Setup"
echo "==================================="
echo ""
echo "This script will guide you through adding credentials for:"
echo "  1. Spotify"
echo "  2. YouTube Music"
echo "  3. Apple Music"
echo ""

# Check if file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found!"
    exit 1
fi

# Check if music platform variables already exist
if grep -q "^SPOTIFY_CLIENT_ID=" "$ENV_FILE"; then
    echo "⚠️  Music platform variables already exist in .env.production"
    read -p "Do you want to update them? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting without changes."
        exit 0
    fi
    # Remove old music platform variables
    sed -i '/^# Music Platform Integrations/,/^APPLE_MUSIC_PRIVATE_KEY_PATH=/d' "$ENV_FILE"
fi

echo ""
echo "==================================="
echo "1. Spotify Configuration"
echo "==================================="
echo "Get these from: https://developer.spotify.com/dashboard"
echo ""
read -p "Spotify Client ID: " SPOTIFY_CLIENT_ID
read -p "Spotify Client Secret: " SPOTIFY_CLIENT_SECRET

echo ""
echo "==================================="
echo "2. YouTube Configuration"
echo "==================================="
echo "Get this from: https://console.cloud.google.com/"
echo ""
read -p "YouTube API Key: " YOUTUBE_API_KEY

echo ""
echo "==================================="
echo "3. Apple Music Configuration"
echo "==================================="
echo "Get these from: https://developer.apple.com/account"
echo ""
read -p "Apple Music Team ID: " APPLE_MUSIC_TEAM_ID
read -p "Apple Music Key ID: " APPLE_MUSIC_KEY_ID
read -p "Private Key Path (e.g., ./certs/AuthKey_XXXXX.p8): " APPLE_MUSIC_PRIVATE_KEY_PATH

# Append to .env.production
cat >> "$ENV_FILE" << EOF

# Music Platform Integrations
SPOTIFY_CLIENT_ID=$SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET=$SPOTIFY_CLIENT_SECRET
SPOTIFY_REDIRECT_URI=https://trafficjamz.v2u.us/api/integrations/auth/spotify/callback
YOUTUBE_API_KEY=$YOUTUBE_API_KEY
APPLE_MUSIC_TEAM_ID=$APPLE_MUSIC_TEAM_ID
APPLE_MUSIC_KEY_ID=$APPLE_MUSIC_KEY_ID
APPLE_MUSIC_PRIVATE_KEY_PATH=$APPLE_MUSIC_PRIVATE_KEY_PATH
EOF

echo ""
echo "✅ Configuration saved to $ENV_FILE"
echo ""
echo "Next steps:"
echo "  1. Restart the backend container:"
echo "     docker stop trafficjamz && docker rm trafficjamz"
echo "     docker run -d --name trafficjamz --network host --env-file $ENV_FILE trafficjamz-backend"
echo ""
echo "  2. Test the integration in TrafficJamz"
echo ""
echo "For detailed setup instructions, see: docs/MUSIC_PLATFORM_SETUP.md"
