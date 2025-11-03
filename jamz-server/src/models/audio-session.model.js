const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AudioSessionSchema = new Schema({
  group_id: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'paused'],
    default: 'active'
  },
  creator_id: {
    type: String, // UUID from PostgreSQL User table
    required: true
  },
  session_type: {
    type: String,
    enum: ['voice_only', 'voice_with_music'],
    default: 'voice_only'
  },
  recording_enabled: {
    type: Boolean,
    default: false
  },
  recording_url: {
    type: String
  },
  participants: [{
    user_id: {
      type: String, // UUID from PostgreSQL User table
      required: true
    },
    joined_at: {
      type: Date,
      default: Date.now
    },
    left_at: {
      type: Date
    },
    mic_muted: {
      type: Boolean,
      default: false
    },
    speaker_muted: {
      type: Boolean,
      default: false
    },
    connection_quality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    device_type: {
      type: String,
      enum: ['ios', 'android', 'web'],
      default: 'web'
    },
    mic_muted: {
      type: Boolean,
      default: false
    },
    speaker_muted: {
      type: Boolean,
      default: false
    },
    push_to_talk_enabled: {
      type: Boolean,
      default: false
    },
    // New fields
    voice_activity_detection: {
      enabled: {
        type: Boolean,
        default: false
      },
      threshold: {
        type: Number,
        default: 0.15 // 0 to 1
      }
    }
  }],
  music: {
    controller_id: String, // Session-level controller (persists even when no track playing)
    currently_playing: {
      title: String,
      artist: String,
      album: String,
      duration: Number,
      fileUrl: String, // Supabase storage URL
      position: Number,
      controlled_by: String, // UUID from PostgreSQL User table
      started_at: Date
    },
    playlist: [{
      id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
      },
      title: String,
      artist: String,
      album: String,
      duration: Number,
      fileUrl: String, // Supabase storage URL
      uploadedBy: String, // User who uploaded the track
      added_by: String // UUID from PostgreSQL User table
    }]
  },
  // WebRTC signaling data
  router_id: {
    type: String
  },
  transports: [{
    id: String,
    user_id: String,
    client_id: String,
    direction: {
      type: String,
      enum: ['send', 'receive']
    }
  }],
  producers: [{
    id: String,
    user_id: String,
    kind: {
      type: String,
      enum: ['audio', 'video']
    },
    transport_id: String
  }],
  consumers: [{
    id: String,
    user_id: String,
    producer_id: String,
    transport_id: String
  }]
}, {
  timestamps: true
});

// Indexes for faster queries
AudioSessionSchema.index({ group_id: 1, status: 1 });
AudioSessionSchema.index({ 'participants.user_id': 1 });
AudioSessionSchema.index({ creator_id: 1 });

// Static methods
AudioSessionSchema.statics.findActiveByGroupId = function(groupId) {
  return this.findOne({ 
    group_id: groupId,
    status: 'active'
  });
};

AudioSessionSchema.statics.findByUserId = function(user_id) {
  return this.find({ 
    'participants.user_id': user_id
  });
};

// Instance methods
AudioSessionSchema.methods.isParticipant = function(user_id) {
  return this.participants.some(participant => participant.user_id === user_id);
};

AudioSessionSchema.methods.addParticipant = function(user_id, deviceType = 'web') {
  if (!this.isParticipant(user_id)) {
    this.participants.push({
      user_id: user_id,
      joined_at: new Date(),
      device_type: deviceType
    });
  } else {
    // Update existing participant
    const participant = this.participants.find(p => p.user_id === user_id);
    if (participant.left_at) {
      participant.joined_at = new Date();
      participant.left_at = undefined;
    }
  }
  return this;
};

AudioSessionSchema.methods.removeParticipant = function(user_id) {
  const participant = this.participants.find(p => p.user_id === user_id && !p.left_at);
  if (participant) {
    participant.left_at = new Date();
  }
  return this;
};

AudioSessionSchema.methods.updateParticipantStatus = function(user_id, updates) {
  const participant = this.participants.find(p => p.user_id === user_id && !p.left_at);
  if (participant) {
    Object.assign(participant, updates);
  }
  return this;
};

AudioSessionSchema.methods.addToPlaylist = function(track, addedBy) {
  if (!this.music) {
    this.music = { playlist: [] };
  }
  
  this.music.playlist.push({
    ...track,
    added_by: addedBy
  });
  
  return this;
};

AudioSessionSchema.methods.updateCurrentlyPlaying = function(track, user_id) {
  if (!this.music) {
    this.music = { playlist: [] };
  }
  
  this.music.currently_playing = {
    ...track,
    controlled_by: user_id,
    started_at: new Date(),
    position: 0
  };
  
  return this;
};

const AudioSession = mongoose.model('AudioSession', AudioSessionSchema);

module.exports = AudioSession;
