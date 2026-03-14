import express from "express";
import { getAllGames, getGameBySlug } from "./game.controller.js";
import { cacheResponse } from "../../middlewares/apiCacheMiddleware.js";
const router = express.Router();

// Public routes (no auth required) — protected by global limiter
// Games rarely change → cache for 10 minutes
router.get("/", cacheResponse(600), getAllGames);
router.get("/:slug", cacheResponse(600), getGameBySlug);

export default router;
