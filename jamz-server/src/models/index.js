const User = require('./user.model');
const PasswordResetToken = require('./password-reset-token.model');

// Set up associations
User.associate && User.associate({
  PasswordResetToken
});

PasswordResetToken.associate && PasswordResetToken.associate({
  User
});

module.exports = {
  User,
  PasswordResetToken
};