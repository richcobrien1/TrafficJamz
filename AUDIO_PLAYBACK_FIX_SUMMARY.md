# Audio Playback Issues - Root Cause & Fixes

## Issues Found

### 1. Spotify Tracks Won't Play ❌
**Root Cause:** Spotify API credentials not configured on server
- Frontend shows: `⚠️ Spotify SDK loading disabled - using preview URLs only`
- Backend shows: `⚠️ Spotify credentials not configured`
- Tracks in playlist have `spotifyId` but no playback URL

**What Happens:**
- User adds Spotify track to playlist
- Track stored in MongoDB with `spotifyId` only
- No `spotifyPreviewUrl` because Spotify API isn't called
- Frontend can't play track - no URL available

### 2. MP3 Files Not Playing ❌  
**Root Cause:** Possibly Supabase bucket permissions or files not uploaded correctly
- Files upload to `profile-images` bucket under `session-music/` path
- Public URL generated but may not be accessible

## Solutions

### Fix 1: Add Spotify Credentials to Server

**Required Environment Variables:**
```bash
SPOTIFY_CLIENT_ID="9113f5d5ac874286afd5885e24bdf48c"
SPOTIFY_CLIENT_SECRET="<YOUR_SECRET_HERE>"
SPOTIFY_REDIRECT_URI="https://jamz.v2u.us/auth/spotify/callback"
```

**Steps:**
1. Get Spotify Client Secret from: https://developer.spotify.com/dashboard
2. Add to `.env.prod` on Digital Ocean server
3. Restart backend container

**What This Enables:**
- Backend can call Spotify API
- Fetch track metadata including `preview_url` (30-second clips)
- Store preview URLs in MongoDB with tracks
- Frontend can play 30-second previews

**Note:** Full Spotify playback requires:
- User Spotify Premium account
- Spotify Web Playback SDK initialized
- User authentication via OAuth

### Fix 2: Verify Supabase Storage for MP3s

**Current Setup:**
- Bucket: `profile-images`
- Path: `session-music/`
- Service: Supabase Storage (configured ✅)

**Required:**
1. Verify bucket is PUBLIC
2. Verify RLS is disabled (or has proper policies)
3. Test file upload and URL generation

**Steps to Verify:**
1. Go to: https://supabase.com/dashboard/project/nrlaqkpojtvvheosnpaz/storage/buckets
2. Check `profile-images` bucket settings
3. Ensure "Public bucket" is checked
4. Test uploading an MP3 file
5. Verify generated URL is accessible

### Alternative: Use Dedicated Music Bucket

**Better Setup:**
1. Create new bucket: `session-music`
2. Make it public
3. Update code to use new bucket name
4. Update in: `jamz-server/src/routes/audio.routes.js` line 591

```javascript
// Change from:
.from('profile-images')

// To:
.from('session-music')
```

## Quick Test Commands

### Test Spotify (after adding credentials):
```bash
# SSH to server
ssh root@157.230.165.156

# Check if Spotify is configured
docker exec trafficjamz printenv | grep SPOTIFY

# Restart container
docker restart trafficjamz

# Check logs
docker logs -f trafficjamz | grep -i spotify
```

### Test MP3 Upload:
```bash
# Check Supabase connection
docker logs trafficjamz 2>&1 | grep -i supabase

# Look for upload logs
docker logs trafficjamz 2>&1 | grep -i "music.*upload"
```

## Frontend Behavior

### With Fixes:
✅ Spotify tracks play 30-second previews  
✅ MP3 files play full duration  
✅ YouTube tracks work (if YouTube API configured)  

### Without Fixes (Current State):
❌ Spotify tracks fail - no URL  
❌ MP3 files may fail - permission issues  
🔵 Frontend falls back to error messages

## Priority Actions

1. **HIGH**: Add Spotify credentials to `.env.prod`
2. **MEDIUM**: Verify Supabase bucket permissions
3. **LOW**: Consider creating dedicated `session-music` bucket
4. **OPTIONAL**: Set up full Spotify playback (requires Premium)

## Files Involved

- **Storage**: `jamz-server/src/services/s3.service.js`
- **Upload**: `jamz-server/src/routes/audio.routes.js` (lines 530-630)
- **Spotify**: `jamz-server/src/services/spotify.service.js`
- **Schema**: `jamz-server/src/models/audio-session.model.js`
- **Config**: `jamz-server/.env.prod`

