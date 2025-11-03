const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Initialize Supabase client for storage
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

// Check if Supabase Storage is configured
const isSupabaseConfigured = () => {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
};

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

// Create multer upload instance for audio files
const audioUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for audio
  },
  fileFilter: audioFileFilter
});

// Upload file to Supabase Storage
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
  getFileUrl,
  deleteFile,
  isSupabaseConfigured
};