import express from "express";
import * as userController from "./user.controller.js";
import * as profileController from "./profile.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import { cacheUser, invalidateUserCache, trackActivity } from "../../middlewares/cacheMiddleware.js";

const router = express.Router();

// Profile routes
router.get("/profile", authMiddleware, profileController.getProfile);
router.get("/profile/:userId", authMiddleware, profileController.getProfile);
router.put("/profile", authMiddleware, profileController.updateProfile);

// Favorites routes
router.post("/favorites", authMiddleware, profileController.addToFavorites);
router.delete("/favorites/:listingId", authMiddleware, profileController.removeFromFavorites);

// Search users (must be authenticated)
router.get("/search", authMiddleware, trackActivity, userController.searchUsers);

// Get user - use cache first (Read-Through)
router.get("/:id", authMiddleware, trackActivity, cacheUser, userController.getUser);

// Update user - invalidate cache after (Write-Through)
router.put("/:id", authMiddleware, trackActivity, invalidateUserCache, userController.updateUser);

// Delete user - invalidate cache after
router.delete("/:id", authMiddleware, roleMiddleware("admin"), invalidateUserCache, userController.deleteUser);

export default router;
