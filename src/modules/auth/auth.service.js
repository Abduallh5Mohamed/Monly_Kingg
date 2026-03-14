import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import User from "../users/user.model.js";
import { sendEmail } from "../../utils/email.js";
import {
  buildEmailLayout,
  buildLoginAlertEmail,
  buildVerificationEmail,
} from "../../utils/emailTemplates.js";
import logger from "../../utils/logger.js";
import cacheService from "../../services/cacheService.js";

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "30", 10);

function signAccessToken(user) {
  const payload = { id: user._id.toString(), role: user.role };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function generateRefreshTokenString() {
  return crypto.randomBytes(64).toString("hex");
}

async function createAndStoreRefreshToken(user, ip = null, userAgent = null) {
  const tokenString = generateRefreshTokenString();
  const expiresAt = dayjs().add(REFRESH_DAYS, "day").toDate();

  user.refreshTokens.push({
    token: tokenString,
    expiresAt,
    ip,
    userAgent
  });

  await user.save();
  return tokenString;
}

// Revoke a refresh token (mark as revoked)
async function revokeRefreshToken(user, token, ip) {
  const rt = user.refreshTokens.find(r => r.token === token);
  if (!rt) return false;
  rt.revoked = true;
  rt.revokedAt = new Date();
  rt.revokedByIp = ip;
  await user.save();
  return true;
}

// Revoke all refresh tokens for a user (used on suspected compromise)
async function revokeAllRefreshTokens(user, reason = null) {
  user.refreshTokens.forEach(r => {
    r.revoked = true;
    r.revokedAt = new Date();
    r.replacedByToken = null;
  });
  user.authLogs.push({ action: "revoke_all_tokens", success: true, ip: null, userAgent: reason || "manual" });
  await user.save();
}

// Validate refresh token for a user instance
function isRefreshTokenValid(rtObj) {
  if (!rtObj) return false;
  if (rtObj.revoked) return false;
  if (Date.now() >= new Date(rtObj.expiresAt).getTime()) return false;
  return true;
}

/* ---------------- register ---------------- */
export const register = async ({ email, username, password }) => {
  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const rawCode = crypto.randomInt(100000, 1000000).toString(); // correct range
    const verificationCode = await bcrypt.hash(rawCode, BCRYPT_ROUNDS);
    const verificationCodeValidation = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      email,
      username,
      passwordHash,
      role: "user", // ALWAYS set as 'user', regardless of what was passed
      verified: false,
      verificationCode,
      verificationCodeValidation,
      lastVerificationSentAt: new Date()
    });

    // Try to send email (but don't fail registration if email fails)
    try {
      const verificationEmail = buildVerificationEmail({
        username: user.username,
        code: rawCode,
        expiresInMinutes: 10,
      });
      await sendEmail(user.email, "Verify your MonlyKing account", verificationEmail);
      logger.info(`📧 Verification email sent to ${email}`);
    } catch (emailError) {
      logger.warn(`⚠️ Email sending failed for ${email}: ${emailError.message}`);
      logger.info(`\n${'='.repeat(60)}`);
      logger.info(`📋 VERIFICATION CODE (Email failed - showing in console):`);
      logger.info(`   Email: ${email}`);
      logger.info(`   Code: ${rawCode}`);
      logger.info(`   Expires: ${new Date(Date.now() + 10 * 60 * 1000).toLocaleString()}`);
      logger.info(`${'='.repeat(60)}\n`);
      // Continue registration even if email fails
    }

    // log
    user.authLogs.push({ action: "register", success: true, ip: null, userAgent: null });

    await user.save();
    logger.info(`User registered: ${email}`);
    return user;
  } catch (err) {
    logger.error(`Register failed for ${email}: ${err.message}`);
    throw err;

  }
};

/* ---------------- verifyEmail ---------------- */
export const verifyEmail = async ({ email, code, ip = null, userAgent = null }) => {
  try {
    const user = await User.findOne({ email }).select("+verificationCode +verificationCodeValidation +refreshTokens +passwordHash");

    // generic error to avoid enumeration
    if (!user) throw new Error("Invalid or expired code");

    // check already verified
    if (user.verified) {
      throw new Error("Invalid or expired code");
    }

    // expiry compare using getTime()
    if (!user.verificationCodeValidation || user.verificationCodeValidation.getTime() < Date.now()) {
      throw new Error("Invalid or expired code");
    }

    const isMatch = await bcrypt.compare(code, user.verificationCode);
    if (!isMatch) throw new Error("Invalid or expired code");

    user.verified = true;
    user.verificationCode = null;
    user.verificationCodeValidation = null;
    user.lastVerificationSentAt = null;

    // create tokens
    const accessToken = signAccessToken(user);
    const refreshToken = await createAndStoreRefreshToken(user, ip, userAgent);

    // audit
    user.authLogs.push({ action: "verify", success: true, ip, userAgent });
    await user.save();
    logger.info(`Email verified for user: ${email}`);
    return { accessToken, refreshToken };
  } catch (err) {
    logger.error(`Invalid verification attempt for ${email}: ${err.message}`);
    throw err;

  }

};

/* ---------------- resendVerificationCode ---------------- */
export const resendVerificationCode = async (email, password, ip = null, userAgent = null) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash +lastVerificationSentAt +verified");

    if (!user || user.verified) {
      // generic
      throw new Error("Invalid request");
    }

    if (!user.passwordHash) throw new Error("Invalid request");

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new Error("Invalid request");

    // rate-limit per user using lastVerificationSentAt
    if (user.lastVerificationSentAt && user.lastVerificationSentAt.getTime() > Date.now() - 60 * 1000) {
      throw new Error("Please wait a bit before requesting again");
    }

    const rawCode = crypto.randomInt(100000, 1000000).toString();
    const hashedCode = await bcrypt.hash(rawCode, BCRYPT_ROUNDS);
    user.verificationCode = hashedCode;
    user.verificationCodeValidation = new Date(Date.now() + 10 * 60 * 1000);
    user.lastVerificationSentAt = new Date();

    // audit
    user.authLogs.push({ action: "resend_code", success: true, ip, userAgent });
    await user.save();

    const verificationEmail = buildVerificationEmail({
      username: user.username,
      code: rawCode,
      expiresInMinutes: 10,
    });
    await sendEmail(user.email, "Your new MonlyKing verification code", verificationEmail);
    logger.info(`Verification code resent to: ${email}`);
    return { message: "Verification code resent successfully" };
  } catch (err) {
    logger.error(`Resend verification failed for ${email}: ${err.message}`);
    throw err;

  }

};

/* ---------------- login ---------------- */
export const login = async (email, password, ip = null, userAgent = null) => {
  const startTime = Date.now();

  try {
    // Single optimized DB query - always need passwordHash for login
    const user = await User.findOne({ email }).select("+passwordHash +verified +refreshTokens +failedLoginAttempts +lockUntil");

    if (!user || !user.verified || !user.passwordHash) {
      throw new Error("Invalid credentials");
    }

    // ✅ SECURITY: Enforce account lockout after too many failed attempts
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      throw new Error(`Account is temporarily locked. Try again in ${remainingMinutes} minutes.`);
    }

    // If lock has expired, reset the counter
    if (user.lockUntil && user.lockUntil <= new Date()) {
      await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0, lockUntil: null } });
      user.failedLoginAttempts = 0;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData = {
        $inc: { failedLoginAttempts: 1 },
        $push: { authLogs: { $each: [{ action: "login", success: false, ip, userAgent, createdAt: new Date() }], $slice: -50 } }
      };

      // Lock account if max attempts reached
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.$set = { lockUntil: new Date(Date.now() + LOCK_DURATION_MS) };
        logger.warn(`🔒 Account locked for ${user.email} after ${newFailedAttempts} failed attempts`);
      }

      // Lightweight failed attempt update
      await User.updateOne({ _id: user._id }, updateData);
      throw new Error("Invalid credentials");
    }

    // Successful login: generate tokens
    const accessToken = signAccessToken(user);
    const refreshTokenString = generateRefreshTokenString();
    const expiresAt = dayjs().add(REFRESH_DAYS, "day").toDate();

    // Single atomic DB update: reset counters + push refresh token + push audit log
    await User.updateOne(
      { _id: user._id },
      {
        $set: { failedLoginAttempts: 0, lockUntil: null },
        $push: {
          refreshTokens: { token: refreshTokenString, expiresAt, ip, userAgent },
          authLogs: { $each: [{ action: "login", success: true, ip, userAgent, createdAt: new Date() }], $slice: -50 }
        }
      }
    );

    // Fire-and-forget: cache session + user data in parallel (don't await)
    const cacheOps = [
      cacheService.cacheSession(user._id, { accessToken, refreshToken: refreshTokenString, loginTime: new Date(), ip, userAgent }),
      cacheService.cacheUser(user)
    ];
    Promise.allSettled(cacheOps).catch(() => { }); // Non-blocking

    const totalTime = Date.now() - startTime;
    logger.info(`✅ [LOGIN] ${email} (${totalTime}ms)`);

    Promise.resolve(
      sendEmail(
        user.email,
        "MonlyKing login alert",
        buildLoginAlertEmail({
          username: user.username,
          loginAt: new Date(),
          ip,
          userAgent,
        })
      )
    ).catch((emailErr) => {
      logger.warn(`⚠️ Login alert email failed for ${user.email}: ${emailErr.message}`);
    });

    return { accessToken, refreshToken: refreshTokenString };
  } catch (err) {
    const totalTime = Date.now() - startTime;
    if (err.message !== "Invalid credentials") {
      logger.error(`❌ [LOGIN ERROR] ${email}: ${err.message} (${totalTime}ms)`);
    }
    throw err;
  }
};

/* ---------------- refreshTokens (rotation) ---------------- */
export const refreshTokens = async (refreshToken, ip = null, userAgent = null) => {
  try {// find user containing this refresh token
    const user = await User.findOne({ "refreshTokens.token": refreshToken }).select("+refreshTokens");

    if (!user) throw new Error("Invalid token");

    const rtObj = user.refreshTokens.find(r => r.token === refreshToken);

    if (!isRefreshTokenValid(rtObj)) {
      // audit
      user.authLogs.push({ action: "refresh", success: false, ip, userAgent });
      await user.save();
      throw new Error("Invalid token");
    }

    // rotate: create new refresh token, mark old as revoked and set replacedByToken
    const newRefreshToken = generateRefreshTokenString();
    const expiresAt = dayjs().add(REFRESH_DAYS, "day").toDate();

    // mark old
    rtObj.revoked = true;
    rtObj.revokedAt = new Date();
    rtObj.replacedByToken = newRefreshToken;

    // push new
    user.refreshTokens.push({
      token: newRefreshToken,
      expiresAt,
      ip,
      userAgent
    });

    // audit
    user.authLogs.push({ action: "refresh", success: true, ip, userAgent });
    await user.save();
    logger.info(`Refresh token rotated for user: ${user.email}`);
    const accessToken = signAccessToken(user);
    return { accessToken, refreshToken: newRefreshToken };
  } catch (err) {
    // Detect possible reuse: if rtObj existed but invalid (expired or revoked) and token matches a revoked token without replacedByToken, treat as reuse
    try {
      const suspectUser = await User.findOne({ "refreshTokens.token": refreshToken }).select("+refreshTokens +email");
      const suspectRt = suspectUser?.refreshTokens.find(r => r.token === refreshToken);
      if (suspectRt && suspectRt.revoked && suspectRt.replacedByToken && suspectRt.replacedByToken !== null) {
        // normal rotation path, ignore
      } else if (suspectRt && suspectRt.revoked && !suspectRt.replacedByToken) {
        // token was revoked earlier but seen again -> possible reuse. Revoke all tokens for this user.
        await revokeAllRefreshTokens(suspectUser, "refresh_token_reuse_detected");
        logger.warn(`Refresh token reuse detected for user: ${suspectUser.email}`);
      }
    } catch (innerErr) {
      // ignore helper probe errors
    }
    logger.error(`Invalid refresh token attempt for user: ${user?.email || "unknown"}`);
    throw err;

  }


};

/* ---------------- revokeRefreshToken / logout ---------------- */
export const revokeRefreshTokenForUser = async (refreshToken, ip = null) => {
  const user = await User.findOne({ "refreshTokens.token": refreshToken }).select("+refreshTokens");
  if (!user) return;
  const rtObj = user.refreshTokens.find(r => r.token === refreshToken);
  if (!rtObj) return;
  rtObj.revoked = true;
  rtObj.revokedAt = new Date();
  rtObj.revokedByIp = ip;
  user.authLogs.push({ action: "logout", success: true, ip, userAgent: null });
  await user.save();
  logger.info(`User logged out, refresh token revoked: ${user.email}`);

};

/* ---------------- Forgot Password System ---------------- */

// Generate and send reset token
export const forgotPassword = async (email, ip = null, userAgent = null) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // 🎯 Try cache first
    logger.info(`🔍 [FORGOT PASSWORD] Checking cache for user: ${normalizedEmail}`);
    let cachedUser = await cacheService.getUser(normalizedEmail);
    let user;

    if (cachedUser) {
      logger.info(`⚡ [CACHE HIT] User found in cache: ${normalizedEmail}`);
      // Get user from database for password reset operations
      user = await User.findOne({ email: normalizedEmail }).select("+passwordResetToken +passwordResetExpires +lastPasswordResetSentAt");
    } else {
      logger.info(`📊 [CACHE MISS] User not in cache, querying database: ${normalizedEmail}`);
      user = await User.findOne({ email: normalizedEmail }).select("+passwordResetToken +passwordResetExpires +lastPasswordResetSentAt");

      if (user) {
        // Cache user for future requests
        const userDataForCache = { ...user.toObject() };
        delete userDataForCache.passwordHash; // Security
        delete userDataForCache.passwordResetToken; // Security
        await cacheService.cacheUser(userDataForCache);
      }
    }

    // Generic response to prevent email enumeration
    const genericResponse = { message: "If the email exists, a reset link will be sent" };

    if (!user || !user.verified) {
      logger.warn(`❌ [FORGOT PASSWORD] Invalid user or unverified: ${normalizedEmail}`);
      return genericResponse;
    }

    // Rate limiting - only allow one reset request per 5 minutes per user
    if (user.lastPasswordResetSentAt && user.lastPasswordResetSentAt.getTime() > Date.now() - 5 * 60 * 1000) {
      logger.warn(`⚠️ [RATE LIMIT] Password reset rate limited for: ${normalizedEmail}`);
      return genericResponse; // Don't reveal rate limiting to prevent abuse
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = await bcrypt.hash(resetToken, BCRYPT_ROUNDS);

    // Set token and expiry (15 minutes)
    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    user.lastPasswordResetSentAt = new Date();

    // Cache the reset token temporarily (for faster verification)
    await cacheService.cachePasswordResetToken(user._id, resetToken);

    // Audit log
    user.authLogs.push({ action: "forgot_password", success: true, ip, userAgent });
    await user.save();

    // Send email with reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;
    const emailContent = buildEmailLayout({
      title: "Password Reset Request",
      subtitle: "Reset your MonlyKing password",
      contentHtml: `
        <p style="margin:0 0 12px;font-size:15px;color:#d1d5db;">You requested a password reset for your account.</p>
        <p style="margin:0 0 16px;font-size:15px;color:#d1d5db;">Use the secure button below to set a new password:</p>
        <p style="margin:0 0 16px;">
          <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:10px 18px;text-decoration:none;border-radius:8px;font-weight:700;">Reset Password</a>
        </p>
        <p style="margin:0 0 10px;font-size:13px;color:#9ca3af;">This link expires in 15 minutes.</p>
        <p style="margin:0;font-size:13px;color:#94a3b8;">If you did not request this, please ignore this email.</p>
      `,
    });

    await sendEmail(user.email, "Password Reset Request", emailContent);

    logger.info(`✅ [FORGOT PASSWORD] Reset token sent to: ${normalizedEmail}`);
    return genericResponse;

  } catch (err) {
    logger.error(`❌ [FORGOT PASSWORD ERROR] ${email}: ${err.message}`);
    throw new Error("Unable to process password reset request");
  }
};

// Verify reset token
export const verifyResetToken = async (email, token) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    logger.info(`🔍 [VERIFY RESET TOKEN] Checking token for: ${normalizedEmail}`);

    // Check cache first for faster verification
    const cachedToken = await cacheService.getPasswordResetToken(normalizedEmail);
    let isValidToken = false;

    if (cachedToken && cachedToken === token) {
      logger.info(`⚡ [CACHE HIT] Reset token found in cache: ${normalizedEmail}`);
      isValidToken = true;
    }

    // Always verify against database for security
    const user = await User.findOne({ email: normalizedEmail }).select("+passwordResetToken +passwordResetExpires");

    if (!user || !user.passwordResetToken || !user.passwordResetExpires) {
      logger.warn(`❌ [INVALID TOKEN] No reset token found for: ${normalizedEmail}`);
      throw new Error("Invalid or expired reset token");
    }

    // Check expiry
    if (user.passwordResetExpires.getTime() < Date.now()) {
      logger.warn(`⏰ [EXPIRED TOKEN] Reset token expired for: ${normalizedEmail}`);
      // Clean up expired token
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();
      await cacheService.removePasswordResetToken(user._id);
      throw new Error("Invalid or expired reset token");
    }

    // Verify token hash
    const isMatch = await bcrypt.compare(token, user.passwordResetToken);
    if (!isMatch) {
      logger.warn(`❌ [INVALID TOKEN] Token hash mismatch for: ${normalizedEmail}`);
      throw new Error("Invalid or expired reset token");
    }

    logger.info(`✅ [VALID TOKEN] Reset token verified for: ${normalizedEmail}`);
    return { valid: true, userId: user._id };

  } catch (err) {
    logger.error(`❌ [VERIFY TOKEN ERROR] ${email}: ${err.message}`);
    throw err;
  }
};

// Reset password with token
export const resetPassword = async (email, token, newPassword, ip = null, userAgent = null) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    logger.info(`🔄 [RESET PASSWORD] Processing for: ${normalizedEmail}`);

    // First verify the token
    const tokenVerification = await verifyResetToken(normalizedEmail, token);
    if (!tokenVerification.valid) {
      throw new Error("Invalid or expired reset token");
    }

    // Get user with full data
    const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash +passwordResetToken +passwordResetExpires +refreshTokens");

    if (!user) {
      throw new Error("User not found");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password and clear reset token
    user.passwordHash = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.lastPasswordResetSentAt = null;

    // Clear account lock (if any)
    user.lockUntil = null;
    user.failedLoginAttempts = 0;

    // Revoke all existing refresh tokens for security
    await revokeAllRefreshTokens(user, "password_reset");

    // Clear user from cache (password changed, need fresh data)
    await cacheService.invalidateUser(user._id);
    await cacheService.removePasswordResetToken(user._id);

    // Audit log
    user.authLogs.push({ action: "reset_password", success: true, ip, userAgent });
    await user.save();

    // Send confirmation email
    const confirmationContent = buildEmailLayout({
      title: "Password Reset Successful",
      subtitle: "Your account credentials were updated",
      contentHtml: `
        <p style="margin:0 0 12px;font-size:15px;color:#d1d5db;">Your password has been successfully reset.</p>
        <p style="margin:0 0 12px;font-size:14px;color:#9ca3af;">For your security, all active sessions were logged out.</p>
        <p style="margin:0;font-size:14px;color:#cbd5e1;">If you did not make this change, contact support immediately.</p>
      `,
    });

    await sendEmail(user.email, "Password Reset Successful", confirmationContent);

    logger.info(`✅ [PASSWORD RESET] Successful password reset for: ${normalizedEmail}`);
    return { message: "Password reset successful" };

  } catch (err) {
    logger.error(`❌ [RESET PASSWORD ERROR] ${email}: ${err.message}`);
    throw err;
  }
};
