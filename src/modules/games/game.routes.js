import express from "express";
import { getAllGames, getGameBySlug } from "./game.controller.js";

const router = express.Router();

// Public routes (no auth required)
router.get("/", getAllGames);
router.get("/:slug", getGameBySlug);

export default router;
