import express from "express";
import {getNotifications, markAsRead, markAllAsRead} from "../controllers/notificationController.js";
import {authMiddleware} from "../middleware/authMiddleware.js";
 
const router = express.Router();
 
router.get("/", authMiddleware, getNotifications);
 
router.patch("/read-all", authMiddleware, markAllAsRead);
 
router.patch("/:id/read", authMiddleware, markAsRead);
 
export default router;