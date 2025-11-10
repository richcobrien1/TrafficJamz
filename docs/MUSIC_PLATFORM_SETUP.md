# Music Platform Integration Setup

This guide will walk you through setting up Spotify, YouTube Music, and Apple Music integrations for TrafficJamz.

## Prerequisites

- Access to developer accounts for Spotify, YouTube (Google Cloud), and Apple
- Production backend running at `https://trafficjamz.v2u.us`

---

## 1. Spotify Setup

### Step 1: Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **"Create app"**
4. Fill in the details:
   - **App name**: TrafficJamz
   - **App description**: Music sharing for group sessions
   - **Redirect URI**: `https://trafficjamz.v2u.us/api/integrations/auth/spotify/callback`
   - **API/SDKs**: Web API
5. Click **"Save"**

### Step 2: Get Credentials

1. Click on your newly created app
2. Go to **Settings**
3. Copy the **Client ID**
4. Click **"View client secret"** and copy the **Client Secret**

### Step 3: Add to Environment

Add to `jamz-server/.env.production`:

```bash
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=https://trafficjamz.v2u.us/api/integrations/auth/spotify/callback
```

---

## 2. YouTube Music Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name it **"TrafficJamz"**
4. Click **"Create"**

### Step 2: Enable YouTube Data API v3

1. In your project, go to **"APIs & Services"** → **"Library"**
2. Search for **"YouTube Data API v3"**
3. Click on it and press **"Enable"**

### Step 3: Create API Key

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"API key"**
3. Copy the API key
4. (Optional) Click **"Restrict key"** and limit to YouTube Data API v3

### Step 4: Add to Environment

Add to `jamz-server/.env.production`:

```bash
YOUTUBE_API_KEY=your_api_key_here
```

---

## 3. Apple Music Setup

### Step 1: Enroll in Apple Developer Program

1. Go to [Apple Developer](https://developer.apple.com/)
2. Enroll in the **Apple Developer Program** ($99/year)
3. Wait for enrollment confirmation (can take 24-48 hours)

### Step 2: Create MusicKit Identifier

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** button
4. Select **Media IDs** → **Continue**
5. Fill in:
   - **Description**: TrafficJamz MusicKit
   - **Identifier**: com.trafficjamz.musickit (or your bundle ID)
6. Click **Continue** → **Register**

### Step 3: Create MusicKit Private Key

1. In the same section, go to **Keys**
2. Click the **+** button
3. Fill in:
   - **Key Name**: TrafficJamz MusicKit Key
   - Check **MusicKit**
4. Click **Continue** → **Register**
5. **Download the .p8 file** (you can only download it once!)
6. Note the **Key ID** shown on the confirmation page

### Step 4: Get Team ID

1. Go to [Membership page](https://developer.apple.com/account/#!/membership)
2. Copy your **Team ID** (10-character string)

### Step 5: Upload Private Key to Server

Upload your `.p8` file to the server:

```bash
scp AuthKey_XXXXXXXXXX.p8 root@157.230.165.156:/root/TrafficJamz/jamz-server/certs/
```

### Step 6: Add to Environment

Add to `jamz-server/.env.production`:

```bash
APPLE_MUSIC_TEAM_ID=your_team_id_here
APPLE_MUSIC_KEY_ID=your_key_id_here
APPLE_MUSIC_PRIVATE_KEY_PATH=./certs/AuthKey_XXXXXXXXXX.p8
```

---

## 4. Restart Backend

After adding all credentials:

```bash
ssh root@157.230.165.156
cd /root/TrafficJamz
docker stop trafficjamz && docker rm trafficjamz
docker run -d --name trafficjamz --network host --env-file jamz-server/.env.production trafficjamz-backend
```

---

## 5. Testing

### Test Spotify

1. Open TrafficJamz audio session
2. Open Music dialog
3. Expand "Link Playlist" accordion
4. Click Spotify tab → Click "Connect"
5. Authorize in popup window
6. Your Spotify playlists should appear

### Test YouTube

1. YouTube doesn't require connection (uses public API)
2. Enter a YouTube playlist URL or search for videos
3. Playlists will load automatically

### Test Apple Music

1. Click Apple Music tab → Click "Connect"
2. Sign in with your Apple ID (if not already signed in)
3. Authorize TrafficJamz access
4. Your Apple Music library playlists should appear

---

## API Quota Limits

### Spotify
- **Rate Limit**: 10 requests/second per app
- **Quota**: No daily limit (reasonable use)

### YouTube
- **Daily Quota**: 10,000 units (default free tier)
- **Cost per playlist read**: ~100 units
- Can request quota increase if needed

### Apple Music
- **Rate Limit**: No documented limit
- **Requirements**: Active Apple Developer Program membership

---

## Troubleshooting

### Spotify "Invalid redirect URI"
- Ensure the callback URL in Spotify Dashboard matches exactly: `https://trafficjamz.v2u.us/api/integrations/auth/spotify/callback`

### YouTube "API key not valid"
- Check API key is correctly copied
- Ensure YouTube Data API v3 is enabled in Google Cloud Console

### Apple Music "Invalid token"
- Verify Team ID and Key ID are correct
- Ensure .p8 file is uploaded to the correct path
- Check that MusicKit is enabled for your key

### "Backend not responding"
- Check Docker container is running: `docker ps | grep trafficjamz`
- View logs: `docker logs trafficjamz | tail -50`
- Verify environment variables: `docker exec trafficjamz printenv | grep -E 'SPOTIFY|YOUTUBE|APPLE'`

---

## Security Notes

- **Never commit** API keys, secrets, or private keys to git
- Store `.env.production` securely on the server only
- Rotate Spotify client secret if exposed
- Regenerate YouTube API key if compromised
- Apple Music private key can only be downloaded once - back it up securely

---

## Cost Summary

| Platform | Cost |
|----------|------|
| **Spotify** | Free |
| **YouTube** | Free (up to 10,000 quota/day) |
| **Apple Music** | $99/year (Developer Program) |

**Total Annual Cost**: $99/year
