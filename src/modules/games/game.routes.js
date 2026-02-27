import express from "express";
import { getAllGames, getGameBySlug } from "./game.controller.js";
const router = express.Router();

// Public routes (no auth required) — protected by global limiter
router.get("/", getAllGames);
router.get("/:slug", getGameBySlug);

export default router;
