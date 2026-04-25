import express from "express";
import {updateMemberRole, getProjects, getAllProjects, getProjectById, createProject, updateProject, deleteProject, getMembers, removeMember, addMember} from "../controllers/projectController.js";
import {authMiddleware} from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";


const router = express.Router();

router.get("/all_projects", authMiddleware, roleMiddleware(["admin"]), getAllProjects);

router.get("/", authMiddleware, getProjects);

router.post("/", authMiddleware, roleMiddleware(["admin", "project_manager"]), createProject);

router.get("/:id", authMiddleware, getProjectById);

router.patch("/:id", authMiddleware, roleMiddleware(["admin", "project_manager"]), updateProject);

router.patch("/:id/members/:userId/role",authMiddleware, roleMiddleware(["admin","project_manager"]), updateMemberRole);

router.delete("/:id", authMiddleware, roleMiddleware(["admin","project_manager"]), deleteProject);

router.get("/:id/members", authMiddleware, getMembers);

router.post("/:id/members", authMiddleware, roleMiddleware(["admin", "project_manager"]), addMember);

router.delete("/:id/members/:userId", authMiddleware, roleMiddleware(["admin", "project_manager"]), removeMember);

export default router;