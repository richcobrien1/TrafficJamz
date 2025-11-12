# Cloudflare R2 Setup for TrafficJamz

## Why R2?
Cloudflare R2 is used for storing MP3 music files because:
- ✅ **No egress fees** - Free data transfer out
- ✅ **Fast global CDN** - Built-in edge caching
- ✅ **S3 compatible** - Works with existing AWS SDK
- ✅ **Affordable** - $0.015/GB storage

## Setup Steps

### 1. Create Cloudflare Account
1. Go to https://dash.cloudflare.com/
2. Sign up or log in
3. Navigate to **R2** from the sidebar

### 2. Create R2 Bucket

1. Click **"Create bucket"**
2. Bucket name: `music` (or whatever you want)
3. Location: **Automatic** (closest to users)
4. Click **Create bucket**

### 3. Enable Public Access

⚠️ **CRITICAL**: R2 buckets are private by default. You MUST enable public access.

1. Open your `music` bucket
2. Go to **Settings** tab
3. Scroll to **Public Access**
4. Click **"Allow Access"**
5. Copy the **Public bucket URL** - it will look like:
   ```
   https://d54e57481e824e8752d0f6caa9b37ba7.r2.dev
   ```

### 4. Configure CORS

1. In bucket settings, scroll to **CORS Policy**
2. Click **"Edit CORS policy"**
3. Add this configuration:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Type", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

4. Click **Save**

### 5. Create API Token

1. Go back to R2 main page
2. Click **"Manage R2 API Tokens"**
3. Click **"Create API token"**
4. Token name: `trafficjamz-music-upload`
5. Permissions: 
   - ✅ **Object Read & Write**
6. TTL: **Forever** (or your preference)
7. Apply to specific buckets: Select `music` bucket
8. Click **Create API Token**

### 6. Save Credentials

You'll see three values:

```
Access Key ID: abc123def456...
Secret Access Key: xyz789uvw012...
Endpoint for S3 Clients: https://1234567890abcdef.r2.cloudflarestorage.com
```

⚠️ **Save these immediately** - you can't see the secret again!

### 7. Update Environment Variables

Add to your `.env.prod` file on the server:

```bash
# ────── Cloudflare R2 ────────────────────────────
R2_ACCESS_KEY="abc123def456..."
R2_SECRET_KEY="xyz789uvw012..."
R2_ENDPOINT="https://1234567890abcdef.r2.cloudflarestorage.com"
R2_BUCKET_MUSIC="music"
R2_PUBLIC_URL="https://d54e57481e824e8752d0f6caa9b37ba7.r2.dev"
R2_REGION="auto"
```

### 8. Restart Backend

```bash
# SSH to your server
ssh root@your-server-ip

# Restart the container
docker restart jamz-server
# OR rebuild if needed
docker-compose up -d --build jamz-server
```

## Testing

### Test Upload

1. Open TrafficJamz app
2. Go to any group's audio session
3. Click Music Player
4. Upload an MP3 file
5. Check backend logs:
   ```bash
   docker logs -f jamz-server | grep -i r2
   ```

You should see:
```
Uploading to R2: { filePath: 'session-music/...', ... }
R2 upload result: { ... }
Upload successful: { filePath: '...', publicUrl: 'https://...r2.dev/...' }
```

### Test Playback

1. Click the uploaded track in playlist
2. It should play immediately
3. Check browser console - no 500 errors

## Troubleshooting

### Error: "R2 storage is not configured"
- Missing environment variables
- Check `.env.prod` has all R2_* variables
- Restart backend after adding variables

### Error: 500 Internal Server Error when playing
- **Most common**: Bucket is not public
- Go to bucket settings → Public Access → Allow Access
- Wait 1-2 minutes for changes to propagate

### Error: 403 Forbidden
- CORS not configured
- Add CORS policy (see step 4)
- Clear browser cache

### Error: "Access Denied"
- API token doesn't have write permissions
- Recreate token with "Object Read & Write" permission
- Apply to specific bucket

### Files upload but URL is wrong
- Check `R2_PUBLIC_URL` matches your bucket's public URL
- Should be `https://HASH.r2.dev` NOT `.r2.cloudflarestorage.com`
- The `.cloudflarestorage.com` endpoint is for S3 API, not public access

## Custom Domain (Recommended for Production)

For production, use a custom domain like `public.v2u.us`:

1. Go to R2 bucket settings
2. Click **"Connect Domain"**
3. Enter your domain: `public.v2u.us` (or `music.trafficjamz.com`)
4. Add DNS records as shown (CNAME pointing to your bucket)
5. Wait for SSL provisioning (~5 minutes)
6. Update environment variable:
   ```bash
   R2_PUBLIC_URL="https://public.v2u.us"
   ```

Benefits:
- ✅ Professional URLs (no `.r2.dev` in URL)
- ✅ Faster CDN routing
- ✅ Better security
- ✅ Custom branding
- ✅ Same global performance as R2.dev

**Production setup**: Use custom domain  
**Development setup**: Use R2.dev subdomain

## Cost Estimate

For 100 active users uploading 10 songs each (30MB average):
- Storage: 30GB × $0.015 = **$0.45/month**
- Operations: ~1M reads = **$0.36/month**
- Egress: **$0.00** (free!)

**Total: ~$1/month** for music storage! 🎉

## Security Best Practices

1. ✅ Use separate buckets for different file types
2. ✅ Enable public access ONLY for music bucket
3. ✅ Use API tokens with minimal permissions
4. ✅ Set token expiration for production
5. ✅ Rotate tokens every 90 days
6. ✅ Monitor usage in Cloudflare dashboard

## Support

If you need help:
1. Check Cloudflare R2 docs: https://developers.cloudflare.com/r2/
2. Community forum: https://community.cloudflare.com/c/developers/r2/
3. Check backend logs: `docker logs jamz-server`
