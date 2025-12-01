// reset-password.js
// Script to reset a user's password in the database

require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes } = require('sequelize');

// Create database connection
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'trafficjamz',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD,
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    ssl: process.env.PGSSLMODE === 'require',
    dialectOptions: process.env.PGSSLMODE === 'require' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {},
    logging: console.log
  }
);

async function resetPassword() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const email = 'richcobrien@hotmail.com';
    const newPassword = 'TrafficJamz2024!';

    console.log(`\n🔑 Resetting password for: ${email}`);
    console.log(`🔑 New password: ${newPassword}`);

    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`\n🔐 Hashed password: ${hashedPassword.substring(0, 29)}...`);

    // Update the user's password
    const [affectedRows] = await sequelize.query(
      'UPDATE users SET password_hash = :hash WHERE email = :email',
      {
        replacements: { hash: hashedPassword, email },
        type: Sequelize.QueryTypes.UPDATE
      }
    );

    if (affectedRows === 0) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ Password updated successfully!');
    console.log(`\n📋 Login credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);

    // Verify the password can be validated
    const [user] = await sequelize.query(
      'SELECT password_hash FROM users WHERE email = :email',
      {
        replacements: { email },
        type: Sequelize.QueryTypes.SELECT
      }
    );

    if (user) {
      const isValid = await bcrypt.compare(newPassword, user.password_hash);
      console.log(`\n🔍 Password verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

resetPassword();
