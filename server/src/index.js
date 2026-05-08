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
// This route has no authMiddleware intentionally (stats are role-filtered by query param).
app.get('/api/stats/summary', async (req, res) => {
  try {
    const { role, userId } = req.query;
    const normRole = role?.replace(/_/g, ' ').toLowerCase();

    // ── Total projects ──
    const projectRes = await db.query('SELECT COUNT(*) FROM projects');

    // ── Total users ──
    const userRes = await db.query('SELECT COUNT(*) FROM users');

    // ── Issues count (role-filtered) ──
    // schema: issues.priority (low/medium/high/critical), issues.status (open/in_progress/resolved/closed)
    let issueQuery;
    let issueParams = [];

    if (normRole === 'developer') {
      // Issues in projects the developer is a member of
      issueQuery = `
        SELECT COUNT(DISTINCT i.issue_id) FROM issues i
        JOIN project_members pm ON pm.project_id = i.project_id
        WHERE pm.user_id = $1
      `;
      issueParams = [userId];
    } else if (normRole === 'project manager') {
      // Issues in projects this PM manages
      issueQuery = `
        SELECT COUNT(DISTINCT i.issue_id) FROM issues i
        JOIN project_members pm ON pm.project_id = i.project_id
        WHERE pm.user_id = $1
        AND pm.project_role IN ('project_manager', 'project_lead')
      `;
      issueParams = [userId];
    } else {
      // Admin and tester: all issues
      issueQuery = 'SELECT COUNT(*) FROM issues';
    }

    const issueRes = await db.query(issueQuery, issueParams);

    // ── Health: weighted resolved / weighted total * 100 ──
    // priority values from schema: 'critical'=3, 'high'=3, 'medium'=2, 'low'=1
    // status 'resolved' counts as resolved
    const healthRes = await db.query(`
      SELECT priority, status, COUNT(*) AS cnt
      FROM issues
      GROUP BY priority, status
    `);

    const weightMap = { critical: 3, high: 3, medium: 2, low: 1 };
    let weightedTotal = 0;
    let weightedResolved = 0;

    for (const row of healthRes.rows) {
      const weight = weightMap[row.priority?.toLowerCase()] ?? 1;
      const count = parseInt(row.cnt);
      weightedTotal += weight * count;
      if (row.status === 'resolved') {
        weightedResolved += weight * count;
      }
    }

    const healthPct = weightedTotal === 0
      ? 100
      : Math.round((weightedResolved / weightedTotal) * 100);

    res.json({
      projects: parseInt(projectRes.rows[0]?.count) || 0,
      users: parseInt(userRes.rows[0]?.count) || 0,
      issues: parseInt(issueRes.rows[0]?.count) || 0,
      systemHealth: `${healthPct}%`,
    });
  } catch (err) {
    console.error('Stats summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DO NOT add any /api/projects/:id/members routes here.
// They are fully handled by projectRoutes.js → projectController.js
// which uses the correct column name "project_role" and has
// authMiddleware + roleMiddleware protecting them.
//
// Adding duplicate inline routes here causes them to fire FIRST
// (before the router) and they query the wrong column "proj_role",
// returning empty results.
// ─────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);   // handles all /api/projects/* including members
app.use('/api/issues', issueRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);         // handles /api/admin/users for Dashboard

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));