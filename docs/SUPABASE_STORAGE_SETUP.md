# Supabase Storage Setup for Profile Images

## Error: "signature verification failed"

This error occurs when the Supabase Storage bucket doesn't have proper permissions. Follow these steps:

## Setup Instructions

### 1. Navigate to Supabase Storage
- Go to: https://supabase.com/dashboard/project/nrlaqkpojtvvheosnpaz/storage/buckets
- Click on the `profile-images` bucket

### 2. Configure Bucket as Public
- Click on `profile-images` bucket
- Go to "Configuration" tab
- Make sure "Public bucket" is **checked**

### 3. Disable RLS (Recommended for Public Buckets)
Since this is a public bucket, RLS can cause signature verification issues:

1. Click on "Policies" tab in the bucket
2. Click "Disable RLS" button at the top
3. Confirm the action

**Alternative: If you want to keep RLS enabled**, add these policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'profile-images');

-- Allow public reads
CREATE POLICY "Allow public reads" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'profile-images');

-- Allow users to update their own files
CREATE POLICY "Allow users to update own files" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'profile-images');

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete own files" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'profile-images');
```

### 4. Verify Service Role Key
Make sure your `.env` file on Render has:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
(The full key, not the anon key)

### 5. Test Upload
After configuring:
1. Restart your Render service (or wait for auto-deploy)
2. Try uploading a profile image again
3. Check Render logs for detailed error messages

## Verification Checklist
- [ ] Bucket named `profile-images` exists
- [ ] Bucket is marked as "Public"
- [ ] RLS is disabled OR proper policies are added
- [ ] SUPABASE_SERVICE_ROLE_KEY is set in Render environment
- [ ] Backend service restarted after changes

## Testing
After setup, test the upload:
```bash
curl -X POST https://trafficjamz.onrender.com/api/users/upload-profile-image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "profileImage=@/path/to/test-image.jpg"
```

Expected response:
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "imageUrl": "https://nrlaqkpojtvvheosnpaz.supabase.co/storage/v1/object/public/profile-images/profiles/profile-123-1234567890.jpg",
  "storage_type": "supabase"
}
```
