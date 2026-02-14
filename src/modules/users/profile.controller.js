import User from "./user.model.js";
import Listing from "../listings/listing.model.js";
import Favorite from "../favorites/favorite.model.js";
import cacheSyncService from '../../services/cacheSyncService.js';

// Get user profile with stats
export const getProfile = async (req, res) => {
    try {
        const userId = req.params.userId || req.user._id;

        // Check permissions
        if (userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const userFromCache = await cacheSyncService.getUserWithSync(userId);

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
        if (avatar !== undefined) updates.avatar = avatar;
        if (bio !== undefined) updates.bio = bio;

        const updatedUser = await cacheSyncService.updateUserWithSync(
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

        const updatedUser = await cacheSyncService.updateUserWithSync(
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
