const mongoose = require('mongoose');

/**
 * UserIntegration Model
 * Stores OAuth tokens and connection info for music platform integrations
 */
const userIntegrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    enum: ['spotify', 'youtube', 'apple_music'],
    required: true
  },
  // OAuth tokens (should be encrypted in production)
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: false // Not all platforms provide refresh tokens
  },
  expiresAt: {
    type: Date,
    required: true
  },
  // Scopes granted by user
  scope: {
    type: [String],
    default: []
  },
  // Platform-specific user info
  platformUserId: {
    type: String,
    required: false
  },
  platformUserName: {
    type: String,
    required: false
  },
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one integration per user per platform
userIntegrationSchema.index({ userId: 1, platform: 1 }, { unique: true });

// Update the updatedAt timestamp on save
userIntegrationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Check if token is expired
userIntegrationSchema.methods.isExpired = function() {
  return new Date() >= this.expiresAt;
};

// Check if token expires within the next N minutes
userIntegrationSchema.methods.expiresWithin = function(minutes = 5) {
  const expiryTime = new Date(this.expiresAt);
  const checkTime = new Date(Date.now() + minutes * 60 * 1000);
  return expiryTime <= checkTime;
};

module.exports = mongoose.model('UserIntegration', userIntegrationSchema);
