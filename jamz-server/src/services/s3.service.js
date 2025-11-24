/**
 * S3/Supabase Storage Service
 * 
 * NOTE: Despite the name, this service handles:
 * - Supabase Storage: Profile images ONLY
 * - R2 Storage: Music files (MP3s) - handled in r2.service.js
 * 
 * The multer middleware here just buffers files to memory.
 * Actual cloud uploads happen in route handlers:
 * - Profile images → Supabase (uploadToSupabase function below)
 * - Music files → Cloudflare R2 (uploadToR2 in r2.service.js)
 */

const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Check if Supabase Storage is configured
const isSupabaseConfigured = () => {
  const hasUrl = process.env.SUPABASE_URL && process.env.SUPABASE_URL.startsWith('http');
  const hasKey = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.length > 20;
  return !!(hasUrl && hasKey);
};

// Initialize Supabase client for storage (only if properly configured)
const supabase = isSupabaseConfigured()
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

// Use memory storage - files will be uploaded to Supabase from memory
const memoryStorage = multer.memoryStorage();

// File filter for images
const imageFileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// File filter for audio files
const audioFileFilter = (req, file, cb) => {
  // Check if file is audio
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'), false);
  }
};

// Create multer upload instance for images
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: imageFileFilter
});

// Create multer upload instance for audio files (MP3s)
// NOTE: This only handles the file upload to memory - actual storage is in R2, not Supabase
// The uploaded file buffer is then sent to Cloudflare R2 in audio.routes.js
const audioUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for audio
  },
  fileFilter: audioFileFilter
});

// Check if R2 is configured
const isR2Configured = () => {
  const hasAccessKey = !!process.env.R2_ACCESS_KEY_ID;
  const hasSecretKey = !!process.env.R2_SECRET_ACCESS_KEY;
  const hasEndpointOrAccount = !!(process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID);
  return hasAccessKey && hasSecretKey && hasEndpointOrAccount;
};

// Initialize R2 client using AWS SDK v2 (for profile images)
const AWS = require('aws-sdk');
const s3 = isR2Configured()
  ? new AWS.S3({
      endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      signatureVersion: 'v4',
      s3ForcePathStyle: true
    })
  : null;

// Upload profile image to R2 Storage
const uploadProfileToR2 = async (file, userId) => {
  if (!isR2Configured()) {
    throw new Error('R2 storage is not configured');
  }

  try {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `profile-${userId}-${uniqueSuffix}${extension}`;
    const filePath = `profiles/${filename}`;

    console.log('Uploading profile to R2:', { filePath, size: file.buffer.length, type: file.mimetype });

    // Upload to R2
    const params = {
      Bucket: process.env.R2_BUCKET_PUBLIC || process.env.R2_BUCKET_MUSIC || 'music',
      Key: filePath,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000',
      Metadata: {
        'uploaded-by': userId,
        'original-name': file.originalname
      }
    };

    const uploadResult = await s3.upload(params).promise();
    console.log('R2 upload result:', uploadResult);

    // Use public R2 URL instead of signed URL (no expiration)
    // R2_PUBLIC_URL should be configured as https://public.v2u.us
    const publicUrl = process.env.R2_PUBLIC_URL 
      ? `${process.env.R2_PUBLIC_URL}/${filePath}`
      : uploadResult.Location; // Fallback to direct R2 URL if no public URL configured
    
    console.log('Profile upload successful:', { filePath, publicUrl });
    return publicUrl;
  } catch (error) {
    console.error('R2 upload exception:', error);
    throw error;
  }
};

// Upload file to Supabase Storage (fallback)
const uploadToSupabase = async (file, userId) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase storage is not configured');
  }

  try {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `profile-${userId}-${uniqueSuffix}${extension}`;
    const filePath = `profiles/${filename}`;

    console.log('Uploading to Supabase:', { filePath, size: file.buffer.length, type: file.mimetype });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Supabase upload error details:', error);
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    console.log('Upload successful:', data);
    return filePath;
  } catch (error) {
    console.error('Upload exception:', error);
    throw error;
  }
};

// Get public URL for uploaded file
const getFileUrl = (filePath) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase storage is not configured');
  }

  const { data } = supabase.storage
    .from('profile-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// Delete file from Supabase Storage
const deleteFile = async (filePath) => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file from Supabase:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error deleting file from Supabase:', error);
    return false;
  }
};

module.exports = {
  upload,
  audioUpload,
  uploadToSupabase,
  uploadProfileToR2,
  getFileUrl,
  deleteFile,
  isSupabaseConfigured,
  isR2Configured
};