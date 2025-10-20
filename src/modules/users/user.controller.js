
import * as userService from "./user.service.js";
import enhancedCacheService from "../../services/enhancedCacheService.js";

export const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "admin" && req.user._id.toString() !== id) {
      return res.status(403).json({ message: "Forbidden: You can only view your own data" });
    }

    // Try cache first (middleware may have populated req.cachedUser)
    if (req.cachedUser) {
      return res.json({
        success: true,
        data: req.cachedUser,
        cached: true
      });
    }

    // Fallback to Read-Through cache (will populate cache automatically)
    const user = await enhancedCacheService.getUser(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      success: true,
      data: user,
      cached: false
    });
  } catch (err) {
    next(err);
  }
};


export const updateUser = async (req, res, next) => {
  try {
    if (req.body.role !== undefined) {
      return res.status(403).json({
        message: "Forbidden: Role can only be changed by system administrators directly in the database"
      });
    }

    if (req.user.role !== "admin" && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        message: "Forbidden: You can only update your own data"
      });
    }

    // Use Write-Through: updates DB first, then cache
    const user = await enhancedCacheService.updateUser(req.params.id, req.body);

    res.json({
      success: true,
      data: user,
      message: "User updated successfully (DB + Cache)"
    });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    // Delete from DB and cache
    await enhancedCacheService.deleteUser(req.params.id);
    res.json({
      success: true,
      message: "User deleted (DB + Cache)"
    });
  } catch (err) {
    next(err);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters"
      });
    }

    const users = await userService.searchUsers(q.trim(), req.user._id);

    res.json({
      success: true,
      data: users,
      message: `Found ${users.length} user(s)`
    });
  } catch (err) {
    next(err);
  }
};
