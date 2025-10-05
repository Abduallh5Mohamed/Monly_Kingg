import express from "express";
import * as authController from "./auth.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { passwordResetLimiter } from "../../middlewares/rateLimiter.js";
import crypto from "crypto";

const router = express.Router();

router.get("/csrf-token", (req, res) => {
    const csrfToken = crypto.randomBytes(24).toString("hex");
    res.cookie(process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN", csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000
    });
    res.json({ csrfToken });
});

router.post("/register", authController.register);
router.post("/verify-email", authController.verifyEmail);
router.post("/login", authController.login);
router.post("/resend-code", authController.resendCode);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

// Get current user (protected)
router.get("/me", authMiddleware, authController.getCurrentUser);

// Password reset routes (rate limited to prevent abuse)
router.post("/forgot-password", passwordResetLimiter, authController.forgotPassword);
router.post("/verify-reset-token", passwordResetLimiter, authController.verifyResetToken);
router.post("/reset-password", passwordResetLimiter, authController.resetPassword);

export default router;
