const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// Configure AWS S3 / Cloudflare R2 (S3-compatible)
const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'auto'
};

// Add endpoint for Cloudflare R2 or custom S3-compatible storage
const endpoint = process.env.R2_ENDPOINT || process.env.S3_ENDPOINT;
if (endpoint) {
  s3Config.endpoint = endpoint;
  s3Config.signatureVersion = 'v4';
}

const s3 = new AWS.S3(s3Config);

// Check if S3 is configured
const isS3Configured = () => {
  return !!(process.env.AWS_ACCESS_KEY_ID &&
           process.env.AWS_SECRET_ACCESS_KEY &&
           process.env.AWS_S3_BUCKET);
};

// S3 upload configuration - only initialize if S3 is configured
let s3Storage = null;
if (isS3Configured()) {
  s3Storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'public-read', // Makes files publicly accessible
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      // Generate unique filename with user ID and timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const filename = `profiles/profile-${req.user.user_id}-${uniqueSuffix}${extension}`;
      cb(null, filename);
    }
  });
}

// Local storage fallback (for development or when S3 is not configured)
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/profiles');
    // Create directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with user ID
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `profile-${req.user.user_id}-${uniqueSuffix}${extension}`);
  }
});

// Choose storage based on configuration
const storage = s3Storage || localStorage;

// File filter for images
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Generate file URL based on storage type
const getFileUrl = (filename) => {
  if (isS3Configured()) {
    // For Cloudflare R2 or custom S3-compatible storage with custom domain
    const publicUrl = process.env.R2_PUBLIC_URL || process.env.S3_PUBLIC_URL;
    if (publicUrl) {
      return `${publicUrl}/${filename}`;
    }
    // For standard AWS S3
    const region = process.env.AWS_REGION || 'us-east-1';
    const bucket = process.env.AWS_S3_BUCKET;
    return `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;
  } else {
    // Return local URL
    return `/uploads/profiles/${filename}`;
  }
};

// Delete file from storage
const deleteFile = async (filename) => {
  if (isS3Configured()) {
    try {
      await s3.deleteObject({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: filename
      }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      return false;
    }
  } else {
    // For local storage, we don't auto-delete old files
    // They can be cleaned up manually or with a cron job
    return true;
  }
};

module.exports = {
  upload,
  getFileUrl,
  deleteFile,
  isS3Configured
};