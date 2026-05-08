import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getDashboardStats } from "../controllers/statsController.js";

const router = express.Router();

router.get("/dashboard", authMiddleware, getDashboardStats);

export default router;
