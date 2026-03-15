import express from "express";
import { sendSupportMessage } from "./support.controller.js";

const router = express.Router();

// Public support form endpoint used by homepage contact form.
router.post("/messages", sendSupportMessage);

export default router;
