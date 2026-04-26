import express from "express";
import { createComment, deleteComment, getComments } from "../controllers/commentController.js";
import {authMiddleware} from "../middleware/authMiddleware.js";

const router = express.Router({mergeParams: true});

router.get("/", authMiddleware, getComments);

router.post("/", authMiddleware, createComment);

router.delete("/:id", authMiddleware, deleteComment);

export default router;