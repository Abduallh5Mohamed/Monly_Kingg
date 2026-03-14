import LevelConfig from "./levelConfig.model.js";
import User from "../users/user.model.js";
import Notification from "../notifications/notification.model.js";
import logger from "../../utils/logger.js";

// ─── Level Calculation Functions ──────────────────────────────────────────────

/**
 * Calculate sales required to advance FROM a given level to the next one.
 * Formula: multiplier * level^exponent
 * Default: 40 * level^1.3  (EGP)
 */
export function calculateSalesToNext(level, config) {
  return Math.floor(config.multiplier * Math.pow(level, config.exponent));
}

/**
 * Calculate cumulative total sales required to REACH a target level.
 * Sum of salesToNext(1) + salesToNext(2) + ... + salesToNext(targetLevel - 1)
 */
export function calculateTotalRequired(targetLevel, config) {
  let total = 0;
  for (let lv = 1; lv < targetLevel; lv++) {
    total += calculateSalesToNext(lv, config);
  }
  return total;
}

/**
 * Determine the current level from total cumulative sales.
 * Uses iterative approach for accuracy.
 */
export function calculateLevelFromSales(totalSales, config) {
  let cumulative = 0;
  let level = 1;
  const maxLevel = config.maxLevel || 500;

  while (level < maxLevel) {
    const needed = calculateSalesToNext(level, config);
    if (cumulative + needed > totalSales) break;
    cumulative += needed;
    level++;
  }

  return { level, cumulativeSalesAtLevel: cumulative };
}

/**
 * Get the rank info for a given level.
 */
export function getRankForLevel(level, config) {
  const ranks = config.ranks || [];
  for (const rank of ranks) {
    if (level >= rank.minLevel && level <= rank.maxLevel) {
      return { name: rank.name, color: rank.color, icon: rank.icon, commissionPercent: rank.commissionPercent ?? null };
    }
  }
  // Fallback — above max rank
  if (ranks.length > 0) {
    const lastRank = ranks[ranks.length - 1];
    return { name: lastRank.name, color: lastRank.color, icon: lastRank.icon, commissionPercent: lastRank.commissionPercent ?? null };
  }
  return { name: "Starter", color: "#9CA3AF", icon: "🌱", commissionPercent: null };
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Get level progress for a seller.
 */
export async function getLevelProgress(userId) {
  const config = await LevelConfig.getConfig();
  const user = await User.findById(userId).select("stats isSeller username avatar");
  if (!user) throw new Error("User not found");

  const totalVolume = user.stats?.totalVolume || 0;
  const currentLevel = user.stats?.levelOverride || user.stats?.level || 1;

  // Calculate what level they SHOULD be based on sales
  const calculated = calculateLevelFromSales(totalVolume, config);
  const effectiveLevel = user.stats?.levelOverride || calculated.level;

  // Progress to next level
  const salesToReachCurrent = calculateTotalRequired(effectiveLevel, config);
  const salesToReachNext = calculateTotalRequired(effectiveLevel + 1, config);
  const salesForThisLevel = salesToReachNext - salesToReachCurrent;
  const salesProgressInLevel = totalVolume - salesToReachCurrent;
  const progressPercent = salesForThisLevel > 0
    ? Math.min(100, Math.max(0, Math.floor((salesProgressInLevel / salesForThisLevel) * 100)))
    : 0;
  const remaining = Math.max(0, salesToReachNext - totalVolume);

  const rank = getRankForLevel(effectiveLevel, config);

  return {
    userId: user._id,
    username: user.username,
    avatar: user.avatar,
    currentLevel: effectiveLevel,
    isOverridden: !!user.stats?.levelOverride,
    totalVolume,
    successfulTrades: user.stats?.successfulTrades || 0,
    rank,
    progress: {
      percent: progressPercent,
      currentLevelSales: salesProgressInLevel,
      requiredForNext: salesForThisLevel,
      remaining,
    },
    maxLevel: config.maxLevel,
    currency: config.currency,
  };
}

/**
 * Update a seller's level after a sale.
 * Returns true if level changed.
 */
export async function updateSellerLevel(userId) {
  try {
    const config = await LevelConfig.getConfig();
    const user = await User.findById(userId).select("stats isSeller username");
    if (!user || !user.isSeller) return false;

    // If admin has manually overridden, skip auto-calculation
    if (user.stats?.levelOverride) return false;

    const totalVolume = user.stats?.totalVolume || 0;
    const currentLevel = user.stats?.level || 1;
    const { level: newLevel } = calculateLevelFromSales(totalVolume, config);

    if (newLevel !== currentLevel) {
      const rank = getRankForLevel(newLevel, config);
      await User.findByIdAndUpdate(userId, {
        "stats.level": newLevel,
        "stats.rank": rank.name,
      });

      // Only notify on level UP
      if (newLevel > currentLevel) {
        try {
          await Notification.create({
            user: userId,
            type: "level_up",
            title: `🎉 You reached Level ${newLevel}!`,
            message: `Congratulations! You reached Level ${newLevel} (${rank.icon} ${rank.name}). Keep selling to reach the next level!`,
            relatedModel: "User",
            relatedId: userId,
            metadata: { newLevel, rank: rank.name, totalVolume },
          });
        } catch (notifErr) {
          logger.error(`[SellerLevel] notification error: ${notifErr.message}`);
        }
      }

      logger.info(`[SellerLevel] User ${userId} level: ${currentLevel} → ${newLevel} (${rank.name})`);
      return true;
    }
    return false;
  } catch (err) {
    logger.error(`[SellerLevel] updateSellerLevel error: ${err.message}`);
    return false;
  }
}

/**
 * Recalculate levels for ALL sellers based on current totalVolume.
 */
export async function recalculateAllLevels() {
  const config = await LevelConfig.getConfig();
  const sellers = await User.find({ isSeller: true }).select("stats");

  let updated = 0;
  const bulkOps = [];

  for (const seller of sellers) {
    if (seller.stats?.levelOverride) continue; // Skip manual overrides

    const totalVolume = seller.stats?.totalVolume || 0;
    const { level } = calculateLevelFromSales(totalVolume, config);
    const rank = getRankForLevel(level, config);

    if (level !== (seller.stats?.level || 1) || rank.name !== seller.stats?.rank) {
      bulkOps.push({
        updateOne: {
          filter: { _id: seller._id },
          update: { "stats.level": level, "stats.rank": rank.name },
        },
      });
      updated++;
    }
  }

  if (bulkOps.length > 0) {
    await User.bulkWrite(bulkOps);
  }

  logger.info(`[SellerLevel] Recalculated all levels: ${updated}/${sellers.length} sellers updated`);
  return { total: sellers.length, updated };
}

/**
 * Admin: manually set a seller's level.
 */
export async function setSellerLevelOverride(userId, level, adminId) {
  const config = await LevelConfig.getConfig();
  const maxLevel = config.maxLevel || 500;
  if (level < 1 || level > maxLevel) {
    throw new Error(`Level must be between 1 and ${maxLevel}`);
  }

  const rank = getRankForLevel(level, config);
  const result = await User.findByIdAndUpdate(userId, {
    "stats.level": level,
    "stats.levelOverride": level,
    "stats.rank": rank.name,
  }, { new: true });

  if (!result) throw new Error("User not found");

  logger.info(`[SellerLevel] Admin ${adminId} set user ${userId} to level ${level} (${rank.name})`);
  return { level, rank: rank.name };
}

/**
 * Admin: remove level override (revert to auto-calculation).
 */
export async function removeSellerLevelOverride(userId) {
  const config = await LevelConfig.getConfig();
  const user = await User.findById(userId).select("stats");
  if (!user) throw new Error("User not found");

  const totalVolume = user.stats?.totalVolume || 0;
  const { level } = calculateLevelFromSales(totalVolume, config);
  const rank = getRankForLevel(level, config);

  await User.findByIdAndUpdate(userId, {
    "stats.level": level,
    "stats.rank": rank.name,
    $unset: { "stats.levelOverride": 1 },
  });

  return { level, rank: rank.name };
}

/**
 * Generate a levels table (for display purposes).
 */
export async function getLevelsTable(fromLevel = 1, toLevel = 100) {
  const config = await LevelConfig.getConfig();
  const maxLevel = config.maxLevel || 500;
  const end = Math.min(toLevel, maxLevel);
  const table = [];
  let cumulative = 0;

  // Calculate cumulative up to fromLevel
  for (let lv = 1; lv < fromLevel; lv++) {
    cumulative += calculateSalesToNext(lv, config);
  }

  for (let lv = fromLevel; lv <= end; lv++) {
    const salesToNext = calculateSalesToNext(lv, config);
    const rank = getRankForLevel(lv, config);
    table.push({
      level: lv,
      salesToNext,
      totalRequired: cumulative,
      rank: rank.name,
      rankColor: rank.color,
      rankIcon: rank.icon,
    });
    cumulative += salesToNext;
  }

  return { table, config: { multiplier: config.multiplier, exponent: config.exponent, currency: config.currency, maxLevel: config.maxLevel } };
}

/**
 * Get seller level statistics (distribution across ranks).
 */
export async function getLevelStats() {
  const config = await LevelConfig.getConfig();

  // Aggregate sellers by rank
  const sellers = await User.find({ isSeller: true }).select("stats.level stats.rank").lean();

  const rankDistribution = {};
  const levelDistribution = {};

  for (const rank of config.ranks) {
    rankDistribution[rank.name] = { count: 0, color: rank.color, icon: rank.icon, minLevel: rank.minLevel, maxLevel: rank.maxLevel };
  }

  for (const seller of sellers) {
    const level = seller.stats?.level || 1;
    const rank = getRankForLevel(level, config);
    if (rankDistribution[rank.name]) {
      rankDistribution[rank.name].count++;
    }

    // Group by level ranges for chart
    const range = Math.floor((level - 1) / 50) * 50 + 1;
    const rangeKey = `${range}-${range + 49}`;
    levelDistribution[rangeKey] = (levelDistribution[rangeKey] || 0) + 1;
  }

  return {
    totalSellers: sellers.length,
    rankDistribution,
    levelDistribution,
    config: { multiplier: config.multiplier, exponent: config.exponent, currency: config.currency },
  };
}

/**
 * Get all sellers with their levels (paginated, searchable).
 */
export async function getAllSellersWithLevels({ page = 1, limit = 20, search = "", rank = "" }) {
  const config = await LevelConfig.getConfig();
  const filter = { isSeller: true };

  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (rank) {
    // Find min/max levels for the rank
    const rankConfig = config.ranks.find(r => r.name === rank);
    if (rankConfig) {
      filter["stats.level"] = { $gte: rankConfig.minLevel, $lte: rankConfig.maxLevel };
    }
  }

  const skip = (page - 1) * limit;

  const [sellers, total] = await Promise.all([
    User.find(filter)
      .select("username email avatar stats isSeller sellerApprovedAt createdAt")
      .sort({ "stats.level": -1, "stats.totalVolume": -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  // Enrich with progress info
  const enriched = sellers.map(seller => {
    const level = seller.stats?.levelOverride || seller.stats?.level || 1;
    const totalVolume = seller.stats?.totalVolume || 0;
    const rankInfo = getRankForLevel(level, config);

    const salesToReachCurrent = calculateTotalRequired(level, config);
    const salesToReachNext = calculateTotalRequired(level + 1, config);
    const salesForThisLevel = salesToReachNext - salesToReachCurrent;
    const salesProgress = totalVolume - salesToReachCurrent;
    const progressPercent = salesForThisLevel > 0
      ? Math.min(100, Math.max(0, Math.floor((salesProgress / salesForThisLevel) * 100)))
      : 0;

    return {
      ...seller,
      levelInfo: {
        level,
        rank: rankInfo,
        isOverridden: !!seller.stats?.levelOverride,
        progressPercent,
        remaining: Math.max(0, salesToReachNext - totalVolume),
      },
    };
  });

  return {
    sellers: enriched,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    ranks: config.ranks,
  };
}
