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

dotenv.config();
const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// --- CONSOLIDATED ROLE-BASED STATS ---
app.get('/api/stats/summary', async (req, res) => {
  try {
    const { role, userId } = req.query;
    
    // 1. Projects Count (Global for Admin/PM, potentially filtered for others)
    const projectRes = await db.query('SELECT COUNT(*) FROM projects');
    
    // 2. User Count
    const userRes = await db.query('SELECT COUNT(*) FROM users');

    // 3. Issues Count (Personalized by Role)
    let issueQuery = "SELECT COUNT(*) FROM issues WHERE severity = 'Critical'";
    let queryParams = [];

    if (role === 'developer') {
      issueQuery = "SELECT COUNT(*) FROM issues WHERE assigned_to = $1 AND status != 'Resolved'";
      queryParams = [userId];
    } else if (role === 'tester') {
      issueQuery = "SELECT COUNT(*) FROM issues WHERE status = 'Pending Testing' OR status = 'Reopened'";
    }

    const issueRes = await db.query(issueQuery, queryParams);

    res.json({
      projects: parseInt(projectRes.rows[0].count),
      users: parseInt(userRes.rows[0].count),
      issues: parseInt(issueRes.rows[0].count),
      sprints: 3, // Placeholder or fetch from a sprints table if you have one
      systemHealth: "98.2%"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN/PM USER LIST ---
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await db.query('SELECT username, email, role FROM users ORDER BY username ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/issues/:issueId/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));