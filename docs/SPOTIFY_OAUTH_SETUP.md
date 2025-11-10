# Spotify OAuth Setup Guide

## Overview
TrafficJamz uses client-side OAuth with PKCE (Proof Key for Code Exchange) to allow users to connect their own Spotify accounts. This means each user logs in with their own Spotify credentials - no backend secrets needed.

## Steps to Get Spotify Client ID

1. **Go to Spotify Developer Dashboard**
   - Visit https://developer.spotify.com/dashboard
   - Log in with your Spotify account

2. **Create a New App**
   - Click "Create app"
   - Fill in:
     - App name: `TrafficJamz`
     - App description: `Music playlist integration for TrafficJamz`
     - Redirect URI: `https://trafficjamz.vercel.app/auth/spotify/callback`
   - Check "Web API" under API/SDKs
   - Accept terms and create

3. **Get Your Client ID**
   - Copy the "Client ID" from the app settings
   - **IMPORTANT**: You do NOT need the Client Secret for PKCE flow

4. **Update the Code**
   - Replace the placeholder in `spotify-client.service.js`:
     ```javascript
     const CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID_HERE';
     ```

5. **Add Redirect URI**
   - Production: `https://trafficjamz.vercel.app/auth/spotify/callback`

## How It Works

### Client-Side OAuth Flow (PKCE)
1. User clicks "Connect Spotify" in the app
2. App generates a code verifier and code challenge
3. User redirects to Spotify authorization page
4. User logs in with THEIR OWN Spotify credentials
5. Spotify redirects back to `/auth/spotify/callback?code=...`
6. App exchanges code for access token (using code verifier)
7. Tokens stored in localStorage for that user
8. User can now browse their own playlists

### Why PKCE?
- **No backend secrets**: Client ID is public, no secret needed
- **Secure**: Uses cryptographic challenge/verifier pair
- **User-owned**: Each user authenticates with their own account
- **Token refresh**: Refresh tokens stored locally, auto-refreshed when expired

## Security Notes

- ✅ Client ID can be public (it's in your frontend code)
- ✅ No backend required for authentication
- ✅ Each user has their own access/refresh tokens
- ✅ Tokens stored in localStorage (consider encryption for production)
- ⚠️ Make sure redirect URIs match EXACTLY in Spotify dashboard
- ⚠️ Use HTTPS in production for security

## Testing

1. Start dev server: `npm run dev`
2. Go to Music Upload section
3. Click accordion "Link Playlist"
4. Click "Connect" under Spotify
5. Login with YOUR Spotify account
6. Should redirect back and show your playlists

## Troubleshooting

### "Invalid redirect URI"
- Check that redirect URI in Spotify dashboard matches exactly
- Include protocol (http:// or https://)
- Check for trailing slashes

### "Token expired" errors
- Check that refresh logic is working in `spotify-client.service.js`
- Token should auto-refresh before making API calls

### "No playlists showing"
- Check browser console for errors
- Verify token is stored: `localStorage.getItem('spotify_access_token')`
- Test API call manually in browser console:
  ```javascript
  import spotifyClient from './services/spotify-client.service';
  spotifyClient.getPlaylists().then(console.log);
  ```

## API Scopes

Current scopes requested:
- `user-read-private` - Read user profile
- `user-read-email` - Read user email
- `playlist-read-private` - Read private playlists
- `playlist-read-collaborative` - Read collaborative playlists
- `user-library-read` - Read user's saved tracks

Add more scopes if needed for additional features.

## Production Deployment

1. Add production redirect URI to Spotify dashboard
2. Update CLIENT_ID in production build
3. Consider using environment variables:
   ```javascript
   const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || 'fallback-id';
   ```

## References

- [Spotify Web API Docs](https://developer.spotify.com/documentation/web-api)
- [Authorization Code with PKCE Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
