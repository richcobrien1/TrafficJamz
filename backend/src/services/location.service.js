const Location = require('../models/location.model');
const Group = require('../models/group.model');
const ProximityAlert = require('../models/proximity-alert.model');
const Notification = require('../models/notification.model');
const geolib = require('geolib');
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const influxConfig = require('../config/influxdb');

/**
 * Location service for handling location tracking and proximity alerts
 */
class LocationService {
  /**
   * Update user location
   * @param {string} user_id - User ID
   * @param {Object} locationData - Location data
   * @returns {Promise<Object>} - Updated location
   */
  async updateUserLocation(user_id, locationData) {
    try {
      // Create new location record
      const location = new Location({
        user_id: user_id,
        timestamp: new Date(),
        coordinates: locationData.coordinates,
        device_id: locationData.device_id,
        battery_level: locationData.battery_level,
        connection_type: locationData.connection_type || 'wifi'
      });

      // Get user's groups to share location with
      const groups = await Group.find({
        'members.user_id': user_id,
        status: 'active'
      });

      // Filter groups based on location sharing settings
      const sharedGroups = groups.filter(group => {
        const member = group.members.find(m => m.user_id === user_id);
        return group.settings.location_sharing_required && member && member.status === 'active';
      });

      // Add group IDs to location
      location.shared_with_group_ids = sharedGroups.map(group => group._id);

      // Save location to MongoDB
      await location.save();

      // Store location in InfluxDB for time-series analysis
      this.storeLocationInInfluxDB(user_id, location);

      // Check for proximity alerts
      this.checkProximityAlerts(user_id, location, sharedGroups);

      return location;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Store location in InfluxDB
   * @param {string} user_id - User ID
   * @param {Object} location - Location data
   * @private
   */
  storeLocationInInfluxDB(user_id, location) {
    try {
      const point = new Point('user_location')
        .tag('user_id', user_id)
        .tag('device_id', location.device_id || 'unknown')
        .tag('connection_type', location.connection_type || 'unknown')
        .floatField('latitude', location.coordinates.latitude)
        .floatField('longitude', location.coordinates.longitude)
        .floatField('altitude', location.coordinates.altitude || 0)
        .floatField('accuracy', location.coordinates.accuracy || 0)
        .floatField('speed', location.coordinates.speed || 0)
        .floatField('battery_level', location.battery_level || 0);

      influxConfig.writeApi.writePoint(point);
    } catch (error) {
      console.error('Error storing location in InfluxDB:', error);
    }
  }

  /**
   * Check for proximity alerts
   * @param {string} user_id - User ID
   * @param {Object} location - Location data
   * @param {Array} groups - User's groups
   * @private
   */
  async checkProximityAlerts(user_id, location, groups) {
    try {
      // Get all active proximity alerts for the user's groups
      const groupIds = groups.map(group => group._id);
      const alerts = await ProximityAlert.find({
        group_id: { $in: groupIds },
        status: 'active',
        $or: [
          { user_id: user_id },
          { target_user_id: user_id }
        ]
      });

      for (const alert of alerts) {
        // Determine which user is the current user and which is the target
        const isCurrentUserInitiator = alert.user_id === user_id;
        const otherUserId = isCurrentUserInitiator ? alert.target_user_id : alert.user_id;

        // Get the other user's latest location
        const otherUserLocation = await Location.findOne({
          user_id: otherUserId,
          shared_with_group_ids: alert.group_id
        }).sort({ timestamp: -1 });

        if (!otherUserLocation) continue;

        // Calculate distance between users
        const distance = geolib.getDistance(
          {
            latitude: location.coordinates.latitude,
            longitude: location.coordinates.longitude
          },
          {
            latitude: otherUserLocation.coordinates.latitude,
            longitude: otherUserLocation.coordinates.longitude
          }
        );

        // Check if distance is below threshold
        if (distance <= alert.distance_threshold) {
          // Trigger alert if not already triggered
          if (alert.status !== 'triggered') {
            alert.triggerAlert(distance);
            await alert.save();

            // Create notifications for both users
            const group = await Group.findById(alert.group_id);
            const groupName = group ? group.name : 'a group';

            // Notification for initiator
            await Notification.create({
              user_id: alert.user_id,
              type: 'proximity_alert',
              title: 'Proximity Alert',
              body: `You are now within ${alert.distance_threshold} meters of your tracked contact in ${groupName}.`,
              data: {
                group_id: alert.group_id,
                alert_id: alert._id,
                distance: distance,
                target_user_id: alert.target_user_id
              },
              priority: 'high'
            });

            // Notification for target
            await Notification.create({
              user_id: alert.target_user_id,
              type: 'proximity_alert',
              title: 'Proximity Alert',
              body: `Someone in ${groupName} is now within ${alert.distance_threshold} meters of you.`,
              data: {
                group_id: alert.group_id,
                alert_id: alert._id,
                distance: distance,
                target_user_id: alert.user_id
              },
              priority: 'high'
            });
          }
        } else if (alert.status === 'triggered' && distance > alert.distance_threshold * 1.2) {
          // Reset alert if users move away (with 20% buffer to prevent oscillation)
          alert.resetAlert();
          await alert.save();
        }
      }
    } catch (error) {
      console.error('Error checking proximity alerts:', error);
    }
  }

  /**
   * Get group members' locations
   * @param {string} groupId - Group ID
   * @param {string} requesterId - User ID making the request
   * @returns {Promise<Array>} - Array of member locations
   */
  async getGroupMembersLocations(groupId, requesterId) {
    try {
      // Check if group exists and user is a member
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      if (!group.isMember(requesterId)) {
        throw new Error('User is not a member of this group');
      }

      // Get all active members
      const memberIds = group.members
        .filter(member => member.status === 'active')
        .map(member => member.user_id);

      // Get latest location for each member
      const locations = [];
      for (const memberId of memberIds) {
        const location = await Location.findOne({
          user_id: memberId,
          shared_with_group_ids: groupId
        }).sort({ timestamp: -1 });

        if (location) {
          // Adjust precision based on privacy level
          let locationData = {
            user_id: memberId,
            timestamp: location.timestamp,
            privacy_level: location.privacy_level
          };

          if (location.privacy_level === 'precise') {
            locationData.coordinates = location.coordinates;
          } else if (location.privacy_level === 'approximate') {
            // Round coordinates to lower precision
            locationData.coordinates = {
              latitude: Math.round(location.coordinates.latitude * 100) / 100,
              longitude: Math.round(location.coordinates.longitude * 100) / 100
            };
          } else {
            // Hidden - only show that user is sharing location but not where
            locationData.coordinates = null;
          }

          locations.push(locationData);
        }
      }

      return locations;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user location
   * @param {string} user_id - User ID to get location for
   * @param {string} requesterId - User ID making the request
   * @returns {Promise<Object>} - User location
   */
  async getUserLocation(user_id, requesterId) {
    try {
      // Check if requester has permission to view user's location
      const sharedGroups = await Group.find({
        'members.user_id': { $all: [user_id, requesterId] },
        status: 'active'
      });

      if (sharedGroups.length === 0) {
        throw new Error('Permission denied');
      }

      // Get latest location
      const location = await Location.findOne({
        user_id: user_id,
        shared_with_group_ids: { $in: sharedGroups.map(g => g._id) }
      }).sort({ timestamp: -1 });

      if (!location) {
        throw new Error('Location not found');
      }

      // Adjust precision based on privacy level
      let locationData = {
        user_id: user_id,
        timestamp: location.timestamp,
        privacy_level: location.privacy_level
      };

      if (location.privacy_level === 'precise') {
        locationData.coordinates = location.coordinates;
      } else if (location.privacy_level === 'approximate') {
        // Round coordinates to lower precision
        locationData.coordinates = {
          latitude: Math.round(location.coordinates.latitude * 100) / 100,
          longitude: Math.round(location.coordinates.longitude * 100) / 100
        };
      } else {
        // Hidden - only show that user is sharing location but not where
        locationData.coordinates = null;
      }

      return locationData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user location history
   * @param {string} user_id - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} groupId - Optional group ID filter
   * @param {string} requesterId - User ID making the request
   * @returns {Promise<Array>} - Location history
   */
  async getUserLocationHistory(user_id, startDate, endDate, groupId, requesterId) {
    try {
      // Check if requester has permission
      if (user_id !== requesterId) {
        // If not self, check if they share a group
        const sharedGroups = await Group.find({
          'members.user_id': { $all: [user_id, requesterId] },
          status: 'active'
        });

        if (sharedGroups.length === 0) {
          throw new Error('Permission denied');
        }

        // If groupId is specified, check if it's in shared groups
        if (groupId && !sharedGroups.some(g => g._id.toString() === groupId)) {
          throw new Error('Permission denied');
        }
      }

      // Build query
      const query = {
        user_id: user_id,
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      };

      // Add group filter if specified
      if (groupId) {
        query.shared_with_group_ids = groupId;
      }

      // Get location history
      const locations = await Location.find(query).sort({ timestamp: 1 });

      // Process based on privacy level
      return locations.map(location => {
        let locationData = {
          user_id: user_id,
          timestamp: location.timestamp,
          privacy_level: location.privacy_level
        };

        if (location.privacy_level === 'precise' || user_id === requesterId) {
          locationData.coordinates = location.coordinates;
        } else if (location.privacy_level === 'approximate') {
          // Round coordinates to lower precision
          locationData.coordinates = {
            latitude: Math.round(location.coordinates.latitude * 100) / 100,
            longitude: Math.round(location.coordinates.longitude * 100) / 100
          };
        } else {
          // Hidden - only show that user is sharing location but not where
          locationData.coordinates = null;
        }

        return locationData;
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Set location privacy
   * @param {string} user_id - User ID
   * @param {string} privacyLevel - Privacy level
   * @param {Array} sharedWithGroupIds - Group IDs to share with
   * @returns {Promise<Object>} - Updated privacy settings
   */
  async setLocationPrivacy(user_id, privacyLevel, sharedWithGroupIds) {
    try {
      // Validate privacy level
      if (!['precise', 'approximate', 'hidden'].includes(privacyLevel)) {
        throw new Error('Invalid privacy level');
      }

      // Validate groups if provided
      if (sharedWithGroupIds && sharedWithGroupIds.length > 0) {
        const userGroups = await Group.find({
          'members.user_id': user_id,
          status: 'active'
        });

        const userGroupIds = userGroups.map(g => g._id.toString());
        const invalidGroups = sharedWithGroupIds.filter(id => !userGroupIds.includes(user_id));

        if (invalidGroups.length > 0) {
          throw new Error('User is not a member of some specified groups');
        }
      }

      // Update future locations
      const settings = {
        privacy_level: privacyLevel,
        shared_with_group_ids: sharedWithGroupIds
      };

      return settings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create proximity alert
   * @param {string} groupId - Group ID
   * @param {string} targetUserId - Target user ID
   * @param {number} distanceThreshold - Distance threshold in meters
   * @param {string} user_id - User ID creating the alert
   * @returns {Promise<Object>} - Created proximity alert
   */
  async createProximityAlert(groupId, targetUserId, distanceThreshold, user_id) {
    try {
      // Check if group exists and both users are members
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      if (!group.isMember(user_id) || !group.isMember(targetUserId)) {
        throw new Error('Both users must be members of the group');
      }

      // Check if alert already exists
      const existingAlert = await ProximityAlert.findOne({
        group_id: groupId,
        user_id: user_id,
        target_user_id: targetUserId,
        status: 'active'
      });

      if (existingAlert) {
        throw new Error('Proximity alert already exists');
      }

      // Create new alert
      const alert = new ProximityAlert({
        group_id: groupId,
        user_id: user_id,
        target_user_id: targetUserId,
        distance_threshold: distanceThreshold || 100
      });

      await alert.save();
      return alert;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get proximity alerts
   * @param {string} groupId - Group ID
   * @param {string} user_id - User ID making the request
   * @returns {Promise<Array>} - Array of proximity alerts
   */
  async getProximityAlerts(groupId, user_id) {
    try {
      // Check if group exists and user is a member
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      if (!group.isMember(user_id)) {
        throw new Error('User is not a member of this group');
      }

      // Get alerts
      const alerts = await ProximityAlert.find({
        group_id: groupId,
        $or: [
          { user_id: user_id },
          { target_user_id: user_id }
        ]
      });

      return alerts;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update proximity alert
   * @param {string} alertId - Alert ID
   * @param {Object} updateData - Data to update
   * @param {string} user_id - User ID making the request
   * @returns {Promise<Object>} - Updated proximity alert
   */
  async updateProximityAlert(alertId, updateData, user_id) {
    try {
      // Get alert
      const alert = await ProximityAlert.findById(alertId);
      if (!alert) {
        throw new Error('Proximity alert not found');
      }

      // Check if user has permission
      if (alert.user_id !== user_id) {
        throw new Error('Permission denied');
      }

      // Update allowed fields
      if (updateData.distance_threshold) {
        alert.distance_threshold = updateData.distance_threshold;
      }

      if (updateData.status) {
        if (updateData.status === 'dismissed') {
          alert.dismissAlert();
        } else if (updateData.status === 'active') {
          alert.resetAlert();
        }
      }

      await alert.save();
      return alert;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete proximity alert
   * @param {string} alertId - Alert ID
   * @param {string} user_id - User ID making the request
   * @returns {Promise<boolean>} - Success status
   */
  async deleteProximityAlert(alertId, user_id) {
    try {
      // Get alert
      const alert = await ProximityAlert.findById(alertId);
      if (!alert) {
        throw new Error('Proximity alert not found');
      }

      // Check if user has permission
      if (alert.user_id !== user_id) {
        throw new Error('Permission denied');
      }

      // Delete alert
      await ProximityAlert.deleteOne({ _id: alertId });
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new LocationService();
