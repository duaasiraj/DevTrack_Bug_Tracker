import express from "express";
import { register, login, logout, getMe, resetPasswordByUserId } from "../controllers/authController.js"
import {authMiddleware} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/reset-password", resetPasswordByUserId);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authMiddleware,getMe);

export default router;