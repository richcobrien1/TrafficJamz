# Music Platform API Integration Plan

## Overview
Enable users to import and share playlists from major music platforms (Spotify, Apple Music, YouTube Music) into TrafficJamz sessions.

## Platform Options

### 1. Spotify Web API
**Best Choice - Most Comprehensive**

#### Capabilities:
- ✅ Search tracks, albums, artists
- ✅ Get user playlists
- ✅ Get playlist tracks
- ✅ Get track metadata (duration, album art, etc.)
- ✅ 30-second preview URLs for each track
- ✅ Create/modify playlists
- ✅ OAuth 2.0 authentication

#### Limitations:
- ⚠️ Preview clips only (30 seconds) - full playback requires Spotify Premium + Web Playback SDK
- ⚠️ Web Playback SDK requires Spotify Premium subscription
- ⚠️ Cannot download full tracks for offline use

#### Integration Steps:
1. Register app at https://developer.spotify.com/dashboard
2. Get Client ID and Client Secret
3. Implement OAuth 2.0 PKCE flow for user authentication
4. Use Spotify Web API to:
   - Fetch user playlists
   - Import playlist metadata to Jamz
   - Store Spotify track IDs alongside local tracks
5. Optional: Implement Web Playback SDK for Premium users

#### API Endpoints:
```
GET /me/playlists - Get user's playlists
GET /playlists/{playlist_id}/tracks - Get tracks from playlist
GET /search - Search for tracks
GET /tracks/{id} - Get track details
POST /playlists - Create playlist
```

#### Rate Limits:
- Generally: 1 request per second per user
- Higher limits available for production apps

---

### 2. Apple Music API
**Good Alternative for Apple Ecosystem Users**

#### Capabilities:
- ✅ Search music catalog
- ✅ Get user library and playlists (requires user authentication)
- ✅ Get track metadata
- ✅ 30-90 second preview URLs
- ✅ MusicKit JS for web playback

#### Limitations:
- ⚠️ Requires Apple Developer Program membership ($99/year)
- ⚠️ Preview clips only - full playback requires Apple Music subscription
- ⚠️ MusicKit requires active Apple Music subscription
- ⚠️ More complex authentication (JWT tokens)

#### Integration Steps:
1. Enroll in Apple Developer Program
2. Register for MusicKit
3. Generate Developer Token (JWT)
4. Implement user authentication flow
5. Use Apple Music API to import playlists

#### API Endpoints:
```
GET /v1/me/library/playlists - Get user playlists
GET /v1/catalog/{storefront}/playlists/{id} - Get playlist
GET /v1/catalog/{storefront}/search - Search tracks
```

---

### 3. YouTube Music / YouTube Data API
**Free Option with Good Coverage**

#### Capabilities:
- ✅ Search videos/music
- ✅ Get playlist items
- ✅ Get video metadata
- ✅ Free access to full videos (if public)
- ✅ No subscription required for basic playback

#### Limitations:
- ⚠️ YouTube Music doesn't have dedicated API
- ⚠️ Must use YouTube Data API v3
- ⚠️ Can't officially distinguish "music" videos
- ⚠️ Quota limits (10,000 units/day free tier)
- ⚠️ Videos may include ads
- ⚠️ Copyright restrictions may block playback

#### Integration Steps:
1. Create project in Google Cloud Console
2. Enable YouTube Data API v3
3. Get API key or implement OAuth 2.0
4. Use API to search and fetch playlists
5. Embed YouTube player or extract audio streams

#### API Endpoints:
```
GET /search - Search for videos
GET /playlists - Get playlist info
GET /playlistItems - Get videos in playlist
GET /videos - Get video details
```

#### Quota Costs:
- Search: 100 units per request
- Playlist items: 1 unit per request
- Daily quota: 10,000 units (free)

---

## Recommended Implementation Strategy

### Phase 1: Spotify Integration (Highest Priority)
**Why:** Best developer experience, excellent documentation, preview clips work without subscription

1. **Setup & Authentication**
   - Register app on Spotify Developer Dashboard
   - Implement OAuth 2.0 PKCE flow
   - Store access tokens securely (encrypted in MongoDB)

2. **Playlist Import**
   - Add "Import from Spotify" button in Jamz UI
   - Fetch user's Spotify playlists
   - Display playlists for user to select
   - Import selected playlist metadata:
     - Track name, artist, album
     - Duration
     - Album artwork URL
     - Spotify track ID
     - 30-second preview URL

3. **Track Metadata Storage**
   ```javascript
   // Enhanced track schema
   {
     title: String,
     artist: String,
     album: String,
     duration: Number,
     fileUrl: String, // Local file or null
     spotifyId: String, // Spotify track ID
     spotifyPreviewUrl: String, // 30-second preview
     albumArt: String, // Album artwork URL
     source: String, // 'local' | 'spotify' | 'youtube'
     uploadedBy: ObjectId
   }
   ```

4. **Playback Options**
   - If track has `fileUrl`: Play full track from local storage
   - If track has `spotifyPreviewUrl`: Play 30-second preview
   - Show badge indicating "Preview" vs "Full Track"

### Phase 2: YouTube Music Search (Good Free Alternative)
1. Implement YouTube search for tracks
2. Allow users to search and add YouTube music videos
3. Store YouTube video IDs
4. Embed YouTube player or extract audio stream

### Phase 3: Apple Music (Optional, for Premium Users)
1. Add Apple Music integration for users with subscriptions
2. Similar import flow to Spotify

---

## Technical Implementation

### Backend (Node.js/Express)

#### New Routes:
```javascript
// Spotify OAuth
GET  /api/auth/spotify - Initiate Spotify OAuth flow
GET  /api/auth/spotify/callback - Handle OAuth callback
POST /api/auth/spotify/refresh - Refresh access token

// Playlist Import
GET  /api/integrations/spotify/playlists - Get user's Spotify playlists
POST /api/integrations/spotify/import - Import playlist to Jamz session
GET  /api/integrations/spotify/search - Search Spotify tracks

// YouTube Integration
GET  /api/integrations/youtube/search - Search YouTube music
GET  /api/integrations/youtube/playlist - Get YouTube playlist
```

#### New Models:
```javascript
// User Integrations
{
  userId: ObjectId,
  platform: 'spotify' | 'youtube' | 'apple',
  accessToken: String (encrypted),
  refreshToken: String (encrypted),
  expiresAt: Date,
  scope: [String],
  createdAt: Date
}
```

#### Dependencies:
```bash
npm install spotify-web-api-node
npm install googleapis  # For YouTube
npm install jsonwebtoken  # For Apple Music JWT
```

### Frontend (React)

#### New Components:
- `PlatformIntegration.jsx` - Connect accounts UI
- `PlaylistImportDialog.jsx` - Select playlists to import
- `TrackSearchDialog.jsx` - Search external platforms
- `TrackSourceBadge.jsx` - Show track source (local/Spotify/YouTube)

#### Integration Flow:
```
1. User clicks "Connect Spotify"
2. Redirect to Spotify authorization
3. User grants permissions
4. Callback saves tokens
5. User clicks "Import Playlist"
6. Fetch playlists from Spotify
7. User selects playlist
8. Import track metadata to Jamz session
9. Tracks appear in session playlist
10. DJ can play previews or full tracks (if available)
```

---

## Security Considerations

1. **Token Storage**
   - Encrypt access tokens and refresh tokens in database
   - Use environment variables for API keys
   - Never expose client secrets to frontend

2. **OAuth Flow**
   - Use PKCE (Proof Key for Code Exchange) for Spotify
   - Implement CSRF protection
   - Validate state parameter in OAuth callbacks

3. **Rate Limiting**
   - Cache API responses where possible
   - Implement request throttling
   - Monitor quota usage

4. **User Privacy**
   - Only request necessary scopes
   - Allow users to disconnect integrations
   - Don't store unnecessary user data

---

## User Experience Enhancements

1. **Mixed Playlists**
   - Allow combining local tracks + Spotify previews + YouTube videos
   - Show clear indication of track source
   - Indicate "Preview" vs "Full Track"

2. **Smart Fallback**
   - If Spotify preview unavailable, search YouTube for same track
   - Allow users to manually link tracks across platforms

3. **Collaborative Features**
   - All session members can add tracks from any source
   - DJ controls playback regardless of source
   - Sync playback across all listeners

4. **Offline Mode**
   - Cache track metadata locally
   - Queue tracks for offline playback (local files only)
   - Show which tracks are available offline

---

## Cost Analysis

### Spotify Web API
- **Cost:** FREE
- **Requirements:** None
- **Limitations:** Preview clips only without Premium

### YouTube Data API v3
- **Cost:** FREE (10,000 units/day)
- **Extra Cost:** $0 if within quota, ~$0-5/day if exceeding
- **Requirements:** Google Cloud project

### Apple Music API
- **Cost:** FREE (API itself)
- **Requirements:** Apple Developer Program ($99/year)
- **Limitations:** Users need Apple Music subscription

---

## Recommendation: Start with Spotify

**Why Spotify First:**
1. ✅ Best developer experience and documentation
2. ✅ Free to implement
3. ✅ No subscription requirement for import/search
4. ✅ 30-second previews work for all users
5. ✅ OAuth 2.0 PKCE is straightforward
6. ✅ Excellent API coverage
7. ✅ Most popular music platform globally

**Implementation Timeline:**
- Week 1: Spotify OAuth + account connection
- Week 2: Playlist import functionality
- Week 3: Track search and metadata enrichment
- Week 4: UI/UX polish and testing

**Future Expansion:**
- Add YouTube integration (Week 5-6)
- Add Apple Music integration (Week 7-8)
- Implement smart track matching across platforms

---

## Next Steps

1. **Create Spotify Developer Account**
   - Go to https://developer.spotify.com/dashboard
   - Create new app
   - Get Client ID and Client Secret
   - Add redirect URI: `https://yourapp.com/api/auth/spotify/callback`

2. **Install Dependencies**
   ```bash
   cd jamz-server
   npm install spotify-web-api-node
   ```

3. **Set Environment Variables**
   ```bash
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   SPOTIFY_REDIRECT_URI=https://yourapp.com/api/auth/spotify/callback
   ```

4. **Implement OAuth Flow**
   - Create `/api/auth/spotify` endpoint
   - Create `/api/auth/spotify/callback` endpoint
   - Store tokens in database (encrypted)

5. **Build Playlist Import**
   - Fetch user playlists
   - Display in UI
   - Import selected playlist to session

Ready to start implementation? 🚀
