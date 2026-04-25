import express from 'express';

import {getAllUsers, getUserById, updateUser, deleteUser} from '../controllers/userController.js';

import {authMiddleware} from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware(["admin"]), getAllUsers);

router.get("/:id", authMiddleware, getUserById);

router.patch("/:id", authMiddleware, updateUser);

router.delete("/:id", authMiddleware, roleMiddleware(["admin"]), deleteUser);


export default router;