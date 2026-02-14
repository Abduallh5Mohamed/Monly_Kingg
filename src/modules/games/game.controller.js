import Game from "./game.model.js";

// Get all active games (public)
export const getAllGames = async (req, res) => {
    try {
        const games = await Game.find({ status: "active" }).sort({ name: 1 });
        return res.status(200).json({ data: games });
    } catch (error) {
        console.error("Get all games error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// Get a game by slug
export const getGameBySlug = async (req, res) => {
    try {
        const game = await Game.findOne({ slug: req.params.slug, status: "active" });
        if (!game) {
            return res.status(404).json({ message: "Game not found" });
        }
        return res.status(200).json({ data: game });
    } catch (error) {
        console.error("Get game by slug error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
