const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');
const { Sequelize } = require('sequelize');

/**
 * @route POST /api/temp-reset/fix-password
 * @desc ONE-TIME password reset for production debugging
 * @access Public (TEMPORARY - REMOVE AFTER USE)
 */
router.post('/fix-password', async (req, res) => {
  try {
    const email = 'richcobrien@hotmail.com';
    const newPassword = 'TrafficJamz2024!';

    console.log(`🔑 Resetting password for: ${email}`);

    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`🔐 New hash created: ${hashedPassword.substring(0, 29)}...`);

    // Update the user's password
    const [affectedRows] = await sequelize.query(
      'UPDATE users SET password_hash = :hash WHERE email = :email',
      {
        replacements: { hash: hashedPassword, email },
        type: Sequelize.QueryTypes.UPDATE
      }
    );

    if (affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify the password
    const [user] = await sequelize.query(
      'SELECT password_hash FROM users WHERE email = :email',
      {
        replacements: { email },
        type: Sequelize.QueryTypes.SELECT
      }
    );

    const isValid = await bcrypt.compare(newPassword, user.password_hash);

    res.status(200).json({ 
      success: true, 
      message: 'Password reset successfully',
      email,
      passwordVerified: isValid,
      newPassword: newPassword // TEMP: Show password for testing
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
