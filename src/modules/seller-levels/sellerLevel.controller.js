import LevelConfig from "./levelConfig.model.js";
import {
  getLevelProgress,
  updateSellerLevel,
  recalculateAllLevels,
  setSellerLevelOverride,
  removeSellerLevelOverride,
  getLevelsTable,
  getLevelStats,
  getAllSellersWithLevels,
} from "./sellerLevel.service.js";
import logger from "../../utils/logger.js";

// ─── Admin: GET /api/v1/admin/seller-levels ──────────────────────────────────
// List all sellers with level info (paginated)
export const listSellersWithLevels = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", rank = "" } = req.query;
    const result = await getAllSellersWithLevels({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      rank,
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    logger.error(`[SellerLevels] listSellers error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Admin: PUT /api/v1/admin/seller-levels/:userId ──────────────────────────
// Manually set a seller's level
export const setSellerLevel = async (req, res) => {
  try {
    const { userId } = req.params;
    const { level } = req.body;
    if (!level || typeof level !== "number" || level < 1) {
      return res.status(400).json({ success: false, message: "Valid level (1+) is required" });
    }
    const result = await setSellerLevelOverride(userId, level, req.user._id);
    return res.json({ success: true, data: result, message: `Level set to ${level}` });
  } catch (err) {
    logger.error(`[SellerLevels] setLevel error: ${err.message}`);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ─── Admin: DELETE /api/v1/admin/seller-levels/:userId/override ──────────────
// Remove manual override, revert to auto-calculation
export const removeOverride = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await removeSellerLevelOverride(userId);
    return res.json({ success: true, data: result, message: "Override removed" });
  } catch (err) {
    logger.error(`[SellerLevels] removeOverride error: ${err.message}`);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ─── Admin: GET /api/v1/admin/seller-levels/config ───────────────────────────
// Get current level configuration
export const getConfig = async (req, res) => {
  try {
    const config = await LevelConfig.getConfig();
    return res.json({ success: true, data: config });
  } catch (err) {
    logger.error(`[SellerLevels] getConfig error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Admin: PUT /api/v1/admin/seller-levels/config ───────────────────────────
// Update level configuration (formula, ranks, etc.)
export const updateConfig = async (req, res) => {
  try {
    const { multiplier, exponent, ranks, maxLevel } = req.body;
    const config = await LevelConfig.getConfig();

    if (multiplier !== undefined) config.multiplier = multiplier;
    if (exponent !== undefined) config.exponent = exponent;
    if (maxLevel !== undefined) config.maxLevel = maxLevel;
    if (ranks !== undefined) config.ranks = ranks;
    config.updatedBy = req.user._id;

    await config.save();
    return res.json({ success: true, data: config, message: "Configuration updated" });
  } catch (err) {
    logger.error(`[SellerLevels] updateConfig error: ${err.message}`);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ─── Admin: POST /api/v1/admin/seller-levels/recalculate ─────────────────────
// Recalculate all seller levels from scratch
export const recalculate = async (req, res) => {
  try {
    const result = await recalculateAllLevels();
    return res.json({
      success: true,
      data: result,
      message: `Recalculated: ${result.updated}/${result.total} sellers updated`,
    });
  } catch (err) {
    logger.error(`[SellerLevels] recalculate error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Admin: GET /api/v1/admin/seller-levels/stats ────────────────────────────
// Get level distribution statistics
export const getStats = async (req, res) => {
  try {
    const stats = await getLevelStats();
    return res.json({ success: true, data: stats });
  } catch (err) {
    logger.error(`[SellerLevels] getStats error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Admin: GET /api/v1/admin/seller-levels/table ────────────────────────────
// Get levels table for display
export const getTable = async (req, res) => {
  try {
    const { from = 1, to = 100 } = req.query;
    const result = await getLevelsTable(parseInt(from), parseInt(to));
    return res.json({ success: true, data: result });
  } catch (err) {
    logger.error(`[SellerLevels] getTable error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Seller: GET /api/v1/seller/level-progress ──────────────────────────────
// Get current seller's level progress
export const getMyLevelProgress = async (req, res) => {
  try {
    const progress = await getLevelProgress(req.user._id);
    return res.json({ success: true, data: progress });
  } catch (err) {
    logger.error(`[SellerLevels] getMyProgress error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Public: GET /api/v1/seller/levels-table ────────────────────────────────
// Get levels table (any user can see)
export const getPublicLevelsTable = async (req, res) => {
  try {
    const { from = 1, to = 500 } = req.query;
    const result = await getLevelsTable(parseInt(from), parseInt(to));
    return res.json({ success: true, data: result });
  } catch (err) {
    logger.error(`[SellerLevels] publicTable error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
