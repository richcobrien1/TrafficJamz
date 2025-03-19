const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  user_id: {
    type: String, // UUID from PostgreSQL User table
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['group_invite', 'proximity_alert', 'subscription', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  data: {
    group_id: Schema.Types.ObjectId,
    sender_id: String, // UUID from PostgreSQL User table
    action_url: String,
    additional_data: Schema.Types.Mixed
  },
  read: {
    type: Boolean,
    default: false
  },
  expires_at: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
NotificationSchema.index({ user_id: 1, read: 1 });
NotificationSchema.index({ user_id: 1, type: 1 });
NotificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

// Static methods
NotificationSchema.statics.findUnreadByUserId = function(userId) {
  return this.find({ 
    user_id: userId,
    read: false
  }).sort({ createdAt: -1 });
};

NotificationSchema.statics.findByUserIdAndType = function(userId, type) {
  return this.find({ 
    user_id: userId,
    type
  }).sort({ createdAt: -1 });
};

NotificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { user_id: userId, read: false },
    { $set: { read: true } }
  );
};

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
