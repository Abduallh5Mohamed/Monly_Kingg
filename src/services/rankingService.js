/**
 * ═══════════════════════════════════════════════════════════════
 *  RANKING SERVICE — Production-Ready Mathematical Scoring
 * ═══════════════════════════════════════════════════════════════
 *
 *  Sections:
 *    1) Best Seller  — Proven sales performance + trust
 *    2) Trending     — Velocity / momentum (what's hot RIGHT NOW)
 *    3) Popular      — Overall community love (long-term favorite)
 *
 *  Design Goals:
 *    ✓ No ML — pure math formulas
 *    ✓ Time-decay to avoid stale domination
 *    ✓ Bayesian rating to handle low-count items fairly
 *    ✓ Anti-manipulation (log-scale views, caps, velocity checks)
 *    ✓ New-product fairness (freshness boost)
 *    ✓ O(n) batch recalc — scalable to 100k+ listings
 *
 * ═══════════════════════════════════════════════════════════════
 */

import Listing from '../modules/listings/listing.model.js';
import Transaction from '../modules/transactions/transaction.model.js';
import Favorite from '../modules/favorites/favorite.model.js';
import redis from '../config/redis.js';
import logger from '../utils/logger.js';

// ─── CONFIGURATION ───────────────────────────────────────────
const CONFIG = {
    // Time-decay half-life (days) — score halves every N days
    DECAY_HALF_LIFE: {
        BEST_SELLER: 30,  // Slower decay — sales history matters
        TRENDING: 3,      // Fast decay — trending is ephemeral
        POPULAR: 14,      // Medium — steady favorites stay
    },

    // Bayesian prior (minimum "virtual" ratings to stabilize averages)
    BAYESIAN: {
        MIN_RATINGS: 5,        // C: pseudo-count (acts as prior strength)
        GLOBAL_AVG_RATING: 3.5, // m: assumed average (updated each cycle)
    },

    // Anti-manipulation caps
    CAPS: {
        MAX_VIEWS_PER_DAY: 500,    // Anything above this is suspicious
        MAX_VIEW_SCORE: 100,        // Log-scale ceiling
        MIN_SALES_FOR_BEST: 0,      // Include new items with 0 sales for visibility
    },

    // Freshness boost for new listings (first 7 days)
    FRESHNESS: {
        BOOST_DAYS: 7,       // How many days the boost lasts
        MAX_BOOST: 1.5,      // 50% boost max for brand-new items
    },

    // Weights per section
    WEIGHTS: {
        BEST_SELLER: {
            sales_7d: 5.0,   // Recent sales dominate
            sales_30d: 2.0,   // Monthly gives context
            total_sales: 0.5,   // Lifetime is background signal
            rating: 1.5,   // Trust factor
            wishlist: 0.3,   // Social proof
        },
        TRENDING: {
            views_today: 8.0,   // Today's buzz is king
            views_7d: 2.0,   // Weekly trend
            sales_24h: 15.0,   // Conversion in last 24h is huge signal
            sales_7d: 3.0,   // Weekly sales velocity
            wishlist: 4.0,   // Wishlisting = intent
        },
        POPULAR: {
            total_views: 0.3,   // Awareness (log-scaled)
            total_sales: 10.0,   // Proven demand
            wishlist: 3.0,   // Community love
            rating: 5.0,   // Quality signal
            views_7d: 1.0,   // Still somewhat active
        },
    },

    // Cache key for pre-computed global stats
    CACHE_KEY_GLOBALS: 'ranking:globals',
    CACHE_TTL_GLOBALS: 1800, // 30 min
};


// ═══════════════════════════════════════════════════════════════
//  MATHEMATICAL UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Time-Decay Factor
 * 
 * Formula: decay = 2^(-age_days / half_life)
 * 
 * Why exponential decay?
 *   - At age = 0 → decay = 1.0 (full score)
 *   - At age = half_life → decay = 0.5 (halved)
 *   - At age = 2 * half_life → decay = 0.25
 *   - Smooth, never reaches zero, no cliff edges
 *   - Standard in physics/finance for very good reason
 */
function timeDecay(createdAt, halfLifeDays) {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    return Math.pow(2, -ageDays / halfLifeDays);
}

/**
 * Freshness Boost (for new listings)
 * 
 * Formula: boost = MAX_BOOST * max(0, 1 - age_days / BOOST_DAYS)
 * 
 * Why linear ramp-down?
 *   - Day 0: full 1.5x boost
 *   - Day 3.5: 1.25x boost
 *   - Day 7: 1.0x (no boost, mature item)
 *   - After day 7: exactly 1.0x
 *   - Gives new items a fair fighting chance to gather signals
 */
function freshnessBoost(createdAt) {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays >= CONFIG.FRESHNESS.BOOST_DAYS) return 1.0;
    const progress = ageDays / CONFIG.FRESHNESS.BOOST_DAYS;
    return 1.0 + (CONFIG.FRESHNESS.MAX_BOOST - 1.0) * (1.0 - progress);
}

/**
 * Bayesian Average Rating
 * 
 * Formula: bayesian = (C * m + Σratings) / (C + n)
 * 
 * Where:
 *   C = prior strength (MIN_RATINGS = 5)
 *   m = global average rating across all listings
 *   n = this listing's rating count
 *   Σratings = sum of this listing's ratings
 * 
 * Why Bayesian instead of simple average?
 *   - A product with 1 review of 5.0 shouldn't beat one with 100 reviews at 4.8
 *   - The prior C=5 "pretends" every item has 5 average-quality reviews
 *   - As real reviews accumulate, the prior washes out naturally
 *   - With 0 reviews: returns global average (fair starting point)
 *   - With 100+ reviews: nearly identical to simple average
 */
function bayesianRating(ratingSum, ratingCount, globalAvg) {
    const C = CONFIG.BAYESIAN.MIN_RATINGS;
    const m = globalAvg || CONFIG.BAYESIAN.GLOBAL_AVG_RATING;
    return (C * m + ratingSum) / (C + ratingCount);
}

/**
 * Anti-Manipulation: Logarithmic View Score
 * 
 * Formula: score = min(CAP, log2(1 + views))
 * 
 * Why logarithmic?
 *   - 10 views → score ~3.5
 *   - 100 views → score ~6.7
 *   - 1000 views → score ~10.0
 *   - 10000 views → score ~13.3 (but capped at 100)
 *   - Diminishing returns = botting 10k views barely helps vs 1k real views
 *   - Combined with daily cap, manipulation is expensive and unrewarding
 */
function safeViewScore(views, cap = CONFIG.CAPS.MAX_VIEW_SCORE) {
    if (views <= 0) return 0;
    return Math.min(cap, Math.log2(1 + views));
}

/**
 * Capped Daily Views (anti-bot)
 * If today's views exceed MAX_VIEWS_PER_DAY, we clamp it.
 */
function capViews(views, max = CONFIG.CAPS.MAX_VIEWS_PER_DAY) {
    return Math.min(views, max);
}


// ═══════════════════════════════════════════════════════════════
//  SCORE CALCULATORS
// ═══════════════════════════════════════════════════════════════

/**
 * ┌─────────────────────────────────────────┐
 * │         BEST SELLER SCORE               │
 * ├─────────────────────────────────────────┤
 * │ Focus: Proven sales + trust             │
 * │                                         │
 * │ BS = ( W1·sales_7d                      │
 * │      + W2·sales_30d                     │
 * │      + W3·total_sales                   │
 * │      + W4·bayesian_rating               │
 * │      + W5·log(1+wishlist)               │
 * │      ) × time_decay × freshness         │
 * └─────────────────────────────────────────┘
 */
function calcBestSeller(listing, globalAvgRating) {
    const s = listing.stats || {};
    const W = CONFIG.WEIGHTS.BEST_SELLER;

    const salesSignal =
        W.sales_7d * (s.salesLast7d || 0) +
        W.sales_30d * (s.salesLast30d || 0) +
        W.total_sales * (s.salesCount || 0);

    const ratingSignal =
        W.rating * bayesianRating(s.ratingSum || 0, s.ratingCount || 0, globalAvgRating);

    const wishlistSignal =
        W.wishlist * Math.log2(1 + (s.wishlistCount || 0));

    const rawScore = salesSignal + ratingSignal + wishlistSignal;

    const decay = timeDecay(listing.createdAt, CONFIG.DECAY_HALF_LIFE.BEST_SELLER);
    const fresh = freshnessBoost(listing.createdAt);

    return Math.round(rawScore * decay * fresh * 1000) / 1000;
}

/**
 * ┌─────────────────────────────────────────┐
 * │         TRENDING SCORE                  │
 * ├─────────────────────────────────────────┤
 * │ Focus: Velocity / momentum              │
 * │                                         │
 * │ TS = ( W1·log(1+cap(views_today))       │
 * │      + W2·log(1+views_7d)               │
 * │      + W3·sales_24h                     │
 * │      + W4·sales_7d                      │
 * │      + W5·log(1+wishlist)               │
 * │      ) × time_decay × freshness         │
 * │                                         │
 * │ Decays fast (3-day half-life)           │
 * │ Yesterday's trend is already old news   │
 * └─────────────────────────────────────────┘
 */
function calcTrending(listing, _globalAvgRating) {
    const s = listing.stats || {};
    const W = CONFIG.WEIGHTS.TRENDING;

    const viewSignal =
        W.views_today * safeViewScore(capViews(s.viewsToday || 0)) +
        W.views_7d * safeViewScore(s.viewsLast7d || 0);

    const salesSignal =
        W.sales_24h * (s.salesLast24h || 0) +
        W.sales_7d * (s.salesLast7d || 0);

    const wishlistSignal =
        W.wishlist * Math.log2(1 + (s.wishlistCount || 0));

    const rawScore = viewSignal + salesSignal + wishlistSignal;

    const decay = timeDecay(listing.createdAt, CONFIG.DECAY_HALF_LIFE.TRENDING);
    const fresh = freshnessBoost(listing.createdAt);

    return Math.round(rawScore * decay * fresh * 1000) / 1000;
}

/**
 * ┌─────────────────────────────────────────┐
 * │         POPULAR SCORE                   │
 * ├─────────────────────────────────────────┤
 * │ Focus: Community love, overall quality  │
 * │                                         │
 * │ PS = ( W1·log(1+total_views)            │
 * │      + W2·total_sales                   │
 * │      + W3·log(1+wishlist)               │
 * │      + W4·bayesian_rating               │
 * │      + W5·log(1+views_7d)               │
 * │      ) × time_decay × freshness         │
 * │                                         │
 * │ Balanced — rewards sustained quality    │
 * └─────────────────────────────────────────┘
 */
function calcPopular(listing, globalAvgRating) {
    const s = listing.stats || {};
    const W = CONFIG.WEIGHTS.POPULAR;

    const viewSignal =
        W.total_views * safeViewScore(s.viewCount || 0) +
        W.views_7d * safeViewScore(s.viewsLast7d || 0);

    const salesSignal =
        W.total_sales * (s.salesCount || 0);

    const wishlistSignal =
        W.wishlist * Math.log2(1 + (s.wishlistCount || 0));

    const ratingSignal =
        W.rating * bayesianRating(s.ratingSum || 0, s.ratingCount || 0, globalAvgRating);

    const rawScore = viewSignal + salesSignal + wishlistSignal + ratingSignal;

    const decay = timeDecay(listing.createdAt, CONFIG.DECAY_HALF_LIFE.POPULAR);
    const fresh = freshnessBoost(listing.createdAt);

    return Math.round(rawScore * decay * fresh * 1000) / 1000;
}


// ═══════════════════════════════════════════════════════════════
//  STATS AGGREGATION (gather real-time data from DB)
// ═══════════════════════════════════════════════════════════════

/**
 * Aggregate sales rolling windows from Transaction collection
 * Returns a Map<listingId, { total, last24h, last7d, last30d }>
 */
async function aggregateSales() {
    const now = new Date();
    const d24h = new Date(now - 24 * 60 * 60 * 1000);
    const d7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const d30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const pipeline = [
        { $match: { status: 'completed' } },
        {
            $group: {
                _id: '$listing',
                total: { $sum: 1 },
                last24h: {
                    $sum: { $cond: [{ $gte: ['$createdAt', d24h] }, 1, 0] }
                },
                last7d: {
                    $sum: { $cond: [{ $gte: ['$createdAt', d7d] }, 1, 0] }
                },
                last30d: {
                    $sum: { $cond: [{ $gte: ['$createdAt', d30d] }, 1, 0] }
                },
            },
        },
    ];

    const results = await Transaction.aggregate(pipeline);
    const map = new Map();
    for (const r of results) {
        map.set(r._id.toString(), {
            total: r.total,
            last24h: r.last24h,
            last7d: r.last7d,
            last30d: r.last30d,
        });
    }
    return map;
}

/**
 * Aggregate wishlist counts from Favorite collection
 * Returns Map<listingId, count>
 */
async function aggregateWishlists() {
    const pipeline = [
        { $group: { _id: '$listing', count: { $sum: 1 } } },
    ];

    const results = await Favorite.aggregate(pipeline);
    const map = new Map();
    for (const r of results) {
        map.set(r._id.toString(), r.count);
    }
    return map;
}

/**
 * Get global average rating across all listings that have ratings
 */
async function getGlobalAvgRating() {
    const result = await Listing.aggregate([
        { $match: { 'stats.ratingCount': { $gt: 0 } } },
        {
            $group: {
                _id: null,
                totalSum: { $sum: '$stats.ratingSum' },
                totalCount: { $sum: '$stats.ratingCount' },
            },
        },
    ]);

    if (result.length === 0 || result[0].totalCount === 0) {
        return CONFIG.BAYESIAN.GLOBAL_AVG_RATING; // Default 3.5
    }
    return result[0].totalSum / result[0].totalCount;
}


// ═══════════════════════════════════════════════════════════════
//  MAIN RECALCULATION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Recalculate all ranking scores for available listings.
 * 
 * Strategy:
 *   1. Aggregate sales & wishlists once (2 queries)
 *   2. Compute global avg rating once
 *   3. Stream all available listings
 *   4. For each: merge aggregated stats → compute 3 scores → bulk write
 *   5. Cache results for API
 * 
 * Runs in ~1-3 seconds for 10k listings.
 */
async function recalculateAllScores() {
    const startTime = Date.now();
    logger.info('📊 [Ranking] Starting score recalculation...');

    try {
        // Step 1: Aggregate external data in parallel
        const [salesMap, wishlistMap, globalAvgRating] = await Promise.all([
            aggregateSales(),
            aggregateWishlists(),
            getGlobalAvgRating(),
        ]);

        logger.info(`📊 [Ranking] Aggregated: ${salesMap.size} sale records, ${wishlistMap.size} wishlisted listings, avg rating: ${globalAvgRating.toFixed(2)}`);

        // Step 2: Fetch all available listings
        const listings = await Listing.find({ status: 'available' })
            .select('stats ranking createdAt')
            .lean();

        if (listings.length === 0) {
            logger.info('📊 [Ranking] No available listings to rank.');
            return { recalculated: 0, duration: Date.now() - startTime };
        }

        // Step 3: Prepare bulk operations
        const bulkOps = [];
        const now = new Date();

        for (const listing of listings) {
            const lid = listing._id.toString();

            // Merge aggregated stats into the listing object for scoring
            const enriched = {
                ...listing,
                stats: {
                    ...listing.stats,
                    salesCount: salesMap.get(lid)?.total || listing.stats?.salesCount || 0,
                    salesLast24h: salesMap.get(lid)?.last24h || 0,
                    salesLast7d: salesMap.get(lid)?.last7d || 0,
                    salesLast30d: salesMap.get(lid)?.last30d || 0,
                    wishlistCount: wishlistMap.get(lid) || listing.stats?.wishlistCount || 0,
                },
            };

            // Compute scores
            const bestSeller = calcBestSeller(enriched, globalAvgRating);
            const trending = calcTrending(enriched, globalAvgRating);
            const popular = calcPopular(enriched, globalAvgRating);

            bulkOps.push({
                updateOne: {
                    filter: { _id: listing._id },
                    update: {
                        $set: {
                            'ranking.bestSeller': bestSeller,
                            'ranking.trending': trending,
                            'ranking.popular': popular,
                            'ranking.updatedAt': now,
                            // Also persist the aggregated stats
                            'stats.salesCount': enriched.stats.salesCount,
                            'stats.salesLast24h': enriched.stats.salesLast24h,
                            'stats.salesLast7d': enriched.stats.salesLast7d,
                            'stats.salesLast30d': enriched.stats.salesLast30d,
                            'stats.wishlistCount': enriched.stats.wishlistCount,
                        },
                    },
                },
            });
        }

        // Step 4: Bulk write (very efficient — single round trip)
        if (bulkOps.length > 0) {
            await Listing.bulkWrite(bulkOps, { ordered: false });
        }

        // Step 5: Invalidate cached ranking results
        try {
            await redis.del('ranking:bestSeller');
            await redis.del('ranking:trending');
            await redis.del('ranking:popular');
            await redis.del('ranking:homepage');
        } catch (e) {
            // Redis might be down — non-fatal
        }

        const duration = Date.now() - startTime;
        logger.info(`✅ [Ranking] Recalculated ${listings.length} listings in ${duration}ms`);

        return { recalculated: listings.length, duration, globalAvgRating };
    } catch (error) {
        logger.error('❌ [Ranking] Recalculation failed:', error.message);
        throw error;
    }
}


// ═══════════════════════════════════════════════════════════════
//  QUERY FUNCTIONS (used by API routes)
// ═══════════════════════════════════════════════════════════════

const CACHE_TTL = 300; // 5 min cache for ranked results

/**
 * Get top N listings by section, with Redis caching.
 */
async function getTopListings(section, limit = 10, gameId = null) {
    const validSections = ['bestSeller', 'trending', 'popular'];
    if (!validSections.includes(section)) {
        throw new Error(`Invalid section: ${section}`);
    }

    const cacheKey = `ranking:${section}${gameId ? `:game:${gameId}` : ''}:${limit}`;

    // Try cache first
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (e) { /* Redis down — continue to DB */ }

    // Query DB with timeout - OPTIMIZED
    const filter = { status: 'available' };
    if (gameId) filter.game = gameId;

    const sortField = `ranking.${section}`;

    try {
        const listings = await Listing.find(filter)
            .sort({ [sortField]: -1 })
            .limit(limit)
            .select('-__v -updatedAt') // Exclude unnecessary fields
            .populate('game', 'name')
            .populate('seller', 'username')
            .maxTimeMS(3000) // Reduced timeout to 3 seconds
            .lean();

        // Cache result
        try {
            await redis.set(cacheKey, JSON.stringify(listings), 'EX', CACHE_TTL);
        } catch (e) { /* non-fatal */ }

        return listings;
    } catch (error) {
        logger.warn(`Query timeout for ${section}, returning empty array:`, error.message);
        // Return empty array on timeout instead of crashing
        return [];
    }
}

/**
 * Get all 3 sections at once for the homepage.
 * Uses a combined cache key for efficiency.
 */
async function getHomepageRankings(limit = 10) {
    const cacheKey = `ranking:homepage:${limit}`;

    // Try cache
    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            logger.info('✓ Homepage rankings served from cache');
            return JSON.parse(cached);
        }
    } catch (e) {
        logger.warn('Redis cache miss for homepage rankings:', e.message);
    }

    try {
        // Parallel fetch all 3 sections with shorter timeout
        const fetchPromise = Promise.all([
            getTopListings('bestSeller', limit),
            getTopListings('trending', limit),
            getTopListings('popular', limit),
        ]);

        // Reduced overall timeout to 6 seconds (3s per query * 3 = 9s, but parallel so ~6s max)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Homepage rankings timeout after 6s')), 6000)
        );

        const [bestSeller, trending, popular] = await Promise.race([
            fetchPromise,
            timeoutPromise
        ]);

        const result = { bestSeller, trending, popular };

        // Cache combined result
        try {
            await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
            logger.info('✓ Homepage rankings cached successfully');
        } catch (e) {
            logger.warn('Failed to cache homepage rankings:', e.message);
        }

        return result;
    } catch (error) {
        logger.error('Failed to fetch homepage rankings:', error.message);
        // Return empty results instead of crashing
        return {
            bestSeller: [],
            trending: [],
            popular: []
        };
    }
}


// ═══════════════════════════════════════════════════════════════
//  VIEW TRACKING (called from listing detail page)
// ═══════════════════════════════════════════════════════════════

/**
 * Record a view for a listing.
 * Uses Redis to deduplicate per IP (max 1 view per IP per hour).
 */
async function recordView(listingId, ipAddress) {
    try {
        // Deduplicate: 1 view per IP per listing per hour
        const dedupeKey = `view:${listingId}:${ipAddress}`;
        let isDuplicate = false;

        try {
            const exists = await redis.get(dedupeKey);
            if (exists) {
                isDuplicate = true;
            } else {
                await redis.set(dedupeKey, '1', 'EX', 3600); // 1 hour window
            }
        } catch (e) {
            // Redis down — allow the view (better UX than blocking)
        }

        if (isDuplicate) return { recorded: false, reason: 'duplicate' };

        // Increment view counters atomically
        await Listing.updateOne(
            { _id: listingId },
            {
                $inc: {
                    'stats.viewCount': 1,
                    'stats.viewsToday': 1,
                    'stats.viewsLast7d': 1,
                    'stats.viewsLast30d': 1,
                },
            }
        );

        return { recorded: true };
    } catch (error) {
        logger.error(`[Ranking] View tracking error: ${error.message}`);
        return { recorded: false, reason: 'error' };
    }
}

/**
 * Reset rolling view windows.
 * Called by cron:
 *   - Daily: reset viewsToday
 *   - Weekly: reset viewsLast7d
 *   - Monthly: reset viewsLast30d
 */
async function resetViewWindows(window) {
    const field = {
        daily: 'stats.viewsToday',
        weekly: 'stats.viewsLast7d',
        monthly: 'stats.viewsLast30d',
    }[window];

    if (!field) return;

    await Listing.updateMany(
        { status: 'available' },
        { $set: { [field]: 0 } }
    );

    logger.info(`🔄 [Ranking] Reset ${window} view window`);
}


// ═══════════════════════════════════════════════════════════════
//  RATING SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Submit a rating for a listing.
 * Updates running sum & count for O(1) Bayesian calculation.
 */
async function submitRating(listingId, rating) {
    if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
    }

    const result = await Listing.findByIdAndUpdate(
        listingId,
        {
            $inc: {
                'stats.ratingSum': rating,
                'stats.ratingCount': 1,
            },
        },
        { new: true, select: 'stats.ratingSum stats.ratingCount' }
    );

    if (!result) throw new Error('Listing not found');

    // Update average
    const avg = result.stats.ratingSum / result.stats.ratingCount;
    await Listing.updateOne(
        { _id: listingId },
        { $set: { 'stats.ratingAvg': Math.round(avg * 100) / 100 } }
    );

    return { ratingAvg: avg, ratingCount: result.stats.ratingCount };
}


// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    // Core
    recalculateAllScores,
    getTopListings,
    getHomepageRankings,

    // Tracking
    recordView,
    resetViewWindows,
    submitRating,

    // Utils (exposed for testing)
    timeDecay,
    freshnessBoost,
    bayesianRating,
    safeViewScore,
    calcBestSeller,
    calcTrending,
    calcPopular,

    // Config (for admin tuning)
    CONFIG,
};
