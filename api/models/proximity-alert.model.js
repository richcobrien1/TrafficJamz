const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProximityAlertSchema = new Schema({
  group_id: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  user_id: {
    type: String, // UUID from PostgreSQL User table
    required: true
  },
  target_user_id: {
    type: String, // UUID from PostgreSQL User table
    required: true
  },
  distance_threshold: {
    type: Number,
    required: true,
    default: 100 // meters
  },
  current_distance: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'triggered', 'dismissed'],
    default: 'active'
  },
  triggered_at: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for faster queries
ProximityAlertSchema.index({ group_id: 1, user_id: 1, target_user_id: 1 });
ProximityAlertSchema.index({ status: 1 });

// Static methods
ProximityAlertSchema.statics.findActiveByGroupId = function(groupId) {
  return this.find({ 
    group_id: groupId,
    status: 'active'
  });
};

ProximityAlertSchema.statics.findByUserId = function(user_id) {
  return this.find({ 
    $or: [
      { user_id: user_id },
      { target_user_id: user_id }
    ]
  });
};

ProximityAlertSchema.statics.findActiveByUserIds = function(user_id, targetUserId) {
  return this.findOne({ 
    user_id: user_id,
    target_user_id: targetUserId,
    status: 'active'
  });
};

// Instance methods
ProximityAlertSchema.methods.triggerAlert = function(currentDistance) {
  this.status = 'triggered';
  this.current_distance = currentDistance;
  this.triggered_at = new Date();
  return this;
};

ProximityAlertSchema.methods.dismissAlert = function() {
  this.status = 'dismissed';
  return this;
};

ProximityAlertSchema.methods.resetAlert = function() {
  this.status = 'active';
  this.triggered_at = null;
  return this;
};

const ProximityAlert = mongoose.model('ProximityAlert', ProximityAlertSchema);

module.exports = ProximityAlert;
