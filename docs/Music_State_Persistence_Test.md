# Music State Persistence Test Plan

## What We Fixed
- **Stale Closures**: Changed all callbacks to use `userRef.current` instead of capturing `user` in closures
- **Stable References**: Callbacks never recreate, so socket listeners remain valid
- **Database Persistence**: Backend saves controller_id and playlist to database
- **Comprehensive State Event**: Backend sends complete state on join-music-session

## What to Test

### Test 1: Basic State Persistence (Single Device)
1. Open browser, navigate to audio session
2. **Take Control** (become DJ)
3. **Upload 2-3 music files** (they auto-add to playlist)
4. **Play a track** (note the current position)
5. **Refresh the page** (F5 or Cmd+R)
6. **Check the browser console** for these log messages:
   ```
   🎵 JOINING MUSIC SESSION
   🎵 MUSIC SESSION STATE RECEIVED FROM SERVER
   ```
7. **Verify:**
   - ✅ Playlist shows all tracks
   - ✅ You are still the DJ (controller)
   - ✅ Current track is restored
   - ✅ Console shows: "I AM THE DJ (controller)"

### Test 2: Remote Device State Sync (Two Devices)
1. **Device A** (your computer):
   - Navigate to audio session
   - Take Control (become DJ)
   - Upload 2-3 music files
   - Play a track

2. **Device B** (phone or another browser):
   - Navigate to same audio session
   - **Check console logs** (use remote debugging for mobile)
   - **Verify:**
     - ✅ Playlist appears with all tracks
     - ✅ Shows "Someone else is DJ (listener mode)"
     - ✅ Current track is playing
     - ✅ You CANNOT take control (DJ already exists)

3. **Refresh Device B**
   - **Check console logs** for state restoration
   - **Verify:**
     - ✅ Playlist still appears
     - ✅ Still in listener mode
     - ✅ Current track still playing

### Test 3: Controller Release and Takeover
1. **Device A** (DJ):
   - Release Control
   
2. **Device B**:
   - **Refresh the page**
   - **Verify:**
     - ✅ Playlist persists
     - ✅ No one is DJ
     - ✅ Can now take control

3. **Device B**:
   - Take Control (become DJ)
   
4. **Device A**:
   - **Refresh the page**
   - **Verify:**
     - ✅ Playlist persists
     - ✅ Device B is shown as DJ
     - ✅ In listener mode

## Key Console Logs to Look For

### ✅ Success Pattern:
```
🎵 ========================================
🎵 JOINING MUSIC SESSION
🎵 ========================================
🎵 Audio Session ID: 67482e1b3f87d76c8f23456a
🎵 Group ID: group123
🎵 My User ID: user456
🎵 Socket connected: true
🎵 ✅ join-music-session emitted
🎵 ⏳ Waiting for music-session-state from server...
🎵 ========================================

🎵 ========================================
🎵 MUSIC SESSION STATE RECEIVED FROM SERVER
🎵 ========================================
🎵 Playlist length: 3
🎵 Has current track: true
🎵 Controller ID: user456
🎵 Is playing: true
📝 ✅ Restoring playlist with 3 tracks
👑 ✅ I AM THE DJ (controller)
🎵 ✅ Restoring currently playing track: My Song.mp3
🎵 ========================================
🎵 MUSIC SESSION STATE PROCESSING COMPLETE
🎵 ========================================
```

### ❌ Failure Patterns:

#### If state event NOT received:
```
🎵 ✅ join-music-session emitted
🎵 ⏳ Waiting for music-session-state from server...
(NO music-session-state event follows)
```
**Possible causes:**
- Backend not sending event
- Socket connection failed
- Event listener not registered

#### If user ID is null/undefined:
```
🎵 My User ID: undefined
👑 Controller status: {
  myUserId: undefined,
  controllerId: "user456",
  amController: false  ← WRONG! Should be true
}
```
**Possible causes:**
- User not loaded yet
- Auth context issue
- userRef not synced

#### If playlist empty:
```
📝 ❌ No playlist in session state
```
**Possible causes:**
- Database not saving playlist
- Backend not including playlist in event
- Session fetch returned different session

## Debugging Steps

If state doesn't persist:

1. **Check Backend Logs**:
   - Look for `join-music-session` received
   - Look for "Sending music state to [socketId]"
   - Verify playlist length and controller_id

2. **Check Database** (MongoDB):
   ```javascript
   db.audio_sessions.find({ group_id: "your-group-id" }).pretty()
   ```
   - Verify `music.controller_id` exists
   - Verify `music.playlist` has tracks

3. **Check Frontend Console**:
   - Verify both join and state-received logs appear
   - Check if user ID is defined
   - Check if controller ID matches user ID

4. **Check Network Tab**:
   - Filter for "socket.io"
   - Look for message types: "join-music-session", "music-session-state"
   - Verify payload data

## Expected Behavior Summary

| Scenario | Playlist | Controller Status | Current Track |
|----------|----------|------------------|---------------|
| Initial page load | Empty | No controller | None |
| After uploading files | Shows tracks | No controller | None |
| After taking control | Shows tracks | I AM DJ | None or playing |
| After refresh (as DJ) | ✅ Shows tracks | ✅ I AM DJ | ✅ Restored |
| After refresh (as listener) | ✅ Shows tracks | ✅ Listener mode | ✅ Playing |
| After release control + refresh | ✅ Shows tracks | ✅ No controller | ✅ Restored |

---

## What to Report Back

If state still doesn't persist, please provide:
1. **Console logs** from both join and state-received (copy the full sections)
2. **Backend logs** from terminal (look for join-music-session and state sending)
3. **Which test case failed** (Test 1, 2, or 3)
4. **What was expected vs what happened**

With this information, we can pinpoint exactly where the issue is!
