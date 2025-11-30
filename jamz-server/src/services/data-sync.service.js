// MongoDB to PostgreSQL Sync Service
// Syncs critical group data from MongoDB to PostgreSQL for redundancy

const mongoose = require('mongoose');
const sequelize = require('../config/database');
const Group = require('../models/group.model');

class DataSyncService {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
  }

  /**
   * Start periodic sync (runs every 5 minutes)
   */
  startPeriodicSync(intervalMinutes = 5) {
    if (this.syncInterval) {
      console.log('⚠️  Sync already running');
      return;
    }

    console.log(`🔄 Starting periodic MongoDB → PostgreSQL sync (every ${intervalMinutes} minutes)`);
    
    // Run initial sync
    this.syncGroupsToPostgres();

    // Schedule periodic syncs
    this.syncInterval = setInterval(() => {
      this.syncGroupsToPostgres();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('✅ Periodic sync stopped');
    }
  }

  /**
   * Sync groups from MongoDB to PostgreSQL
   */
  async syncGroupsToPostgres() {
    if (this.isRunning) {
      console.log('⏳ Sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('🔄 Starting MongoDB → PostgreSQL sync...');

      // Fetch all groups from MongoDB
      const mongoGroups = await Group.find({}).lean();
      console.log(`📊 Found ${mongoGroups.length} groups in MongoDB`);

      let synced = 0;
      let errors = 0;

      for (const group of mongoGroups) {
        try {
          // Check if group exists in PostgreSQL
          const [pgGroup] = await sequelize.query(
            'SELECT group_id FROM groups WHERE group_id = $1',
            { bind: [group._id.toString()] }
          );

          if (pgGroup && pgGroup.length > 0) {
            // Update existing group
            await sequelize.query(`
              UPDATE groups SET
                group_name = $1,
                group_description = $2,
                owner_id = $3,
                avatar_url = $4,
                status = $5,
                privacy_level = $6,
                max_members = $7,
                settings = $8,
                updated_at = NOW()
              WHERE group_id = $9
            `, {
              bind: [
                group.name,
                group.description || '',
                group.ownerId,
                group.avatarUrl || null,
                group.status || 'active',
                group.privacyLevel || 'public',
                group.maxMembers || 100,
                JSON.stringify(group.settings || {}),
                group._id.toString()
              ]
            });
          } else {
            // Insert new group
            await sequelize.query(`
              INSERT INTO groups (
                group_id, group_name, group_description, owner_id,
                avatar_url, status, privacy_level, max_members,
                settings, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, {
              bind: [
                group._id.toString(),
                group.name,
                group.description || '',
                group.ownerId,
                group.avatarUrl || null,
                group.status || 'active',
                group.privacyLevel || 'public',
                group.maxMembers || 100,
                JSON.stringify(group.settings || {}),
                group.createdAt || new Date(),
                group.updatedAt || new Date()
              ]
            });
          }

          // Sync group members
          if (group.members && group.members.length > 0) {
            await this.syncGroupMembers(group._id.toString(), group.members);
          }

          synced++;
        } catch (error) {
          console.error(`❌ Error syncing group ${group._id}:`, error.message);
          errors++;
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Sync completed in ${duration}s: ${synced} synced, ${errors} errors`);

    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync group members
   */
  async syncGroupMembers(groupId, members) {
    try {
      // Clear existing members for this group
      await sequelize.query(
        'DELETE FROM group_members WHERE group_id = $1',
        { bind: [groupId] }
      );

      // Insert current members
      for (const member of members) {
        await sequelize.query(`
          INSERT INTO group_members (
            group_id, user_id, role, joined_at, invite_status
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (group_id, user_id) DO UPDATE SET
            role = EXCLUDED.role,
            invite_status = EXCLUDED.invite_status
        `, {
          bind: [
            groupId,
            member.userId,
            member.role || 'member',
            member.joinedAt || new Date(),
            member.inviteStatus || 'accepted'
          ]
        });
      }
    } catch (error) {
      console.error(`❌ Error syncing members for group ${groupId}:`, error.message);
    }
  }

  /**
   * Manual sync trigger (for testing or one-time sync)
   */
  async manualSync() {
    console.log('🔧 Manual sync triggered');
    await this.syncGroupsToPostgres();
  }
}

// Create singleton instance
const dataSyncService = new DataSyncService();

module.exports = dataSyncService;
