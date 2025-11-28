# Update Production Server - MongoDB Password

## Current Session: SSH to DigitalOcean Droplet
**IP**: 157.230.165.156  
**User**: root

---

## Step 1: Navigate to Application Directory
```bash
cd /root/trafficjamz
```

---

## Step 2: Update .env.local with New MongoDB Password

```bash
nano .env.local
```

**Find and update this line:**
```bash
MONGODB_URI=mongodb+srv://richcobrien:1MongoDB123$@trafficjam.xk2uszk.mongodb.net/?retryWrites=true&w=majority&ssl=true&appName=trafficjam
```

**Save and Exit**:
- Press `Ctrl + O` (write out)
- Press `Enter` (confirm)
- Press `Ctrl + X` (exit)

---

## Step 3: Restart Docker Container

```bash
docker restart trafficjamz
```

---

## Step 4: Verify Connection (Watch Logs)

```bash
docker logs -f trafficjamz
```

**Look for**:
- ✅ `MongoDB connected successfully`
- ✅ `Server running on port 5000`
- ❌ `MongoServerError: Authentication failed` (if this appears, password is wrong)

**Exit logs**: Press `Ctrl + C`

---

## Step 5: Test Application

```bash
curl -k https://localhost:5000/health
```

Should return: `{"status":"ok"}` or similar

---

## Troubleshooting

### If MongoDB connection fails:

1. **Check password special characters are escaped in connection string**:
   - `$` character is fine in connection string (MongoDB handles it)
   - Password: `1MongoDB123$`

2. **Verify MongoDB Atlas whitelist**:
   ```bash
   curl ifconfig.me
   ```
   Make sure `157.230.165.156` is whitelisted in MongoDB Atlas

3. **Check Docker environment variables**:
   ```bash
   docker exec trafficjamz env | grep MONGODB_URI
   ```

4. **Restart with fresh logs**:
   ```bash
   docker restart trafficjamz && docker logs -f trafficjamz
   ```

---

## Quick Command Summary

```bash
# All-in-one update
cd /root/trafficjamz && \
nano .env.local && \
docker restart trafficjamz && \
docker logs -f trafficjamz
```

---

## MongoDB Connection String Details

**Format**:
```
mongodb+srv://richcobrien:1MongoDB123$@trafficjam.xk2uszk.mongodb.net/?retryWrites=true&w=majority&ssl=true&appName=trafficjam
```

**Components**:
- **Username**: `richcobrien`
- **Password**: `1MongoDB123$`
- **Cluster**: `trafficjam.xk2uszk.mongodb.net`
- **Database**: (default - specified in app code)
- **SSL**: Enabled (`ssl=true`)

---

## After Successful Update

1. Test the app: https://trafficjamz.app
2. Verify groups load correctly
3. Check music playback works
4. Monitor logs for any auth errors: `docker logs trafficjamz --tail 100`

---

## Security Notes

✅ Password rotated from compromised `ZwzL6uJ42JxwAsAu` to `1MongoDB123$`  
✅ `.env.local` is NOT in Git repository (.gitignore prevents this)  
⚠️ Old password still exists in Git history - consider BFG cleanup later
