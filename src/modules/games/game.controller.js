import Game from "./game.model.js";
import cacheService from "../../services/cacheService.js";
import logger from "../../utils/logger.js";

// Get all active games (public) — cached for 6 hours
export const getAllGames = async (req, res) => {
    try {
        // Try cache first
        const cached = await cacheService.getCachedGames();
        if (cached) {
            return res.status(200).json({ data: cached, cached: true });
        }

        const games = await Game.find({ status: "active" }).sort({ name: 1 }).lean();

        // Cache for 6 hours
        await cacheService.cacheGames(games);

        return res.status(200).json({ data: games });
    } catch (error) {
        logger.error("Get all games error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// Get a game by slug — cached for 6 hours
export const getGameBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        // Try cache first
        const cached = await cacheService.getCachedGameBySlug(slug);
        if (cached) {
            return res.status(200).json({ data: cached, cached: true });
        }

        const game = await Game.findOne({ slug, status: "active" }).lean();
        if (!game) {
            return res.status(404).json({ message: "Game not found" });
        }

        // Cache individual game
        await cacheService.cacheGameBySlug(slug, game);

        return res.status(200).json({ data: game });
    } catch (error) {
        logger.error("Get game by slug error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
