const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD'
  },
  billing_cycle: {
    type: DataTypes.ENUM('monthly', 'quarterly', 'annual'),
    defaultValue: 'monthly'
  },
  features: {
    type: DataTypes.JSONB,
    defaultValue: {
      max_groups: 5,
      max_members_per_group: 20,
      location_history_retention_days: 30,
      high_quality_audio: true,
      music_sharing: true,
      recording: false,
      priority_support: false
    }
  },
  trial_period_days: {
    type: DataTypes.INTEGER,
    defaultValue: 14
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  stripe_price_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripe_product_id: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  paranoid: true, // Soft delete
  indexes: [
    {
      fields: ['active']
    },
    {
      fields: ['billing_cycle']
    }
  ]
});

// Static methods
SubscriptionPlan.findActivePlans = function() {
  return this.findAll({
    where: {
      active: true
    },
    order: [['price', 'ASC']]
  });
};

module.exports = SubscriptionPlan;
