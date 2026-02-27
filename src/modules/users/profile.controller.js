import User from "./user.model.js";
import Listing from "../listings/listing.model.js";
import Favorite from "../favorites/favorite.model.js";
import cacheService from '../../services/cacheService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to save base64 image
const saveBase64Image = (base64String, userId) => {
    try {
        console.log('🖼️ [saveBase64Image] Called with userId:', userId);
        console.log('🖼️ [saveBase64Image] Base64 string length:', base64String ? base64String.length : 0);
        console.log('🖼️ [saveBase64Image] Starts with data:image:', base64String?.startsWith('data:image/'));

        // Check if it's a base64 string
        if (!base64String || !base64String.startsWith('data:image/')) {
            console.log('❌ [saveBase64Image] Invalid base64 string');
            return null;
        }

        // Extract image data
        const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            console.log('❌ [saveBase64Image] Regex match failed');
            return null;
        }

        const ext = matches[1];
        const data = matches[2];
        const buffer = Buffer.from(data, 'base64');

        // Create unique filename
        const filename = `avatar-${userId}-${Date.now()}.${ext}`;
        const uploadsDir = path.join(__dirname, '../../../uploads/avatars');

        console.log('📁 [saveBase64Image] Upload dir:', uploadsDir);

        // Ensure directory exists
        if (!fs.existsSync(uploadsDir)) {
            console.log('📁 [saveBase64Image] Creating directory...');
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, buffer);

        console.log('✅ [saveBase64Image] File saved:', filepath);

        const avatarPath = `/uploads/avatars/${filename}`;
        console.log('✅ [saveBase64Image] Returning path:', avatarPath);

        return avatarPath;
    } catch (error) {
        console.error('❌ [saveBase64Image] Error:', error);
        return null;
    }
};

// Get user profile with stats
export const getProfile = async (req, res) => {
    try {
        const userId = req.params.userId || req.user._id;

        // Check permissions
        if (userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const userFromCache = await cacheService.getUser(userId);

        const [user, myListings, favorites, totalSales] = await Promise.all([
            userFromCache || User.findById(userId)
                .select("-passwordHash -verificationCode -verificationCodeValidation -forgotPasswordCode -forgotPasswordCodeValidation -passwordResetToken -passwordResetExpires -refreshTokens -failedLoginAttempts -lockUntil -authLogs -twoFA.secret")
                .lean(),
            Listing.find({ seller: userId })
                .select('game status createdAt title price')
                .populate("game", "name icon")
                .sort({ createdAt: -1 })
                .limit(20)
                .lean(),
            Favorite.find({ user: userId })
                .populate({
                    path: "listing",
                    populate: { path: "game", select: "name icon" }
                })
                .sort({ createdAt: -1 })
                .limit(20)
                .lean(),
            Listing.countDocuments({ seller: userId, status: "sold" })
        ]);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    address: user.address,
                    avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
                    bio: user.bio,
                    role: user.role,
                    isSeller: user.isSeller,
                    verified: user.verified,
                    createdAt: user.createdAt,
                    lastUsernameChange: user.lastUsernameChange,
                    lastPhoneChange: user.lastPhoneChange,
                    stats: {
                        ...user.stats,
                        totalPurchases: 0,
                        totalSales,
                        rating: 4.5
                    },
                    wallet: user.wallet,
                    isOnline: user.isOnline,
                    lastSeenAt: user.lastSeenAt
                },
                myListings: user.isSeller ? myListings : [],
                favorites: favorites.filter(f => f.listing).map(f => f.listing)
            }
        });
    } catch (error) {
        console.error("Get profile error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// Update user profile
export const updateProfile = async (req, res) => {
    try {
        console.log('🔧 [updateProfile] Called - User:', req.user?._id);
        console.log('🔧 [updateProfile] Body keys:', Object.keys(req.body));

        const userId = req.user._id;
        const { fullName, username, phone, address, avatar, bio } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const updates = {};

        // Full Name - can be updated anytime
        if (fullName !== undefined) updates.fullName = fullName;

        // Username - can change every 20 days
        if (username && username !== user.username) {
            const daysSinceLastChange = user.lastUsernameChange
                ? (Date.now() - user.lastUsernameChange.getTime()) / (1000 * 60 * 60 * 24)
                : 999; // Allow if never changed

            if (daysSinceLastChange < 20) {
                const daysRemaining = Math.ceil(20 - daysSinceLastChange);
                return res.status(400).json({
                    message: `You can change username in ${daysRemaining} days`,
                    field: "username",
                    daysRemaining
                });
            }

            // Check if username is taken
            const existingUser = await User.findOne({ username: username.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({ message: "Username already taken", field: "username" });
            }

            updates.username = username.toLowerCase();
            updates.lastUsernameChange = new Date();
        }

        // Phone - can change every 20 days
        if (phone !== undefined && phone !== user.phone) {
            const daysSinceLastChange = user.lastPhoneChange
                ? (Date.now() - user.lastPhoneChange.getTime()) / (1000 * 60 * 60 * 24)
                : 999;

            if (daysSinceLastChange < 20) {
                const daysRemaining = Math.ceil(20 - daysSinceLastChange);
                return res.status(400).json({
                    message: `You can change phone in ${daysRemaining} days`,
                    field: "phone",
                    daysRemaining
                });
            }

            updates.phone = phone;
            updates.lastPhoneChange = new Date();
        }

        // Other fields can be updated freely
        if (address !== undefined) updates.address = address;
        if (bio !== undefined) updates.bio = bio;

        // Handle avatar - convert base64 to file if needed
        if (avatar !== undefined) {
            console.log('🎨 [updateProfile] Avatar received, type:', typeof avatar, 'length:', avatar?.length);
            console.log('🎨 [updateProfile] Avatar starts with data:image/:', avatar?.startsWith('data:image/'));

            if (avatar.startsWith('data:image/')) {
                // Base64 image - save it
                console.log('🎨 [updateProfile] Converting base64 to file...');
                const avatarPath = saveBase64Image(avatar, userId);

                if (avatarPath) {
                    console.log('✅ [updateProfile] Avatar saved, setting path:', avatarPath);
                    updates.avatar = avatarPath;

                    // Delete old avatar if exists
                    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
                        const oldPath = path.join(__dirname, '../../../', user.avatar);
                        if (fs.existsSync(oldPath)) {
                            fs.unlinkSync(oldPath);
                        }
                    }
                }
            } else if (avatar.startsWith('/uploads/') || avatar.startsWith('http')) {
                // Already a valid URL - keep it
                updates.avatar = avatar;
            }
        }

        const updatedUser = await cacheService.updateUserWithSync(
            userId,
            { $set: updates }
        );

        return res.json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser
        });
    } catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// Add to favorites
export const addToFavorites = async (req, res) => {
    try {
        const { listingId } = req.body;
        const userId = req.user._id;

        const listing = await Listing.findById(listingId);
        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }

        // Check if already favorited
        const existing = await Favorite.findOne({ user: userId, listing: listingId });
        if (existing) {
            return res.status(400).json({ message: "Already in favorites" });
        }

        const favorite = await Favorite.create({ user: userId, listing: listingId });

        return res.json({
            success: true,
            message: "Added to favorites",
            data: favorite
        });
    } catch (error) {
        console.error("Add to favorites error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// Remove from favorites
export const removeFromFavorites = async (req, res) => {
    try {
        const { listingId } = req.params;
        const userId = req.user._id;

        const result = await Favorite.deleteOne({ user: userId, listing: listingId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Favorite not found" });
        }

        return res.json({
            success: true,
            message: "Removed from favorites"
        });
    } catch (error) {
        console.error("Remove from favorites error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// Complete user profile (first-time setup after verification)
export const completeProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { fullName, phone, address, bio } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if profile is already completed
        if (user.profileCompleted) {
            return res.status(400).json({
                message: "Profile already completed. Use update profile instead."
            });
        }

        const updates = {
            profileCompleted: true
        };

        // Full Name is required for profile completion
        if (!fullName || fullName.trim().length === 0) {
            return res.status(400).json({
                message: "Full name is required",
                field: "fullName"
            });
        }
        updates.fullName = fullName.trim();

        // Phone is required
        if (!phone || phone.trim().length === 0) {
            return res.status(400).json({
                message: "Phone number is required",
                field: "phone"
            });
        }
        updates.phone = phone.trim();

        // Address is required
        if (!address || address.trim().length === 0) {
            return res.status(400).json({
                message: "Address is required",
                field: "address"
            });
        }
        updates.address = address.trim();

        // Bio is optional
        if (bio) updates.bio = bio;

        // Handle avatar upload if file is present
        if (req.file) {
            // Save the file path as avatar URL
            const avatarUrl = `/uploads/${req.file.filename}`;
            updates.avatar = avatarUrl;
        }

        const updatedUser = await cacheService.updateUserWithSync(
            userId,
            { $set: updates }
        );

        return res.json({
            success: true,
            message: "Profile completed successfully",
            data: updatedUser
        });
    } catch (error) {
        console.error("Complete profile error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
