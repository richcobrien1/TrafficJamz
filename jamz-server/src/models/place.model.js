const mongoose = require('mongoose');

const PlaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['poi','restaurant','lift','parking','other'], default: 'poi' },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  address: { type: String },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  shared_with_group_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  metadata: { type: Object, default: {} }
}, { timestamps: true });

const Place = mongoose.model('Place', PlaceSchema);

module.exports = Place;
