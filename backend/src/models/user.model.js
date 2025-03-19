const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone_number: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      is: /^\+?[1-9]\d{1,14}$/
    }
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profile_image_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active'
  },
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      notifications: {
        push_enabled: true,
        email_enabled: true,
        proximity_alerts: true,
        group_invites: true
      },
      privacy: {
        share_location: true,
        location_history_enabled: true,
        appear_offline: false
      },
      audio: {
        auto_mute_on_join: false,
        noise_cancellation: true,
        music_volume: 80,
        voice_volume: 100
      }
    }
  },
  mfa_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  mfa_methods: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  }
}, {
  timestamps: true,
  paranoid: true, // Soft delete
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        user.password_hash = await bcrypt.hash(user.password_hash, 10);
      }
    }
  }
});

// Instance methods
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password_hash);
};

// Static methods
User.findByEmail = function(email) {
  return this.findOne({ where: { email } });
};

User.findByUsername = function(username) {
  return this.findOne({ where: { username } });
};

module.exports = User;
