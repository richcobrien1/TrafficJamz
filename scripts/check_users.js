#!/usr/bin/env node
/**
 * scripts/check_users.js
 *
 * Script to check existing users and create a test user if needed
 */

const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Database connection - using the same connection string as the server
const sequelize = new Sequelize('postgres://postgres.nrlaqkpojtvvheosnpaz:tMRyyxjADUl63z44@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=no-verify&supa=base-pooler.x', {
  dialect: 'postgres',
  dialectModule: require('pg'),
  logging: false
});

// User model (simplified)
const User = sequelize.define('users', {
  user_id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  username: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: Sequelize.STRING,
    allowNull: false
  },
  first_name: {
    type: Sequelize.STRING,
    allowNull: true
  },
  last_name: {
    type: Sequelize.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  paranoid: true
});

async function main() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync the model
    await User.sync();
    console.log('✅ User model synced');

    // Check existing users
    console.log('Checking existing users...');
    const users = await User.findAll({
      attributes: ['user_id', 'username', 'email', 'first_name', 'last_name']
    });

    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ${user.username} (${user.email}) - ${user.first_name} ${user.last_name}`);
    });

    // Create test user if none exist
    if (users.length === 0) {
      console.log('Creating test user...');

      const testUser = await User.create({
        user_id: require('uuid').v4(),
        username: 'testuser',
        email: 'test@example.com',
        password_hash: await bcrypt.hash('TestPass123!', 10),
        first_name: 'Test',
        last_name: 'User'
      });

      console.log('✅ Test user created:');
      console.log(`- Username: ${testUser.username}`);
      console.log(`- Email: ${testUser.email}`);
      console.log(`- Password: TestPass123!`);
    }

    // Check if the user mentioned in the conversation exists
    const existingUser = await User.findOne({
      where: { email: 'breanna@example.com' }
    });

    if (existingUser) {
      console.log('✅ Found breanna@example.com user');
    } else {
      console.log('❌ breanna@example.com user not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

main();