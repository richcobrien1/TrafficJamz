
const passport = require('passport');
const { Strategy: JwtStrategy } = require('passport-jwt');
const { ExtractJwt } = require('passport-jwt');

// Use direct import without models
console.log('Using simplified passport without models dependency');

// Configure JWT strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJUcmFmZmljSmFtIiwiVXNlcm5hbWUiOiJWMlUiLCJleHAiOjE3MTY1NjcyMzR9'
};


// Create JWT strategy with simplified callback
passport.use(
  new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      // Simply pass the JWT payload as the user
      return done(null, { user_id: jwtPayload.sub, email: jwtPayload.email });
    } catch (error) {
      return done(error, false);
    }
  })
);

module.exports = passport;
