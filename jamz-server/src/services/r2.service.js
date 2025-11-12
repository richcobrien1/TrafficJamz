const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

// Initialize R2 client
const r2Client = process.env.R2_ACCESS_KEY && process.env.R2_SECRET_KEY
  ? new S3Client({
      region: process.env.R2_REGION || 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
      },
    })
  : null;

// Check if R2 is configured
const isR2Configured = () => {
  return !!(process.env.R2_ACCESS_KEY && process.env.R2_SECRET_KEY && process.env.R2_ENDPOINT);
};

/**
 * Upload file to Cloudflare R2
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} originalFilename - Original filename
 * @param {string} mimetype - File mimetype
 * @param {string} userId - User ID uploading the file
 * @returns {Promise<string>} - Public R2.dev URL of uploaded file
 */
const uploadToR2 = async (fileBuffer, originalFilename, mimetype, userId) => {
  if (!isR2Configured()) {
    throw new Error('R2 storage is not configured');
  }

  try {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(originalFilename);
    const filename = `${path.basename(originalFilename, extension)}-${uniqueSuffix}${extension}`;
    const filePath = `session-music/${filename}`;

    console.log('Uploading to R2:', { 
      filePath, 
      size: fileBuffer.length, 
      type: mimetype,
      bucket: process.env.R2_BUCKET_MUSIC || process.env.R2_BUCKET_PUBLIC 
    });

    // Upload to R2 with public-read ACL
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_MUSIC || process.env.R2_BUCKET_PUBLIC,
      Key: filePath,
      Body: fileBuffer,
      ContentType: mimetype,
      CacheControl: 'public, max-age=31536000',
      // Add metadata to help with CORS and public access
      Metadata: {
        'uploaded-by': userId,
        'original-name': originalFilename
      }
    });

    const uploadResult = await r2Client.send(command);
    console.log('R2 upload result:', uploadResult);

    // Use the Public Development URL (R2.dev subdomain) 
    // This is shown in your Cloudflare dashboard under Settings > Public Development URL
    const publicUrl = `https://pub-c4cf281613c744fabfa8830d27954687.r2.dev/${filePath}`;

    console.log('Upload successful:', { filePath, publicUrl });
    return publicUrl;
  } catch (error) {
    console.error('R2 upload exception:', error);
    throw error;
  }
};

/**
 * Delete file from R2
 * @param {string} fileUrl - Full URL or path of file to delete
 * @returns {Promise<boolean>} - Success status
 */
const deleteFromR2 = async (fileUrl) => {
  if (!isR2Configured()) {
    return false;
  }

  try {
    // Extract the file key from URL
    let fileKey;
    if (fileUrl.includes('session-music/')) {
      fileKey = fileUrl.split('session-music/')[1];
      fileKey = `session-music/${fileKey.split('?')[0]}`; // Remove query params
    } else {
      console.warn('Could not extract file key from URL:', fileUrl);
      return false;
    }

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_MUSIC || process.env.R2_BUCKET_PUBLIC,
      Key: fileKey,
    });

    await r2Client.send(command);
    console.log('Successfully deleted file from R2:', fileKey);
    return true;
  } catch (error) {
    console.error('Error deleting file from R2:', error);
    return false;
  }
};

module.exports = {
  uploadToR2,
  deleteFromR2,
  isR2Configured
};
