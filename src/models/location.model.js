const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LocationSchema = new Schema({
  user_id: {
    type: String, // UUID from PostgreSQL User table
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  coordinates: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    altitude: {
      type: Number
    },
    accuracy: {
      type: Number
    },
    altitude_accuracy: {
      type: Number
    },
    heading: {
      type: Number
    },
    speed: {
      type: Number
    }
  },
  device_id: {
    type: String
  },
  battery_level: {
    type: Number
  },
  connection_type: {
    type: String,
    enum: ['wifi', 'cellular', 'offline'],
    default: 'wifi'
  },
  address: {
    formatted_address: String,
    country: String,
    administrative_area: String,
    locality: String,
    postal_code: String
  },
  shared_with_group_ids: [{
    type: Schema.Types.ObjectId,
    ref: 'Group'
  }],
  privacy_level: {
    type: String,
    enum: ['precise', 'approximate', 'hidden'],
    default: 'precise'
  }
}, {
  timestamps: true
});

// Create a 2dsphere index for geospatial queries
LocationSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 }, { type: '2dsphere' });

// Static methods
LocationSchema.statics.findLatestByUserId = function(user_id) {
  return this.findOne({ user_id: user_id }).sort({ timestamp: -1 });
};

LocationSchema.statics.findByUserIdAndTimeRange = function(user_id, startTime, endTime) {
  return this.find({
    user_id: user_id,
    timestamp: { $gte: startTime, $lte: endTime }
  }).sort({ timestamp: 1 });
};

LocationSchema.statics.findByGroupId = function(groupId) {
  return this.find({ shared_with_group_ids: groupId })
    .sort({ timestamp: -1 })
    .limit(1000);
};

LocationSchema.statics.findNearby = function(latitude, longitude, maxDistance, privacyLevel = 'precise') {
  return this.find({
    'coordinates.latitude': { $ne: null },
    'coordinates.longitude': { $ne: null },
    privacy_level: privacyLevel,
    $or: [
      {
        'coordinates.latitude': { $gte: latitude - 0.1, $lte: latitude + 0.1 },
        'coordinates.longitude': { $gte: longitude - 0.1, $lte: longitude + 0.1 }
      }
    ]
  }).limit(1000);
};

const Location = mongoose.model('Location', LocationSchema);

module.exports = Location;
