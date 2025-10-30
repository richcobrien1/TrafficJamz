#!/usr/bin/env node
/**
 * scripts/test_password.js
 *
 * Script to test password validation for a specific user
 */

const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Database connection
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

// Instance method to validate password
User.prototype.validatePassword = async function(password) {
  try {
    // Convert Buffer to string if needed
    const hashString = Buffer.isBuffer(this.password_hash)
      ? this.password_hash.toString()
      : this.password_hash;

    // Remove the \x prefix if it exists (from hex format)
    const cleanHash = hashString.startsWith('\\x')
      ? hashString.substring(2)
      : hashString;

    // Use proper bcrypt compare
    return await bcrypt.compare(password, cleanHash);
  } catch (error) {
    console.error('Password validation error:', error);
    // Return false instead of throwing to prevent exposing error details
    return false;
  }
};

async function testPassword(email, password) {
  try {
    console.log(`Testing password for ${email}...`);

    const user = await User.findOne({
      where: { email: email }
    });

    if (!user) {
      console.log(`❌ User ${email} not found`);
      return;
    }

    console.log(`Found user: ${user.username}`);
    console.log(`Password hash type: ${typeof user.password_hash}`);
    console.log(`Password hash is Buffer: ${Buffer.isBuffer(user.password_hash)}`);

    if (Buffer.isBuffer(user.password_hash)) {
      console.log(`Password hash (hex): ${user.password_hash.toString('hex')}`);
      console.log(`Password hash (utf8): ${user.password_hash.toString('utf8')}`);
    } else {
      console.log(`Password hash starts with: ${user.password_hash.substring(0, 10)}...`);
    }

    // Test password validation
    const isValid = await user.validatePassword(password);
    console.log(`Password validation result: ${isValid ? '✅ Valid' : '❌ Invalid'}`);

    // Also test direct bcrypt compare
    try {
      const hashString = Buffer.isBuffer(user.password_hash)
        ? user.password_hash.toString()
        : user.password_hash;

      const cleanHash = hashString.startsWith('\\x')
        ? hashString.substring(2)
        : hashString;

      const directCompare = await bcrypt.compare(password, cleanHash);
      console.log(`Direct bcrypt compare: ${directCompare ? '✅ Valid' : '❌ Invalid'}`);
    } catch (directError) {
      console.log(`Direct bcrypt compare failed: ${directError.message}`);
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

async function main() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await User.sync();
    console.log('✅ User model synced');

    // Test different user accounts
    const testAccounts = [
      { email: 'richcobrien@hotmail.com', password: '1Topgun123$' },
      { email: 'breanna@example.com', password: 'TestPass123!' }
    ];

    for (const account of testAccounts) {
      await testPassword(account.email, account.password);
      console.log('---');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

main();