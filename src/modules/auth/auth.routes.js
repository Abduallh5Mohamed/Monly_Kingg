import express from "express";
import * as authController from "./auth.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { passwordResetLimiter, loginLimiter, refreshLimiter, registerLimiter, verifyEmailLimiter, resendLimiter } from "../../middlewares/rateLimiter.js";
import crypto from "crypto";
import passport from "../../config/passport.js";

const router = express.Router();

router.get("/csrf-token", (req, res) => {
    const csrfToken = crypto.randomBytes(24).toString("hex");
    res.cookie(process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN", csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        maxAge: 15 * 60 * 1000,
        path: "/"
    });
      // SECURITY FIX [C-02]: Set CSRF token in cookie only, not response body.
      res.json({ success: true });
});

router.post("/register", registerLimiter, authController.register);
router.post("/verify-email", verifyEmailLimiter, authController.verifyEmail);
router.post("/login", loginLimiter, authController.login);
router.post("/resend-code", resendLimiter, authController.resendCode);
router.post("/refresh", refreshLimiter, authController.refresh);
router.post("/logout", refreshLimiter, authController.logout);

// Get current user (protected)
router.get("/me", authMiddleware, authController.getCurrentUser);

// Password reset routes (rate limited to prevent abuse)
router.post("/forgot-password", passwordResetLimiter, authController.forgotPassword);
router.post("/verify-reset-token", passwordResetLimiter, authController.verifyResetToken);
router.post("/reset-password", passwordResetLimiter, authController.resetPassword);

// SECURITY FIX [VULN-008]: Google OAuth with manual state parameter for CSRF protection.
// Since we use session:false (JWT-based), we generate a state token and store it in a
// secure httpOnly cookie, then verify it when Google redirects back.
router.get("/google", (req, res, next) => {
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Must be 'lax' for cross-site redirect from Google
    maxAge: 10 * 60 * 1000, // 10 minutes
    path: '/'
  });

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: state
  })(req, res, next);
});

router.get("/google/callback",
  loginLimiter,
  (req, res, next) => {
    // Verify state parameter matches the cookie
    const stateFromGoogle = req.query.state;
    const stateFromCookie = req.cookies?.oauth_state;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    if (!stateFromGoogle || !stateFromCookie ||
        stateFromGoogle.length !== stateFromCookie.length ||
        !crypto.timingSafeEqual(Buffer.from(stateFromGoogle), Buffer.from(stateFromCookie))) {
      return res.redirect(frontendUrl + "/login?error=csrf_failed");
    }

    // Clear the state cookie
    res.clearCookie('oauth_state', { httpOnly: true, path: '/' });

    passport.authenticate("google", {
      session: false,
      failureRedirect: frontendUrl + "/login?error=google_failed"
    })(req, res, next);
  },
  authController.googleCallback
);

export default router;
