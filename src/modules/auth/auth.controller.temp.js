import Joi from "joi";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../../utils/email.js";

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(5).required(),
  password: Joi.string().min(8).required()
});

// Mock user storage (في الإنتاج يجب استخدام قاعدة البيانات)
const mockUsers = new Map();
const mockCodes = new Map();

export const register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      console.log('Validation error:', error.details);
      return res.status(400).json({ message: "Invalid input", details: error.details });
    }

    const { email, username, password } = value;

    // تحقق من وجود المستخدم
    if (mockUsers.has(email)) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // إنشاء رمز التفعيل
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // حفظ المستخدم مؤقتاً
    mockUsers.set(email, {
      id: Date.now().toString(),
      email,
      username,
      password, // في الإنتاج يجب تشفيره
      isVerified: false,
      role: 'user'
    });

    // حفظ رمز التفعيل
    mockCodes.set(email, verificationCode);

    console.log(`📧 Verification code for ${email}: ${verificationCode}`);

    // إرسال البريد الإلكتروني
    try {
      await sendEmail(
        email,
        "Verify your email - Account Store",
        `Your verification code is: ${verificationCode}\n\nThis code will expire in 10 minutes.`
      );
      console.log(`✅ Email sent successfully to ${email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send email to ${email}:`, emailError.message);
      console.log(`📧 Please use this verification code: ${verificationCode}`);
    }

    res.status(201).json({
      message: "User registered successfully. Please check your email for verification code.",
      user: { id: Date.now().toString(), email, username, role: 'user' }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: "Registration failed" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const user = mockUsers.get(email);
    const storedCode = mockCodes.get(email);

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (storedCode !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // تفعيل المستخدم
    user.isVerified = true;
    mockUsers.set(email, user);
    mockCodes.delete(email);

    // إنشاء JWT tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '30d' }
    );

    // set cookies
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
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    const csrfToken = crypto.randomBytes(24).toString("hex");
    res.cookie(process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN", csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    });

    res.status(200).json({
      message: "Email verified successfully and logged in",
      userData: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      expiresIn: 15 * 60
    });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(400).json({ message: "Verification failed" });
  }
};

export const resendCode = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = mockUsers.get(email);
    if (!user || user.password !== password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // إنشاء رمز جديد
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    mockCodes.set(email, verificationCode);

    console.log(`📧 New verification code for ${email}: ${verificationCode}`);

    // إرسال البريد الإلكتروني
    try {
      await sendEmail(
        email,
        "New verification code - Account Store",
        `Your new verification code is: ${verificationCode}\n\nThis code will expire in 10 minutes.`
      );
      console.log(`✅ New email sent successfully to ${email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send email to ${email}:`, emailError.message);
      console.log(`📧 Please use this verification code: ${verificationCode}`);
    }

    res.status(200).json({ 
      message: "New verification code sent. Please check your email." 
    });
  } catch (err) {
    console.error('Resend code error:', err);
    res.status(400).json({ message: "Failed to resend code" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = mockUsers.get(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: "Please verify your email first" });
    }

    // إنشاء JWT tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '30d' }
    );

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
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    const csrfToken = crypto.randomBytes(24).toString("hex");
    res.cookie(process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN", csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    });

    res.status(200).json({
      message: "Login successful",
      userData: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      expiresIn: 15 * 60
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(401).json({ message: "Login failed" });
  }
};

export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'default-secret');
    
    // البحث عن المستخدم
    let user = null;
    for (const [email, userData] of mockUsers.entries()) {
      if (userData.id === decoded.id) {
        user = userData;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // إنشاء tokens جديدة
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '30d' }
    );

    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    });

    res.cookie("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      message: "Tokens refreshed",
      userData: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      expiresIn: 15 * 60
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (req, res) => {
  try {
    // clear cookies
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    res.clearCookie(process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN");

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: "Logout failed" });
  }
};