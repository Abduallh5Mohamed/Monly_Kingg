import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../modules/users/user.model.js";

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
            // Link Google account to existing user
            user.googleId = profile.id;
            if (!user.verified) user.verified = true;
            await user.save();
            return done(null, user);
          }

          // Create new user
          const username = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 20) +
            Math.random().toString(36).slice(2, 6);

          user = await User.create({
            email,
            username: username.length >= 5 ? username : username + "user1",
            passwordHash: "google-oauth-" + profile.id, // Placeholder, user can't login with password
            googleId: profile.id,
            fullName: profile.displayName || "",
            avatar: profile.photos?.[0]?.value || null,
            verified: true,
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
  console.log("✅ Google OAuth strategy configured");
} else {
  console.log("⚠️ Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
}

export default passport;
