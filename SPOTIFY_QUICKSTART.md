# 🎵 Spotify OAuth - Quick Start

## Get Your Client ID (5 minutes)

1. **Visit:** https://developer.spotify.com/dashboard
2. **Click:** "Create app"
3. **Fill in:**
   - App name: `TrafficJamz`
   - App description: `Music integration for TrafficJamz`
   - Redirect URIs: `http://localhost:5173/auth/spotify/callback`
   - API: Check "Web API"
4. **Copy:** Client ID from app settings

## Configure App

```bash
# Create .env file
cd jamz-client-vite
cp .env.example .env.development

# Edit .env.development and add:
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
```

## Test It

```bash
# Start dev server
npm run dev

# Open browser
# → Go to Music Upload section
# → Click "Link Playlist" accordion
# → Click Spotify → Connect
# → Login with your Spotify account
# → Should see your playlists
```

## Troubleshooting

**"Invalid redirect URI"**
- Check Spotify dashboard → Settings → Redirect URIs
- Must match EXACTLY: `http://localhost:5173/auth/spotify/callback`

**"No playlists showing"**
- Open browser console (F12)
- Look for error messages
- Check token: `localStorage.getItem('spotify_access_token')`

**"Token expired"**
- Token should auto-refresh
- If not, clear localStorage and reconnect

## Architecture

```
User clicks "Connect Spotify"
    ↓
Redirect to Spotify login
    ↓
User authorizes app
    ↓
Spotify redirects to /auth/spotify/callback?code=XXX
    ↓
Exchange code for access token (PKCE)
    ↓
Store token in localStorage
    ↓
Fetch user's playlists
    ↓
Display in accordion UI
```

## Files You Need

### Created ✅
- `services/spotify-client.service.js` - OAuth + API calls
- `pages/auth/SpotifyCallback.jsx` - Callback handler
- `components/music/PlaylistImportAccordion.jsx` - UI (updated)
- `App.jsx` - Route added

### Configure ⚙️
- `.env.development` - Add VITE_SPOTIFY_CLIENT_ID
- Spotify Dashboard - Add redirect URI

### Optional 📝
- `scripts/test-spotify-setup.js` - Validation script
- `docs/SPOTIFY_OAUTH_SETUP.md` - Full guide

## Production Deployment

1. **Add production redirect URI:**
   - `https://your-domain.com/auth/spotify/callback`

2. **Set env var in Vercel:**
   - Project Settings → Environment Variables
   - `VITE_SPOTIFY_CLIENT_ID` = your_client_id

3. **Deploy:**
   ```bash
   git push origin main
   ```

## Security ✅

- ✅ Client ID is public (safe to commit)
- ✅ No client secret needed (PKCE flow)
- ✅ Each user has own tokens
- ✅ Tokens stored in localStorage
- ⚠️ Use HTTPS in production

## What's Next?

- [ ] Get Spotify Client ID
- [ ] Test OAuth flow
- [ ] Implement Apple Music (MusicKit JS)
- [ ] Implement YouTube (public API)
- [ ] Add token encryption
- [ ] Polish UI/UX

## Need Help?

- **Full setup guide:** `docs/SPOTIFY_OAUTH_SETUP.md`
- **Implementation details:** `docs/MUSIC_OAUTH_IMPLEMENTATION.md`
- **Test script:** `node scripts/test-spotify-setup.js`
- **Spotify docs:** https://developer.spotify.com/documentation
