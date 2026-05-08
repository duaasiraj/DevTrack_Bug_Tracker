import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { getAdminActivityLog } from "../controllers/adminController.js";

const router = express.Router();

router.get(
  "/activity-log",
  authMiddleware,
  roleMiddleware(["admin"]),
  getAdminActivityLog
);

export default router;
