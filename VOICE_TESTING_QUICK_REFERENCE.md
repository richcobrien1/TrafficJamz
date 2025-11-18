# 🎙️ Voice Testing Quick Reference Card

## 🚀 Quick Start (2 Minutes)

### Setup
1. **PC**: Open https://jamz.v2u.us in Chrome/Edge
2. **iPhone**: Open https://jamz.v2u.us in Safari
3. Both: Login → Select same group → Enter "Voice" (Audio Session)
4. **IMPORTANT**: Wear headphones on at least ONE device (prevents echo)

---

## 📊 What You Should See

### ✅ GOOD (Everything Working)

**Top Banner** (both devices):
```
🟢 CONNECTED | 🎤 Silent → SPEAKING (when talking) | 🎧 Audio RX: 0-2s ago | 👥 2 participants
```

**When PC Speaks:**
- PC banner: `🎤 SPEAKING` (yellow, pulsing)
- PC participant list: Your name shows `SPEAKING` chip (yellow, flashing)
- iPhone banner: `🎧 Audio RX: 0s ago` (updates immediately)
- iPhone hears voice clearly

**When iPhone Speaks:**
- iPhone banner: `🎤 SPEAKING` (yellow, pulsing)
- iPhone participant list: Your name shows `SPEAKING` chip
- PC banner: `🎧 Audio RX: 0s ago` (updates immediately)
- PC hears voice clearly

---

### ❌ BAD (Something Wrong)

**Red Banner**: `🔴 DISCONNECTED`
- **Fix**: Reload page, check internet connection

**No Speaking Indicator When Talking**:
- **Fix**: Check mic not muted (no ❌ on mic icon), speak louder

**Audio RX Never Updates**:
- **Fix**: Check speaker not muted (no ❌ on headset icon), increase volume

**Echo/Feedback Heard**:
- **Fix**: WEAR HEADPHONES on both devices!

---

## 🎯 5-Step Quick Test

### Test 1: Connection (10 seconds)
- [ ] Both devices show GREEN banner
- [ ] Participant count shows "2 participants"

### Test 2: PC → iPhone (30 seconds)
- [ ] PC speaks: "Testing one two three"
- [ ] PC sees: Yellow `SPEAKING` indicator
- [ ] iPhone sees: `Audio RX: 0s ago` updates
- [ ] iPhone hears: Clear voice

### Test 3: iPhone → PC (30 seconds)
- [ ] iPhone speaks: "iPhone test, can you hear me?"
- [ ] iPhone sees: Yellow `SPEAKING` indicator
- [ ] PC sees: `Audio RX: 0s ago` updates
- [ ] PC hears: Clear voice

### Test 4: Conversation (1 minute)
- [ ] Hold natural conversation
- [ ] Both speaking indicators work
- [ ] Audio clear both directions
- [ ] No lag or echo

### Test 5: Quality Check (30 seconds)
- [ ] Connection stays green
- [ ] Audio RX updates every 1-2 seconds
- [ ] No robotic/choppy sound
- [ ] Natural conversation possible

---

## 📱 Device-Specific Tips

### PC
- Use Chrome or Edge (best WebRTC support)
- Allow microphone permission when prompted
- Use USB headset for best quality
- Check volume mixer if no audio heard

### iPhone
- Use Safari (native WebRTC)
- Settings → Safari → Microphone → Allow
- AirPods work great (auto-mic switching)
- Cellular data may have higher latency than WiFi

---

## 🐛 Instant Fixes

| Problem | Quick Fix |
|---------|-----------|
| Red banner | Reload page |
| No speaking indicator | Click mic icon to unmute |
| No audio heard | Click headset icon, increase volume |
| Echo/feedback | Put on headphones NOW! |
| Robotic voice | Move closer to WiFi router |
| Stuck "Silent" | Speak louder, check mic permissions |

---

## 🎯 Pass/Fail Criteria

### ✅ PASS = All True
- [x] Green banner on both devices
- [x] Speaking indicators activate < 1 second
- [x] Audio heard within 1 second of speaking
- [x] Voice clear and intelligible
- [x] No echo with headphones
- [x] Stays connected 5+ minutes

### ❌ FAIL = Any True
- [ ] Red banner persists
- [ ] Speaking indicator never shows
- [ ] Audio RX > 5 seconds delay
- [ ] Voice unintelligible
- [ ] Severe echo/feedback
- [ ] Disconnects repeatedly

---

## 📝 Report Template

**Date**: _________  
**Time**: _________  
**PC Browser**: Chrome / Edge  
**iPhone iOS**: _________  
**Network**: WiFi / Cellular

**Results**:
- Connection: PASS / FAIL
- PC → iPhone: PASS / FAIL (Latency: _____ ms)
- iPhone → PC: PASS / FAIL (Latency: _____ ms)
- Audio Quality: 1 2 3 4 5 (circle one)
- Echo/Feedback: YES / NO

**Issues**: _______________________________________________

**Notes**: _______________________________________________

---

## 🆘 Emergency Troubleshooting

### Cannot Connect at All
1. Close all browser tabs
2. Reboot phone
3. Restart browser
4. Clear browser cache
5. Try different WiFi network

### Audio Works But Echo
1. **IMMEDIATELY put on headphones**
2. Reduce speaker volume
3. Move devices apart (if testing same room)

### Voice Choppy/Robotic
1. Close other apps using bandwidth
2. Move closer to WiFi router
3. Switch from WiFi to cellular (or vice versa)
4. Check internet speed (need > 1 Mbps)

### Speaking Indicator Not Working
1. Check browser console (F12) for errors
2. Grant microphone permission in browser settings
3. Try different microphone (if using external)
4. Speak directly into mic (not from distance)

---

## 🔍 Advanced: Measure Latency

**Method**:
1. PC says "MARK" and starts stopwatch
2. iPhone says "RECEIVED" when heard
3. PC stops stopwatch when "RECEIVED" heard
4. Divide time by 2 = one-way latency

**Target**: < 500ms
**Good**: 500-1000ms
**Poor**: > 1000ms

---

## 💡 Pro Tips

1. **Test same WiFi first** (easiest setup)
2. **Use wired headphones** (Bluetooth adds latency)
3. **Close background apps** (frees bandwidth)
4. **Test at different times** (network congestion varies)
5. **Screenshot any errors** (helps debugging)
6. **Note exact time of issues** (correlate with logs)

---

## 📞 More Help?

- Full guide: `VOICE_TESTING_GUIDE.md` (detailed procedures)
- Implementation: `VOICE_VALIDATION_IMPLEMENTATION.md` (technical details)
- Project log: `PROJECT_LOG.md` (known issues)

---

**Happy Testing! 🎉**

*Print this card or keep it open while testing*
