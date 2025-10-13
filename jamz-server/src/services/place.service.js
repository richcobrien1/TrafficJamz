const Place = require('../models/place.model');
const Group = require('../models/group.model');
const mongoose = require('mongoose');

class PlaceService {
  async createPlace({ name, description, type, latitude, longitude, address, groupId, createdBy }) {
    if (!groupId) throw new Error('groupId required');

    // Validate groupId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new Error('Invalid groupId format');
    }

    // Verify group exists
    const group = await Group.findById(groupId).exec();
    if (!group) throw new Error('Group not found');

    const place = new Place({
      name,
      description,
      type: type || 'poi',
      coordinates: { latitude, longitude },
      address,
      created_by: createdBy && mongoose.Types.ObjectId.isValid(createdBy) ? new mongoose.Types.ObjectId(createdBy) : undefined,
      shared_with_group_ids: [new mongoose.Types.ObjectId(groupId)]
    });

    await place.save();
    return place;
  }

  async listPlacesForGroup(groupId) {
    if (!groupId) return [];
    if (!mongoose.Types.ObjectId.isValid(groupId)) return [];
    return Place.find({ shared_with_group_ids: new mongoose.Types.ObjectId(groupId) }).lean().exec();
  }

  async updatePlace(placeId, updates, requestingUserId) {
    const place = await Place.findById(placeId).exec();
    if (!place) throw new Error('Place not found');
    // Only creator can update
    if (place.created_by && requestingUserId && place.created_by.toString() !== requestingUserId.toString()) {
      throw new Error('Forbidden');
    }
    
    const allowedUpdates = ['name', 'description', 'latitude', 'longitude'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'latitude' || field === 'longitude') {
          place.coordinates[field] = updates[field];
        } else {
          place[field] = updates[field];
        }
      }
    });
    
    await place.save();
    return place;
  }
}

module.exports = new PlaceService();
