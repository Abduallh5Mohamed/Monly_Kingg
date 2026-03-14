import * as authService from "./auth.service.js";
import User from "../users/user.model.js";
import Joi from "joi";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import logger from "../../utils/logger.js";

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(5).required(),
  password: Joi.string().min(8).required()
});

/* ---------------- Get Current User ---------------- */
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -verificationCode -resetPasswordToken -resetPasswordExpires -refreshTokens')
      .lean(); // Return plain object instead of Mongoose document (faster)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user"
    });
  }
};

export const register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ message: "Invalid input" });

    const exists = await User.findOne({ email: value.email });
    if (exists) return res.status(400).json({ message: "Registration failed" }); // Generic message to prevent enumeration

    const user = await authService.register(value);

    res.status(201).json({
      message: "Registration successful. Please check your email for verification code.",
      user: { id: user._id, email: user.email, username: user.username, role: user.role }
    });
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const ip = req.ip;
    const userAgent = req.get("User-Agent");

    const { accessToken, refreshToken } = await authService.verifyEmail({ email, code, ip, userAgent });

    // set cookies: access short-lived, refresh long-lived; HttpOnly secure
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 15 * 60 * 1000,
      path: "/"
    });
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "30", 10) * 24 * 60 * 60 * 1000,
      path: "/"
    });

    // CSRF token (double-submit): store readable cookie for client JS to read and add to headers
    const csrfToken = crypto.randomBytes(24).toString("hex");
    res.cookie(process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN", csrfToken, {
      httpOnly: false, // client JS must read it
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 15 * 60 * 1000,
      path: "/"
    });

      // Get user data (lean for performance)
    const userData = await User.findOne({ email }).select('_id username email role isSeller profileCompleted moderatorPermissions').lean();

    const responseData = {
      message: "Email verified and logged in",
      userData: {
        id: userData._id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        isSeller: userData.isSeller || false,
        profileCompleted: userData.profileCompleted === true,
        moderatorPermissions: userData.moderatorPermissions || []
      },
      expiresIn: 15 * 60
    };

    res.status(200).json(responseData);
  } catch (err) {
    res.status(400).json({ message: "Invalid code or request" });
  }
};

export const resendCode = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const password = req.body.password;
    const ip = req.ip;
    const userAgent = req.get("User-Agent");

    const result = await authService.resendVerificationCode(email, password, ip, userAgent);
    res.status(200).json(result);
  } catch (err) {

    res.status(400).json({ message: err.message || "Failed to resend code" });
  }
};

export const login = async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();

  try {
    const password = req.body.password;
    const ip = req.ip;
    const userAgent = req.get("User-Agent");

    const { accessToken, refreshToken } = await authService.login(email, password, ip, userAgent);

    // Set cookies as before
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 15 * 60 * 1000,
      path: "/"
    });
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "30", 10) * 24 * 60 * 60 * 1000,
      path: "/"
    });

    const csrfToken = crypto.randomBytes(24).toString("hex");
    res.cookie(process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN", csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 15 * 60 * 1000,
      path: "/"
    });

    // Get user data - use lean() for speed, single query
    const user = await User.findOne({ email }).select('_id username email role isSeller profileCompleted moderatorPermissions').lean();

    res.status(200).json({
      message: "Login successful",
      userData: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isSeller: user.isSeller || false,
        profileCompleted: user.profileCompleted === true,
        moderatorPermissions: user.moderatorPermissions || []
      },
      expiresIn: 15 * 60
    });
  } catch (err) {
    logger.warn(`Login failed for ${email || "unknown"}: ${err.message}`);

    // Check if email not verified
    if (err.message === "Invalid credentials") {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.status(401).json({ message: "Invalid email or password" });
  }
};

export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: "No token" });

    const ip = req.ip;
    const userAgent = req.get("User-Agent");

    const { accessToken, refreshToken: newRefresh } = await authService.refreshTokens(refreshToken, ip, userAgent);

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 15 * 60 * 1000,
      path: "/"
    });

    res.cookie("refresh_token", newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "30", 10) * 24 * 60 * 60 * 1000,
      path: "/"
    });

    // Generate new CSRF token when refreshing
    const csrfToken = crypto.randomBytes(24).toString("hex");
    res.cookie(process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN", csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 15 * 60 * 1000,
      path: "/"
    });

    // Decode JWT to get user ID
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    // Get user data (lean for performance)
    const userData = await User.findById(decoded.id).select('_id username email role isSeller profileCompleted moderatorPermissions').lean();

    res.status(200).json({
      message: "Tokens refreshed",
      userData: {
        id: userData._id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        isSeller: userData.isSeller || false,
        profileCompleted: userData.profileCompleted === true,
        moderatorPermissions: userData.moderatorPermissions || []
      },
      expiresIn: 15 * 60
    });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;
    const accessToken = req.cookies?.access_token || req.headers.authorization?.split(" ")[1];

    if (refreshToken || accessToken) {
      await authService.revokeRefreshTokenForUser(refreshToken, req.ip, accessToken);
    }

    // clear cookies
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    res.clearCookie(process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN");

    res.status(200).json({ message: "Logged out" });
  } catch (err) {
    logger.error(`Logout failed: ${err.message}`);
    res.status(500).json({ message: "Failed to logout" });
  }
};

// =================== FORGOT PASSWORD CONTROLLERS ===================

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

export const forgotPassword = async (req, res) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const ip = req.ip;
    const userAgent = req.get("User-Agent");

    const result = await authService.forgotPassword(value.email, ip, userAgent);

    // Always return success message to prevent email enumeration
    res.status(200).json(result);
  } catch (err) {
    // Always return generic message to prevent email enumeration (removed console.error)
    res.status(200).json({ message: "If the email exists, a reset link will be sent" });
  }
};

const verifyResetTokenSchema = Joi.object({
  email: Joi.string().email().required(),
  token: Joi.string().required()
});

export const verifyResetToken = async (req, res) => {
  try {
    const { error, value } = verifyResetTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const result = await authService.verifyResetToken(value.email, value.token);
    res.status(200).json({ valid: result.valid });
  } catch (err) {
    res.status(400).json({ message: err.message, valid: false });
  }
};

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

export const resetPassword = async (req, res) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const ip = req.ip;
    const userAgent = req.get("User-Agent");
    // SECURITY FIX: Forward current access token (if any) for post-reset blacklist.
    const currentAccessToken = req.headers.authorization?.split(" ")[1] || req.cookies?.access_token || null;

    const result = await authService.resetPassword(
      value.email,
      value.token,
      value.newPassword,
      ip,
      userAgent,
      currentAccessToken
    );

    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Generate new CSRF token endpoint
export const getCsrfToken = async (req, res) => {
  try {
    const csrfToken = crypto.randomBytes(24).toString("hex");
    res.cookie(process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN", csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: "CSRF token generated"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to generate CSRF token"
    });
  }
};

/* ---------------- Google OAuth Callback ---------------- */
export const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      return res.redirect(frontendUrl + "/login?error=google_failed");
    }

    const ip = req.ip;
    const userAgent = req.get("User-Agent");

    // Generate tokens (same as normal login flow)
    const accessToken = jwt.sign(
      { id: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }
    );

    const refreshTokenString = crypto.randomBytes(64).toString("hex");
    const refreshDays = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "30", 10);

    // Store refresh token
    user.refreshTokens.push({
      token: refreshTokenString,
      expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
      ip,
      userAgent
    });

    // Log the auth event
    user.authLogs.push({
      action: "google_login",
      success: true,
      ip,
      userAgent,
      createdAt: new Date()
    });

    await user.save();

    // Set cookies
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 15 * 60 * 1000,
      path: "/"
    });

    res.cookie("refresh_token", refreshTokenString, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
      path: "/"
    });

    const csrfToken = crypto.randomBytes(24).toString("hex");
    res.cookie(process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN", csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 15 * 60 * 1000,
      path: "/"
    });

    // Redirect to frontend based on profile completion
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    if (user.profileCompleted !== true) {
      return res.redirect(frontendUrl + "/complete-profile");
    } else if (user.role === "admin") {
      return res.redirect(frontendUrl + "/admin/dashboard");
    } else {
      return res.redirect(frontendUrl + "/user");
    }
  } catch (err) {
    logger.error(`Google callback error: ${err.message}`);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return res.redirect(frontendUrl + "/login?error=google_failed");
  }
};
