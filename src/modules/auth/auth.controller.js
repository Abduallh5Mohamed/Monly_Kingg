import * as authService from "./auth.service.js";
import User from "../users/user.model.js";
import Joi from "joi";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(5).required(),
  password: Joi.string().min(8).required()
});

export const register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ message: "Invalid input" });

    const exists = await User.findOne({ email: value.email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const user = await authService.register(value);

    res.status(201).json({
      message: "User registered successfully",
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
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    });
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "30", 10) * 24 * 60 * 60 * 1000
    });

    // CSRF token (double-submit): store readable cookie for client JS to read and add to headers
    const csrfToken = crypto.randomBytes(24).toString("hex");
    res.cookie(process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN", csrfToken, {
      httpOnly: false, // client JS must read it
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    });

    // Get user data
    const userData = await User.findOne({ email }).select('_id username email role');

    res.status(200).json({
      message: "Email verified and logged in",
      userData: {
        id: userData._id,
        username: userData.username,
        email: userData.email,
        role: userData.role
      },
      expiresIn: 15 * 60
    });
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
  try {
    const { email, password } = req.body;
    const ip = req.ip;
    const userAgent = req.get("User-Agent");

    const { accessToken, refreshToken } = await authService.login(email, password, ip, userAgent);

    // Set cookies as before
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    });
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "30", 10) * 24 * 60 * 60 * 1000
    });

    const csrfToken = crypto.randomBytes(24).toString("hex");
    res.cookie(process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN", csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    });

    // Get user data from auth.service
    const user = await User.findOne({ email }).select('_id username email role');

    // Return user data in response (without exposing tokens)
    res.status(200).json({
      message: "Login successful",
      userData: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      expiresIn: 15 * 60
    });
  } catch (err) {
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
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    });

    res.cookie("refresh_token", newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "30", 10) * 24 * 60 * 60 * 1000
    });

    // Decode JWT to get user ID
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    // Get user data
    const userData = await User.findById(decoded.id).select('_id username email role');

    res.status(200).json({
      message: "Tokens refreshed",
      userData: {
        id: userData._id,
        username: userData.username,
        email: userData.email,
        role: userData.role
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
    if (refreshToken) {
      await authService.revokeRefreshTokenForUser(refreshToken, req.ip);
    }

    // clear cookies
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    res.clearCookie(process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN");

    res.status(200).json({ message: "Logged out" });
  } catch (err) {
    res.status(500).json({ message: "Failed to logout" });
  }
};
