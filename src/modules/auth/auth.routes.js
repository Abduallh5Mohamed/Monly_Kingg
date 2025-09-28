import express from "express";
import * as authController from "./auth.controller.js";
import { validate, registerSchema, resendCodeSchema, loginSchema } from "../../middlewares/validatorMiddleware.js";
import { resendLimiter } from "../../middlewares/rateLimiter.js";
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

router.post("/register", validate(registerSchema), authController.register);
router.post("/verify-email", authController.verifyEmail);
router.post("/login", validate(loginSchema), authController.login);
router.post("/resend-code", resendLimiter, validate(resendCodeSchema), authController.resendCode);

export default router;
