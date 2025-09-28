import express from "express";
import * as userController from "./user.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";

const router = express.Router();

router.get("/:id", authMiddleware, userController.getUser);
router.put("/:id", authMiddleware, userController.updateUser);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), userController.deleteUser);

export default router;
