const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/user.model'); // Add this import

// Load environment variables
dotenv.config();

// This will be replaced with actual user model when implemented
const getUserById = async (user_id) => {
  // Placeholder for user retrieval from database
  return { user_id, username: 'user', email: 'user@example.com' };
};

const getUserByEmail = async (email) => {
  // Placeholder for user retrieval from database
  return { user_id, first_name, last_name, email, phone_number, status, is_active };
};

// Configure JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: 'Jsb8va+rlHbnyTSr3716BQ==ytOwTrPS8gkZPq89dz2KOYll5S1PGiRM57WWKPCn' // Hardcoded secret
};
console.log('Using hardcoded JWT secret');

// Example passport JWT strategy configuration
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
  try {
      // for MongoDB:
      // const user = await User.findByPk(payload.sub);
      
      // for Sequalize:
      const user = await User.findOne({ 
        where: { user_id: payload.sub } 
      });

      if (!user) {
          return done(null, false);
      }
      return done(null, user);
  } catch (error) {
      return done(error, false);
  }
}));


// Configure Local Strategy (for username/password authentication)
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
    },
    async (email, password, done) => {
      try {
        // Find the user with the given email
        const user = await getUserByEmail(email);
        
        // If user doesn't exist, handle it
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Check if the password is correct
        // This will be replaced with actual bcrypt comparison when implemented
        const isMatch = await bcrypt.compare(password, user.password);
        
        // If password doesn't match, handle it
        if (!isMatch) {
          return done(null, false, { message: 'Invalid email or password' });
        }
        
        // Otherwise, return the user
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

module.exports = passport;
