import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

const clientID = process.env.GOOGLE_CLIENT_ID || 'DUMMY_CLIENT_ID';
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'DUMMY_CLIENT_SECRET';

passport.use(
  new GoogleStrategy(
    {
      clientID,
      clientSecret,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        const googleId = profile.id;
        const name = profile.displayName || profile.name?.givenName || 'Google User';

        // 1. Check if googleId already matches
        let user = await User.findOne({ googleId });
        if (user) {
          return done(null, user);
        }

        // 2. Link account if the email already exists
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            user.googleId = googleId;
            await user.save();
            return done(null, user);
          }
        }

        // 3. Otherwise register a new user
        user = await User.create({
          name,
          email,
          googleId,
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);
