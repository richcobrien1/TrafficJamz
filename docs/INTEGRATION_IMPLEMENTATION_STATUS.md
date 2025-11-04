# Music Platform Integration - Implementation Summary

## Backend Complete ✅

### Dependencies Installed
- `spotify-web-api-node` - Spotify Web API wrapper
- `googleapis` - YouTube Data API v3
- `jsonwebtoken` - Apple Music JWT tokens

### Database Models
- **UserIntegration**: Stores OAuth tokens for Spotify/Apple Music
- **AudioSession Tracks**: Enhanced with multi-source fields (spotifyId, youtubeId, appleMusicId, albumArt, etc.)

### Services Created
1. **spotify.service.js**: OAuth, playlists, search, token management
2. **youtube.service.js**: Video search, playlists, duration parsing
3. **apple-music.service.js**: Developer tokens, catalog access

### API Endpoints
```
Spotify:
  GET  /api/integrations/auth/spotify - Initiate OAuth
  GET  /api/integrations/auth/spotify/callback - OAuth callback
  POST /api/integrations/auth/spotify/refresh - Refresh token
  DELETE /api/integrations/auth/spotify - Disconnect
  GET  /api/integrations/spotify/playlists - User playlists
  GET  /api/integrations/spotify/playlists/:id/tracks - Playlist tracks
  GET  /api/integrations/spotify/search - Search tracks
  GET  /api/integrations/spotify/tracks/:id - Track details
  GET  /api/integrations/spotify/status - Connection status

YouTube:
  GET  /api/integrations/youtube/search - Search videos
  GET  /api/integrations/youtube/videos/:id - Video details
  GET  /api/integrations/youtube/playlists/:id - Playlist details
  GET  /api/integrations/youtube/playlists/:id/items - Playlist items

Apple Music:
  POST /api/integrations/auth/apple-music - Save user token
  DELETE /api/integrations/auth/apple-music - Disconnect
  GET  /api/integrations/apple-music/developer-token - Get dev token
  GET  /api/integrations/apple-music/search - Search catalog
  GET  /api/integrations/apple-music/playlists - User playlists
  GET  /api/integrations/apple-music/playlists/:id/tracks - Playlist tracks
  GET  /api/integrations/apple-music/tracks/:id - Track details
  GET  /api/integrations/apple-music/status - Connection status
```

## Frontend (Next Steps)

### Components to Create
1. **PlatformIntegrationSettings.jsx** - Connect/disconnect platforms
2. **PlaylistImportDialog.jsx** - Browse and import playlists
3. **TrackSearchDialog.jsx** - Search all platforms
4. **TrackSourceBadge.jsx** - Show track source (Spotify/YouTube/etc.)
5. **MusicPlatformSelector.jsx** - Tab selector for platforms

### Services to Create
1. **integrations.service.js** - API calls to integration endpoints

### Context Updates
1. **MusicContext.jsx** - Handle multi-source tracks
2. Add track source detection for playback

### UI Enhancements
1. Add "Import from..." buttons in AudioSession
2. Show platform badges on tracks
3. Handle preview playback vs full tracks

## Environment Variables Needed

### Backend (.env)
```bash
# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://yourapp.com/api/integrations/auth/spotify/callback

# YouTube
YOUTUBE_API_KEY=your_youtube_api_key

# Apple Music (if implementing)
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY_PATH=./certs/AuthKey_XXXXX.p8

# Frontend URL for OAuth redirects
FRONTEND_URL=https://yourfrontend.com
```

### Frontend (.env)
```bash
VITE_API_URL=https://yourbackend.com
VITE_SPOTIFY_ENABLED=true
VITE_YOUTUBE_ENABLED=true
VITE_APPLE_MUSIC_ENABLED=true
```

## Setup Instructions

### 1. Spotify Setup
1. Go to https://developer.spotify.com/dashboard
2. Create new app
3. Add redirect URI: `https://yourbackend.com/api/integrations/auth/spotify/callback`
4. Copy Client ID and Client Secret to .env
5. Set scopes: `user-read-private`, `user-read-email`, `playlist-read-private`, `playlist-read-collaborative`, `user-library-read`

### 2. YouTube Setup
1. Go to https://console.cloud.google.com
2. Create new project
3. Enable "YouTube Data API v3"
4. Create API key
5. Copy API key to .env

### 3. Apple Music Setup (Optional)
1. Enroll in Apple Developer Program ($99/year)
2. Register for MusicKit
3. Create MusicKit identifier and key
4. Download private key (.p8 file)
5. Copy Team ID, Key ID, and private key path to .env

## Testing

### Spotify
```bash
# Test OAuth flow
curl http://localhost:3000/api/integrations/auth/spotify

# Test search (requires authenticated user token)
curl -H "Authorization: Bearer YOUR_JWT" \
  "http://localhost:3000/api/integrations/spotify/search?q=Beatles"
```

### YouTube
```bash
# Test search
curl -H "Authorization: Bearer YOUR_JWT" \
  "http://localhost:3000/api/integrations/youtube/search?q=Beatles"
```

### Apple Music
```bash
# Get developer token
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3000/api/integrations/apple-music/developer-token

# Test search
curl -H "Authorization: Bearer YOUR_JWT" \
  "http://localhost:3000/api/integrations/apple-music/search?q=Beatles&storefront=us"
```

## Next: Frontend Implementation

Continue with creating React components for the integration UI!
