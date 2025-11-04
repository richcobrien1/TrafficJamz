# Audio Testing Guide - Two Device P2P Audio

## Goal
Test real-time audio communication between **Device A** and **Device B** using WebRTC peer-to-peer connection.

## Prerequisites
✅ Backend deployed on Render: `https://trafficjamz.onrender.com`
✅ Both devices can access the web app
✅ Both devices have working microphones
✅ Chrome/Safari with microphone permissions

---

## Testing Steps

### Step 1: Setup Device A (First Device)

1. **Open the app** on Device A
   - Navigate to: `https://trafficjamz.onrender.com` (or your deployed URL)
   - Login to your account

2. **Create or join a group/session**
   - Note the **Session ID** (you'll need this for Device B)
   - Example: If URL is `/sessions/audio/abc123`, the session ID is `abc123`

3. **Initialize Microphone**
   - Click "Grant Microphone Access" button
   - Allow microphone permission in browser
   - Wait for green checkmark: "✅ Microphone initialized successfully"
   - Verify the audio level meter moves when you talk

4. **Connect Signaling**
   - Click "Connect Signaling" button
   - Watch console for:
     ```
     ✅ Socket.IO connection established successfully
     ✅ Socket ID: xyz123
     📡 Joined audio session room: abc123
     🚀 Sent webrtc-ready signal
     ```

5. **Keep Device A running** and move to Device B

---

### Step 2: Setup Device B (Second Device)

1. **Open the app** on Device B
   - Navigate to the **SAME SESSION** as Device A
   - Example: `/sessions/audio/abc123` (use the same session ID)
   - Login (can be same or different account)

2. **Initialize Microphone**
   - Click "Grant Microphone Access" button
   - Allow microphone permission
   - Verify audio level meter works

3. **Connect Signaling**
   - Click "Connect Signaling" button
   - Watch console for:
     ```
     ✅ Socket.IO connection established
     📡 Joined audio session room: abc123
     📨 Received webrtc-ready from another participant
     ```

---

### Step 3: Watch for WebRTC Connection

**On BOTH devices**, watch the browser console for:

#### Device A (First to Connect) - Will RECEIVE offer request:
```
📨 Received webrtc-ready from another participant
🔍 Connection state: new
🚀 Creating and sending offer...
📤 Creating offer...
📤 Peer connection state: { connectionState: 'new', senders: 1 }
📤 Created offer: offer
📤 Sending offer via signaling...
📤 Offer sent successfully
```

#### Device B (Second to Connect) - Will RECEIVE offer:
```
📨 Received webrtc-offer
📥 Handling offer...
📥 Creating answer...
📥 Setting local description...
📥 Sending answer...
📥 Answer sent
```

#### Device A - Will RECEIVE answer:
```
📨 Received webrtc-answer
📥 Handling answer...
📥 Remote description set
```

#### BOTH Devices - ICE Candidates:
```
🧊 Sending ICE candidate
📨 Received webrtc-candidate
📥 Adding ICE candidate...
📥 ICE candidate added
```

#### BOTH Devices - Connection Established:
```
🔗 Connection state changed: connecting
🔗 Connection state changed: connected
🧊 ICE connection state: connected
```

#### Device B - Receiving Audio:
```
🎵 ========== REMOTE TRACK RECEIVED ==========
🎵 Track kind: audio
🎵 Track enabled: true
🎵 Track readyState: live
🎵 Setting up remote audio stream
🎵 Created audio element with volume: 1
🎵 Audio element can play
🎵 Audio element started playing
```

---

## Step 4: Test Audio Flow

### Test 1: Device A → Device B
1. **On Device A**: Speak into microphone
2. **On Device A**: Verify audio level meter moves
3. **On Device B**: Listen - you should hear Device A's voice!

### Test 2: Device B → Device A
1. **On Device B**: Speak into microphone
2. **On Device B**: Verify audio level meter moves
3. **On Device A**: Listen - you should hear Device B's voice!

### Test 3: Simultaneous (Full Duplex)
1. Both devices speak at the same time
2. Both should hear each other
3. Verify no echo (if using speakers, use headphones to prevent feedback)

---

## Debugging Console Logs

### Key Logs to Watch For:

**✅ SUCCESS Indicators:**
- `✅ Socket.IO connection established`
- `📤 Offer sent successfully`
- `📥 Remote description set`
- `🔗 Connection state changed: connected`
- `🎵 ========== REMOTE TRACK RECEIVED ==========`
- `🎵 Audio element started playing`

**❌ ERROR Indicators:**
- `❌ Socket.IO connection failed`
- `❌ Error creating/sending offer`
- `❌ Error handling offer/answer`
- `🔗 Connection state changed: failed`
- `🧊 ICE connection state: failed`

**⚠️ WARNING Indicators:**
- `⚠️ No local stream available yet`
- `⏸️ Waiting for local stream before creating offer`
- `🔌 Socket.IO connection closed`

---

## Troubleshooting

### Issue: No WebRTC offer/answer exchange

**Check:**
- Both devices are in the **same session** (same sessionId in URL)
- Both devices clicked "Connect Signaling"
- Both devices initialized microphone
- Console shows `webrtc-ready` events on both

**Fix:**
- Refresh both devices
- Start with Device A first, wait for it to fully connect
- Then start Device B

---

### Issue: Connection state stuck on "connecting"

**Check:**
- ICE candidates are being exchanged (see console)
- Firewall/NAT not blocking WebRTC
- Both devices on same network OR use STUN/TURN servers

**Fix:**
- Check browser console for ICE candidate errors
- Verify STUN server is working (currently using Google's public STUN)
- May need TURN server for strict NAT environments

---

### Issue: No audio received despite "connected" state

**Check:**
- Remote track event fired: `🎵 ========== REMOTE TRACK RECEIVED ==========`
- Audio element created: `🎵 Created audio element`
- Audio playing: `🎵 Audio element started playing`
- Speaker volume not muted
- Remote audio volume slider not at 0

**Fix:**
1. Check browser console for audio autoplay errors
2. Interact with page (click anywhere) to allow autoplay
3. Increase "Voice Volume" slider
4. Check device speaker settings
5. Test with headphones to isolate speaker issues

---

### Issue: Microphone not working

**Check:**
- Browser permission granted
- Correct input device selected
- Audio level meter showing movement
- Track enabled: `track.enabled: true`

**Fix:**
1. Go to browser settings → Microphone → Allow for your site
2. Click microphone icon to unmute if muted
3. Try "Test Mic Status" button to verify track state

---

## Advanced Debugging

### Enable Verbose Logging
Open browser console (F12) and filter logs:
- Filter: `webrtc` - See WebRTC connection flow
- Filter: `🎵` - See audio track events
- Filter: `📨` - See signaling messages
- Filter: `🔗` - See connection state changes

### Check Peer Connection State
In console, run:
```javascript
// Shows current peer connection details
console.log('Connection:', rtcConnectionRef.current?.connectionState)
console.log('ICE:', rtcConnectionRef.current?.iceConnectionState)
console.log('Signaling:', rtcConnectionRef.current?.signalingState)
console.log('Senders:', rtcConnectionRef.current?.getSenders().length)
console.log('Receivers:', rtcConnectionRef.current?.getReceivers().length)
```

---

## Expected Timeline

**Total time from start to audio flowing: ~5-15 seconds**

1. **0-2s**: Microphone initialization
2. **2-3s**: Socket.IO connection
3. **3-5s**: WebRTC ready signals exchanged
4. **5-10s**: Offer/Answer/ICE candidates exchange
5. **10-15s**: Connection established, audio flowing

---

## Success Criteria ✅

- [x] Both devices show "Connected" state
- [x] Both devices see green connection indicator
- [x] Device A hears Device B clearly
- [x] Device B hears Device A clearly
- [x] Minimal latency (< 500ms)
- [x] No audio dropouts
- [x] No echo (with headphones)

---

## Notes

- **Use headphones** to prevent echo/feedback
- **Good internet connection** required (WiFi or 4G+)
- **Same session ID** is critical
- **Sequential connection** works better (A first, then B)
- **Console logs** are your best friend for debugging

Good luck! 🎵🚀
