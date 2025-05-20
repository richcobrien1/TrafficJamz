// backend/debug-passport.js
const fs = require('fs');

// Read the current passport.js file
const passportJs = fs.readFileSync('./src/config/passport.js', 'utf8');

// Log the file content
console.log('Current passport.js content:');
console.log(passportJs);

// Create a completely new passport.js file
const newPassportJs = `
const passport = require('passport');
const { Strategy: JwtStrategy } = require('passport-jwt');
const { ExtractJwt } = require('passport-jwt');
const { User } = require('../models');

// Hardcoded JWT secret
const JWT_SECRET = 'Jsb8va+rlHbnyTSr3716BQ==ytOwTrPS8gkZPq89dz2KOYll5S1PGiRM57WWKPCn';

console.log('Using hardcoded JWT secret:', JWT_SECRET.substring(0, 5) + '...');

// Configure JWT strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET
};

// Create JWT strategy
passport.use(
  new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      console.log('JWT payload:', jwtPayload);
      
      // Find user by ID from JWT payload
      const user = await User.findOne({ where: { user_id: jwtPayload.sub } });
      
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }
  })
);

module.exports = passport;
`;

// Write the new passport.js file
fs.writeFileSync('./src/config/passport.js', newPassportJs);

console.log('✅ passport.js completely replaced with simplified version');
console.log('Next steps:');
console.log('1. Commit these changes');
console.log('2. Deploy to Vercel with: vercel --prod');
