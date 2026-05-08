import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
  getAdminActivityLog,
  getUsers,
  updateUserRole,
  deleteUser,
} from "../controllers/adminController.js";

const router = express.Router();

// Activity log
router.get(
  "/activity-log",
  authMiddleware,
  roleMiddleware(["admin"]),
  getAdminActivityLog
);

// User management (Dashboard user table)
router.get(
  "/users",
  authMiddleware,
  roleMiddleware(["admin", "project_manager"]),
  getUsers
);

router.put(
  "/users/:userId/role",
  authMiddleware,
  roleMiddleware(["admin"]),
  updateUserRole
);

router.delete(
  "/users/:userId",
  authMiddleware,
  roleMiddleware(["admin"]),
  deleteUser
);

export default router;