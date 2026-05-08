import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import db from './db.js';

import authRoutes from "./routes/authRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js"
import projectRoutes from "./routes/projectRoutes.js"
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();
const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// --- DASHBOARD STATS ---
app.get('/api/stats/summary', async (req, res) => {
  try {
    const { role, userId } = req.query;
    const projectRes = await db.query('SELECT COUNT(*) FROM projects');
    const userRes = await db.query('SELECT COUNT(*) FROM users');
    let issueQuery = "SELECT COUNT(*) FROM issues WHERE severity = 'Critical'";
    let queryParams = [];
    const normRole = role?.replace('_', ' ').toLowerCase();
    if (normRole === 'developer') {
      issueQuery = "SELECT COUNT(*) FROM issues WHERE assigned_to = $1 AND status != 'Resolved'";
      queryParams = [userId];
    } else if (normRole === 'tester') {
      issueQuery = "SELECT COUNT(*) FROM issues WHERE status = 'Pending Testing' OR status = 'Reopened'";
    } else if (normRole === 'project manager') {
      issueQuery = "SELECT COUNT(*) FROM issues WHERE status != 'Resolved'";
    }
    const issueRes = await db.query(issueQuery, queryParams);
    res.json({
      projects: parseInt(projectRes.rows[0]?.count) || 0,
      users: parseInt(userRes.rows[0]?.count) || 0,
      issues: parseInt(issueRes.rows[0]?.count) || 0,
      sprints: 3,
      systemHealth: "98.2%"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PROJECT LIST FOR USER ---
// NOTE: This is handled by projectRoutes GET "/" via authMiddleware.
// The route below is a fallback for userId-based lookups not covered by the router.
app.get('/api/users/:userId/projects', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.query(
      `SELECT p.project_id, p.name, p.description, p.status, pm.proj_role as project_role
       FROM projects p
       JOIN project_members pm ON p.project_id = pm.project_id
       WHERE pm.user_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NOTE: All /api/projects/:id/members routes (GET, POST) are now fully
// handled by projectRoutes.js with proper auth + role middleware.
// Do NOT duplicate them here — duplicates cause route conflicts.

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
