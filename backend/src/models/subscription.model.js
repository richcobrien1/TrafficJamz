const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  plan_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'trial', 'expired'),
    defaultValue: 'active'
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  auto_renew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  payment_method_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripe_subscription_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripe_customer_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  trial_end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellation_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellation_reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  timestamps: true,
  paranoid: true, // Soft delete
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['stripe_subscription_id']
    }
  ]
});

// Static methods
Subscription.findActiveByUserId = function(userId) {
  return this.findOne({
    where: {
      user_id: userId,
      status: ['active', 'trial'],
      end_date: {
        [sequelize.Op.or]: [
          null,
          {
            [sequelize.Op.gt]: new Date()
          }
        ]
      }
    }
  });
};

Subscription.findByUserId = function(userId) {
  return this.findAll({
    where: {
      user_id: userId
    },
    order: [['createdAt', 'DESC']]
  });
};

module.exports = Subscription;
