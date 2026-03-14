import express from "express";
import {
  listSellersWithLevels,
  setSellerLevel,
  removeOverride,
  getConfig,
  updateConfig,
  recalculate,
  getStats,
  getTable,
} from "./sellerLevel.controller.js";

const router = express.Router();

// Auth is already applied by the parent admin router

// Config
router.get("/config", getConfig);
router.put("/config", updateConfig);

// Stats & Table
router.get("/stats", getStats);
router.get("/table", getTable);

// Recalculate all
router.post("/recalculate", recalculate);

// List sellers with levels
router.get("/", listSellersWithLevels);

// Set/remove seller level override
router.put("/:userId", setSellerLevel);
router.delete("/:userId/override", removeOverride);

export default router;
