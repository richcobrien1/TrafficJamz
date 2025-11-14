# TrafficJamz Mobile Production Test Script

## Pre-Test Setup
- [ ] Production build completed: `npm run build`
- [ ] Capacitor synced: `npx cap sync android`
- [ ] capacitor.config.json has NO `server` section (production mode)
- [ ] Backend healthy: `curl https://trafficjamz.v2u.us/api/health`
- [ ] Android Studio emulator running
- [ ] Chrome DevTools connected: `chrome://inspect/#devices`

---

## API Configuration Tests

### 1. Capacitor Detection
**Test**: Verify app detects Capacitor environment correctly
- [ ] Open Chrome DevTools Console (inspect WebView)
- [ ] Look for log: `📱 CAPACITOR DETECTED - Using production backend: https://trafficjamz.v2u.us/api`
- [ ] Verify: `window.Capacitor` object exists
- [ ] Verify: `window.location.protocol` is `capacitor:`
- [ ] Expected baseURL: `https://trafficjamz.v2u.us/api`

**Console Commands to Run**:
```javascript
console.log('Protocol:', window.location.protocol);
console.log('Capacitor:', window.Capacitor);
console.log('API Base:', axios.defaults.baseURL); // Check in Network tab
```

### 2. Backend Connectivity
**Test**: App can reach production backend
- [ ] App loads without "Server is taking longer than usual" spinner stuck
- [ ] Console shows: `✅ Backend is ready!`
- [ ] No CORS errors in console
- [ ] No timeout errors after 30 seconds

**Network Tab Verification**:
- [ ] Check first request: `GET https://trafficjamz.v2u.us/api/health`
- [ ] Status: `200 OK`
- [ ] Response time: < 5 seconds

---

## Authentication Flow Tests

### 3. Login
**Test**: User can authenticate with production backend
- [ ] Navigate to Login screen
- [ ] Enter credentials: `richcobrien@v2u.us` / password
- [ ] Click "Login"
- [ ] Network request: `POST https://trafficjamz.v2u.us/api/auth/login`
- [ ] Response includes: `token`, `refresh_token`, `user` object
- [ ] Token stored in localStorage
- [ ] Redirects to Dashboard

**Console Verification**:
```javascript
console.log('Token:', localStorage.getItem('token'));
console.log('User:', JSON.parse(localStorage.getItem('user')));
```

### 4. Session Persistence
**Test**: Token persists across app restarts
- [ ] Close app completely
- [ ] Reopen app
- [ ] App loads directly to Dashboard (not Login)
- [ ] Network request: `GET https://trafficjamz.v2u.us/api/auth/me` (validates token)
- [ ] User info loads correctly

---

## Profile & Avatar Tests

### 5. Profile Page Load
**Test**: User profile data loads from backend
- [ ] Navigate to Profile page
- [ ] Network request: `GET https://trafficjamz.v2u.us/api/users/profile`
- [ ] Avatar displays (R2 signed URL)
- [ ] User info displays: name, email, username
- [ ] Subscription status shows

**Check Avatar URL**:
- [ ] Console: Check `user.profile_image_url`
- [ ] Should be R2 signed URL: `https://music.c12d1726f92c6e6a2c1c020e39d2e9a9.r2.cloudflarestorage.com/...`
- [ ] URL includes signature: `&X-Amz-Signature=...`
- [ ] Image loads (not broken)

### 6. Avatar Upload
**Test**: Profile image upload to Cloudflare R2
- [ ] Click avatar to upload new image
- [ ] Select image file
- [ ] Network request: `POST https://trafficjamz.v2u.us/api/users/profile-image`
- [ ] Response includes new signed URL
- [ ] Avatar updates immediately (no page refresh needed)
- [ ] Image persists after app restart

---

## Dashboard & Groups Tests

### 7. Dashboard Load
**Test**: User's groups load from backend
- [ ] Navigate to Dashboard
- [ ] Network request: `GET https://trafficjamz.v2u.us/api/groups`
- [ ] Groups list displays
- [ ] Each group shows: name, description, member count, avatar

### 8. Group Detail
**Test**: Individual group data loads
- [ ] Click on "Snow Warriors" group
- [ ] Network request: `GET https://trafficjamz.v2u.us/api/groups/:groupId`
- [ ] Group details display
- [ ] Members tab loads: `GET https://trafficjamz.v2u.us/api/groups/:groupId/members`
- [ ] Verify gradient background visible

---

## Music Player Integration Tests

### 9. Spotify Connection
**Test**: Spotify OAuth and playback API
- [ ] Navigate to Music tab in group
- [ ] If not connected, click "Connect Spotify"
- [ ] OAuth redirect: `https://trafficjamz.v2u.us/api/music/spotify/auth`
- [ ] Callback: `GET /auth/spotify/callback?code=...`
- [ ] Token stored in database
- [ ] Playlists load: `GET https://trafficjamz.v2u.us/api/music/playlists`

### 10. YouTube Music Connection
**Test**: YouTube OAuth and API
- [ ] Navigate to Music tab
- [ ] Click "Connect YouTube Music"
- [ ] OAuth redirect: `https://trafficjamz.v2u.us/api/music/youtube/auth`
- [ ] Callback: `GET /auth/youtube/callback?code=...`
- [ ] Playlists load

### 11. Music Playback
**Test**: Play track through API
- [ ] Select a playlist
- [ ] Click play on a track
- [ ] Network request: `POST https://trafficjamz.v2u.us/api/music/play`
- [ ] Playback starts
- [ ] Currently playing indicator shows (brighter color)
- [ ] Progress syncs: `PUT https://trafficjamz.v2u.us/api/music/position`

### 12. Music State Sync
**Test**: Real-time state updates via WebSocket
- [ ] Open group music player
- [ ] WebSocket connects: `wss://trafficjamz.v2u.us/socket.io`
- [ ] Console shows: Socket.IO connection established
- [ ] Play/pause on web browser
- [ ] Mobile app updates in real-time
- [ ] Position syncs every 5 seconds

---

## Location Tracking Tests

### 13. Location Permission
**Test**: Request device location access
- [ ] Navigate to Location tab
- [ ] Android permission prompt appears
- [ ] Grant "While using the app" permission
- [ ] Location tracking starts

### 14. Location Upload
**Test**: GPS coordinates sent to backend
- [ ] Location tracking enabled
- [ ] Network request: `POST https://trafficjamz.v2u.us/api/location/update`
- [ ] Payload includes: `latitude`, `longitude`, `accuracy`, `timestamp`
- [ ] Updates every 10 seconds
- [ ] Map updates with user marker

### 15. Live Location Sharing
**Test**: See other users' locations in real-time
- [ ] Open location map
- [ ] WebSocket receives: `location:update` events
- [ ] Other group members' markers display
- [ ] Markers update as users move
- [ ] Distance/proximity calculated

---

## Voice Communication Tests

### 16. Voice Session Start
**Test**: WebRTC voice connection
- [ ] Click "Voice" button in group
- [ ] Microphone permission prompt
- [ ] Grant permission
- [ ] Network request: `POST https://trafficjamz.v2u.us/api/voice/join/:groupId`
- [ ] WebRTC connection established
- [ ] Status shows "ACTIVE" with green indicator

### 17. Voice Quality
**Test**: Audio streaming works
- [ ] Speak into device
- [ ] Audio transmitted to other users
- [ ] Low latency (< 300ms)
- [ ] No echo or feedback
- [ ] Can hear other participants

---

## Network Resilience Tests

### 18. Offline Mode
**Test**: App handles network disconnection gracefully
- [ ] Enable Airplane Mode on emulator
- [ ] App shows connection error
- [ ] Disable Airplane Mode
- [ ] App reconnects automatically
- [ ] No crash or data loss

### 19. Slow Network
**Test**: App handles high latency
- [ ] Use Chrome DevTools Network throttling: "Slow 3G"
- [ ] App shows loading indicators
- [ ] Requests don't timeout prematurely
- [ ] UI remains responsive

### 20. Token Refresh
**Test**: JWT token refresh when expired
- [ ] Manually expire token (modify localStorage)
- [ ] Make API request
- [ ] Backend returns 401
- [ ] Frontend attempts refresh: `POST /auth/refresh`
- [ ] New token obtained
- [ ] Original request retried successfully

---

## Error Handling Tests

### 21. 500 Backend Error
**Test**: App handles server errors gracefully
- [ ] Temporarily break backend endpoint
- [ ] App shows user-friendly error message
- [ ] Console logs detailed error
- [ ] "Retry" button available
- [ ] No white screen of death

### 22. Invalid API Response
**Test**: Handle malformed responses
- [ ] Backend returns unexpected format
- [ ] App catches error
- [ ] Displays fallback UI
- [ ] Logs error to console

---

## Performance Tests

### 23. Initial Load Time
**Test**: App loads quickly on cold start
- [ ] Force stop app
- [ ] Launch app
- [ ] Time from splash screen to Dashboard
- [ ] Target: < 5 seconds
- [ ] Backend wakeup message if needed (< 30 seconds)

### 24. Memory Usage
**Test**: No memory leaks during normal use
- [ ] Navigate through all screens
- [ ] Play music for 5 minutes
- [ ] Check Android Studio Profiler
- [ ] Memory usage stable (not continuously increasing)

### 25. API Response Times
**Test**: Backend responds promptly
- [ ] Check Network tab response times:
  - [ ] `/health`: < 500ms
  - [ ] `/auth/login`: < 2s
  - [ ] `/groups`: < 1s
  - [ ] `/music/playlists`: < 3s
  - [ ] `/location/update`: < 500ms

---

## Cross-Device Sync Tests

### 26. Multi-Device Music Sync
**Test**: Music state syncs across devices
- [ ] Open app on emulator
- [ ] Open web app on browser
- [ ] Play track on emulator
- [ ] Verify playing on web within 2 seconds
- [ ] Pause on web
- [ ] Verify paused on emulator

### 27. Location Sync
**Test**: Location updates visible across devices
- [ ] Start location tracking on emulator
- [ ] Open web app
- [ ] Emulator location appears on web map
- [ ] Move emulator location
- [ ] Web map updates within 10 seconds

---

## Final Sign-Off Checklist

### Critical Functionality
- [ ] App loads successfully (no white screen)
- [ ] Backend connection established (`https://trafficjamz.v2u.us/api`)
- [ ] Login works
- [ ] Profile loads with avatar
- [ ] Dashboard shows groups
- [ ] Music player connects (Spotify OR YouTube)
- [ ] Music playback works
- [ ] Location tracking works
- [ ] Voice session starts

### UI/UX Requirements
- [ ] Vibrant gradient background visible
- [ ] Playlist header consolidated (not duplicated)
- [ ] Playing track has brighter indicator
- [ ] All text readable on gradient
- [ ] No layout issues on mobile screen
- [ ] Navigation smooth (no lag)

### Security & Privacy
- [ ] JWT tokens secured in localStorage
- [ ] API requests use HTTPS
- [ ] R2 signed URLs expire (7 days)
- [ ] Location permissions requested properly
- [ ] Microphone permissions requested properly

### Production Readiness
- [ ] No console errors (warnings acceptable)
- [ ] No hardcoded localhost URLs
- [ ] Capacitor detection working
- [ ] WebSocket connections stable
- [ ] App doesn't crash during normal use

---

## Sign-Off

**Test Date**: _______________  
**Tested By**: _______________  
**Platform**: Android Emulator (Medium Phone API 36.1)  
**Build Version**: _______________  
**Backend**: https://trafficjamz.v2u.us  

**Results Summary**:
- Tests Passed: ____ / 27
- Tests Failed: ____ / 27
- Critical Issues Found: _______________

**Approved for Production**: [ ] YES  [ ] NO

**Notes**:
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
