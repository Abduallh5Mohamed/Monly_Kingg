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

// Google OAuth routes
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/v1/auth/google/callback";
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false, state: false }));
router.get("/google/callback",
  passport.authenticate("google", {
    session: false,
    state: false,
    callbackURL: GOOGLE_CALLBACK_URL,
    failureRedirect: (process.env.FRONTEND_URL || "http://localhost:3000") + "/login?error=google_failed"
  }),
  authController.googleCallback
);

export default router;
