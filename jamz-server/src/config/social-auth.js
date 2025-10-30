// social-auth.js
// Passport strategies for social login (Facebook, LinkedIn, X/Twitter)

const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const userService = require('../services/user.service');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

// Deserialize user from session
passport.deserializeUser(async (user_id, done) => {
  try {
    const user = await userService.getUserById(user_id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Facebook Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'email', 'picture.type(large)']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Facebook profile:', profile);

      // Check if user already exists with this Facebook ID
      let user = await userService.findBySocialId('facebook', profile.id);

      if (user) {
        // Update social account data
        user.social_accounts = {
          ...user.social_accounts,
          facebook: {
            id: profile.id,
            access_token: accessToken,
            profile_data: profile._json,
            last_updated: new Date()
          }
        };
        await user.save();
      } else {
        // Check if user exists with same email
        if (profile.emails && profile.emails[0]) {
          user = await userService.getUserByEmail(profile.emails[0].value);
        }

        if (user) {
          // Link Facebook account to existing user
          user.social_accounts = {
            ...user.social_accounts,
            facebook: {
              id: profile.id,
              access_token: accessToken,
              profile_data: profile._json,
              last_updated: new Date()
            }
          };
          await user.save();
        } else {
          // Create new user
          const nameParts = profile.displayName ? profile.displayName.split(' ') : ['', ''];
          const newUser = await userService.register({
            username: `fb_${profile.id}`,
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : `fb_${profile.id}@temp.com`,
            password: Math.random().toString(36), // Temporary password
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || '',
            social_accounts: {
              facebook: {
                id: profile.id,
                access_token: accessToken,
                profile_data: profile._json,
                last_updated: new Date()
              }
            }
          });
          user = newUser;
        }
      }

      return done(null, user);
    } catch (error) {
      console.error('Facebook auth error:', error);
      return done(error, null);
    }
  }));
}

// LinkedIn Strategy
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/linkedin/callback`,
    scope: ['r_emailaddress', 'r_liteprofile'],
    state: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('LinkedIn profile:', profile);

      // Check if user already exists with this LinkedIn ID
      let user = await userService.findBySocialId('linkedin', profile.id);

      if (user) {
        // Update social account data
        user.social_accounts = {
          ...user.social_accounts,
          linkedin: {
            id: profile.id,
            access_token: accessToken,
            profile_data: profile._json,
            last_updated: new Date()
          }
        };
        await user.save();
      } else {
        // Check if user exists with same email
        if (profile.emails && profile.emails[0]) {
          user = await userService.getUserByEmail(profile.emails[0].value);
        }

        if (user) {
          // Link LinkedIn account to existing user
          user.social_accounts = {
            ...user.social_accounts,
            linkedin: {
              id: profile.id,
              access_token: accessToken,
              profile_data: profile._json,
              last_updated: new Date()
            }
          };
          await user.save();
        } else {
          // Create new user
          const newUser = await userService.register({
            username: `li_${profile.id}`,
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : `li_${profile.id}@temp.com`,
            password: Math.random().toString(36), // Temporary password
            first_name: profile.name ? profile.name.givenName : '',
            last_name: profile.name ? profile.name.familyName : '',
            social_accounts: {
              linkedin: {
                id: profile.id,
                access_token: accessToken,
                profile_data: profile._json,
                last_updated: new Date()
              }
            }
          });
          user = newUser;
        }
      }

      return done(null, user);
    } catch (error) {
      console.error('LinkedIn auth error:', error);
      return done(error, null);
    }
  }));
}

// X (Twitter) Strategy
if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
  passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/x/callback`,
    includeEmail: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('X/Twitter profile:', profile);

      // Check if user already exists with this X ID
      let user = await userService.findBySocialId('x', profile.id);

      if (user) {
        // Update social account data
        user.social_accounts = {
          ...user.social_accounts,
          x: {
            id: profile.id,
            access_token: accessToken,
            access_token_secret: refreshToken,
            profile_data: profile._json,
            last_updated: new Date()
          }
        };
        await user.save();
      } else {
        // Check if user exists with same email
        if (profile.emails && profile.emails[0]) {
          user = await userService.getUserByEmail(profile.emails[0].value);
        }

        if (user) {
          // Link X account to existing user
          user.social_accounts = {
            ...user.social_accounts,
            x: {
              id: profile.id,
              access_token: accessToken,
              access_token_secret: refreshToken,
              profile_data: profile._json,
              last_updated: new Date()
            }
          };
          await user.save();
        } else {
          // Create new user
          const nameParts = profile.displayName ? profile.displayName.split(' ') : ['', ''];
          const newUser = await userService.register({
            username: `x_${profile.id}`,
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : `x_${profile.id}@temp.com`,
            password: Math.random().toString(36), // Temporary password
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || '',
            social_accounts: {
              x: {
                id: profile.id,
                access_token: accessToken,
                access_token_secret: refreshToken,
                profile_data: profile._json,
                last_updated: new Date()
              }
            }
          });
          user = newUser;
        }
      }

      return done(null, user);
    } catch (error) {
      console.error('X/Twitter auth error:', error);
      return done(error, null);
    }
  }));
}

module.exports = passport;