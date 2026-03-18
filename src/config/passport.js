import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../modules/users/user.model.js";
import logger from "../utils/logger.js";

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // Build callback URL dynamically based on environment
  const getCallbackURL = () => {
    if (process.env.GOOGLE_CALLBACK_URL) return process.env.GOOGLE_CALLBACK_URL;
    if (process.env.NODE_ENV === "production" && process.env.ALLOWED_ORIGINS) {
      return process.env.ALLOWED_ORIGINS.split(",")[0] + "/api/v1/auth/google/callback";
    }
    return "http://localhost:5000/api/v1/auth/google/callback";
  };

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: getCallbackURL(),
        scope: ["profile", "email"],
        // FIX: Removed state:true — this app uses session:false JWT auth flow.
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error("No email found in Google profile"), null);
          }

          // Check if user already exists with this Google ID
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            return done(null, user);
          }

          // Check if user exists with same email
          user = await User.findOne({ email });

          if (user) {
            // SECURITY FIX [GT-002]: Disallow insecure auto-linking of OAuth accounts
            if (user.googleId) {
                return done(new Error("Email already associated with another account"), null);
            }
            return done(new Error("Account exists. Please login with password to link Google account."), null);
          }

          // Create new user
          // SECURITY FIX [VULN-H04]: Use crypto.randomBytes() instead of Math.random() for unpredictable username suffixes.
          const username = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 20) +
            crypto.randomBytes(3).toString('hex'); // 6 hex chars, cryptographically random

          user = await User.create({
            email,
            username: username.length >= 5 ? username : username + "user1",
            // SECURITY FIX [VULN-004]: Use a sentinel that bcrypt.compare() will ALWAYS reject.
            // This prevents OAuth-only users from logging in via password or resetting their password.
            passwordHash: "!OAUTH_ONLY!_no_password_login_allowed",
            googleId: profile.id,
            fullName: profile.displayName || "",
            avatar: null,
            verified: true,
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
  logger.info("Google OAuth strategy configured");
} else {
  logger.warn("Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
}

export default passport;
