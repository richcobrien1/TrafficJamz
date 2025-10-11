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

  async deletePlace(placeId, requestingUserId) {
    const place = await Place.findById(placeId).exec();
    if (!place) throw new Error('Place not found');
    // Only creator can delete (simpler rule). Admin check could be added.
    if (place.created_by && requestingUserId && place.created_by.toString() !== requestingUserId.toString()) {
      throw new Error('Forbidden');
    }
    await Place.deleteOne({ _id: placeId });
    return true;
  }
}

module.exports = new PlaceService();
