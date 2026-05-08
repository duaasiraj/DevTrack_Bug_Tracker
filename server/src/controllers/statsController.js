import pool from "../db.js";

function emptyByStatus() {
  return { open: 0, in_progress: 0, resolved: 0, closed: 0 };
}

function foldStatusRows(rows) {
  const byStatus = emptyByStatus();
  let total = 0;
  let solved = 0;
  for (const row of rows) {
    const c = parseInt(row.c, 10) || 0;
    const s = row.status;
    if (Object.prototype.hasOwnProperty.call(byStatus, s)) {
      byStatus[s] = c;
    }
    total += c;
    if (s === "resolved" || s === "closed") {
      solved += c;
    }
  }
  const unsolved = Math.max(0, total - solved);
  const active =
    (byStatus.open || 0) + (byStatus.in_progress || 0);
  const healthPercent = total === 0 ? 100 : Math.round((solved / total) * 100);
  return { byStatus, total, solved, unsolved, active, healthPercent };
}

async function projectIdsForUser(role, userId) {
  if (role === "project_manager") {
    const r = await pool.query(
      `SELECT project_id FROM project_members
       WHERE user_id = $1 AND project_role IN ('project_manager', 'project_lead')`,
      [userId]
    );
    return r.rows.map((x) => x.project_id);
  }
  if (role === "developer" || role === "tester") {
    const r = await pool.query(
      `SELECT project_id FROM project_members WHERE user_id = $1`,
      [userId]
    );
    return r.rows.map((x) => x.project_id);
  }
  return [];
}

async function projectsIssueCounts(projectIds) {
  if (!projectIds.length) return [];
  const r = await pool.query(
    `SELECT p.project_id::text AS "projectId", p.name,
            COUNT(i.issue_id)::int AS "issueCount"
     FROM projects p
     LEFT JOIN issues i ON i.project_id = p.project_id
     WHERE p.project_id = ANY($1::uuid[])
     GROUP BY p.project_id, p.name
     ORDER BY p.name ASC`,
    [projectIds]
  );
  return r.rows;
}

async function usersOpenIssueStats(projectIds, allOrgUsers) {
  if (allOrgUsers) {
    const r = await pool.query(
      `SELECT u.user_id::text AS "userId", u.username, u.email, u.role::text AS role,
        COUNT(DISTINCT CASE
          WHEN i.status IN ('open', 'in_progress')
          AND (i.assigned_to = u.user_id OR i.reported_by = u.user_id)
          THEN i.issue_id END)::int AS "openIssues"
       FROM users u
       LEFT JOIN issues i ON (
         i.assigned_to = u.user_id OR i.reported_by = u.user_id
       )
       GROUP BY u.user_id, u.username, u.email, u.role
       ORDER BY u.username ASC`
    );
    return r.rows;
  }
  if (!projectIds.length) return [];
  const r = await pool.query(
    `SELECT u.user_id::text AS "userId", u.username, u.email, u.role::text AS role,
      COUNT(DISTINCT CASE
        WHEN i.project_id = ANY($1::uuid[])
        AND i.status IN ('open', 'in_progress')
        AND (i.assigned_to = u.user_id OR i.reported_by = u.user_id)
        THEN i.issue_id END)::int AS "openIssues"
     FROM users u
     INNER JOIN project_members pm
       ON pm.user_id = u.user_id AND pm.project_id = ANY($1::uuid[])
     LEFT JOIN issues i
       ON i.project_id = ANY($1::uuid[])
       AND (i.assigned_to = u.user_id OR i.reported_by = u.user_id)
     GROUP BY u.user_id, u.username, u.email, u.role
     ORDER BY u.username ASC`,
    [projectIds]
  );
  return r.rows;
}

function mapPendingRows(rows) {
  return rows.map((row) => ({
    issueId: row.issue_id,
    projectId: row.project_id,
    projectName: row.project_name,
    title: row.title,
    status: row.status,
    priority: row.priority,
    reportedBy: row.reported_by,
    assignedTo: row.assigned_to,
  }));
}

export async function getDashboardStats(req, res) {
  try {
    const userId = req.user.user_id;
    const role = req.user.role;

    /** -------- Admin / org-wide overview -------- */
    if (role === "admin") {
      const [statusRes, projRes, userRes, projChart, usersStats] =
        await Promise.all([
          pool.query(
            `SELECT status::text AS status, COUNT(*)::int AS c FROM issues GROUP BY status`
          ),
          pool.query(`SELECT COUNT(*)::int AS c FROM projects`),
          pool.query(`SELECT COUNT(*)::int AS c FROM users`),
          pool.query(
            `SELECT p.project_id::text AS "projectId", p.name,
              COUNT(i.issue_id)::int AS "issueCount"
             FROM projects p
             LEFT JOIN issues i ON i.project_id = p.project_id
             GROUP BY p.project_id, p.name
             ORDER BY p.name ASC`
          ),
          usersOpenIssueStats(null, true),
        ]);
      const folded = foldStatusRows(statusRes.rows);
      return res.status(200).json({
        success: true,
        data: {
          view: "overview",
          role: "admin",
          projects: projRes.rows[0]?.c ?? 0,
          teamMembers: userRes.rows[0]?.c ?? 0,
          issues: folded.total,
          activeIssues: folded.active,
          solvedIssues: folded.solved,
          unsolvedIssues: folded.unsolved,
          healthPercent: folded.healthPercent,
          byStatus: folded.byStatus,
          projectsChart: projChart.rows,
          usersTable: usersStats,
        },
      });
    }

    const pids = await projectIdsForUser(role, userId);
    const projectCount = pids.length;

    /** -------- Project manager (overview, scoped) -------- */
    if (role === "project_manager") {
      if (pids.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            view: "overview",
            role: "project_manager",
            projects: 0,
            teamMembers: 0,
            issues: 0,
            activeIssues: 0,
            solvedIssues: 0,
            unsolvedIssues: 0,
            healthPercent: 100,
            byStatus: emptyByStatus(),
            projectsChart: [],
            usersTable: [],
          },
        });
      }

      const [statusRes, teamRes, projChart, usersStats] = await Promise.all([
        pool.query(
          `SELECT i.status::text AS status, COUNT(*)::int AS c
           FROM issues i
           WHERE i.project_id = ANY($1::uuid[])
           GROUP BY i.status`,
          [pids]
        ),
        pool.query(
          `SELECT COUNT(DISTINCT user_id)::int AS c FROM project_members
           WHERE project_id = ANY($1::uuid[])`,
          [pids]
        ),
        projectsIssueCounts(pids),
        usersOpenIssueStats(pids, false),
      ]);

      const folded = foldStatusRows(statusRes.rows);

      return res.status(200).json({
        success: true,
        data: {
          view: "overview",
          role: "project_manager",
          projects: projectCount,
          teamMembers: teamRes.rows[0]?.c ?? 0,
          issues: folded.total,
          activeIssues: folded.active,
          solvedIssues: folded.solved,
          unsolvedIssues: folded.unsolved,
          healthPercent: folded.healthPercent,
          byStatus: folded.byStatus,
          projectsChart: projChart,
          usersTable: usersStats,
        },
      });
    }

    /** -------- Developer / Tester (member view) -------- */
    if (pids.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          view: "member",
          role,
          projects: 0,
          teamMembers: 0,
          openedCount: 0,
          assignedCount: 0,
          pendingCount: 0,
          issues: 0,
          activeIssues: 0,
          solvedIssues: 0,
          unsolvedIssues: 0,
          healthPercent: 100,
          byStatus: emptyByStatus(),
          pendingIssues: [],
          projectsChart: [],
        },
      });
    }

    if (role === "developer") {
      const [
        openedRes,
        assignedRes,
        statusRes,
        pendingRes,
        pendingCountRes,
        chartRes,
        teamRes,
        involvedRes,
      ] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS c FROM issues
           WHERE project_id = ANY($1::uuid[]) AND reported_by = $2`,
          [pids, userId]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS c FROM issues
           WHERE project_id = ANY($1::uuid[]) AND assigned_to = $2`,
          [pids, userId]
        ),
        pool.query(
          `SELECT i.status::text AS status, COUNT(*)::int AS c
           FROM issues i
           WHERE i.project_id = ANY($1::uuid[])
             AND (i.assigned_to = $2 OR i.reported_by = $2)
           GROUP BY i.status`,
          [pids, userId]
        ),
        pool.query(
          `SELECT i.issue_id, i.project_id, p.name AS project_name, i.title,
                  i.status::text AS status, i.priority::text AS priority,
                  i.reported_by, i.assigned_to
           FROM issues i
           JOIN projects p ON p.project_id = i.project_id
           WHERE i.project_id = ANY($1::uuid[])
             AND i.status IN ('open', 'in_progress')
             AND (i.assigned_to = $2 OR i.reported_by = $2)
           ORDER BY i.last_updated DESC NULLS LAST
           LIMIT 75`,
          [pids, userId]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS c FROM issues
           WHERE project_id = ANY($1::uuid[])
             AND status IN ('open', 'in_progress')
             AND (assigned_to = $2 OR reported_by = $2)`,
          [pids, userId]
        ),
        pool.query(
          `SELECT p.project_id::text AS "projectId", p.name,
            COUNT(i.issue_id) FILTER (
              WHERE i.assigned_to = $2 OR i.reported_by = $2
            )::int AS "issueCount"
           FROM projects p
           LEFT JOIN issues i ON i.project_id = p.project_id
             AND (i.assigned_to = $2 OR i.reported_by = $2)
           WHERE p.project_id = ANY($1::uuid[])
           GROUP BY p.project_id, p.name
           ORDER BY p.name ASC`,
          [pids, userId]
        ),
        pool.query(
          `SELECT COUNT(DISTINCT user_id)::int AS c FROM project_members
           WHERE project_id = ANY($1::uuid[])`,
          [pids]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS c FROM issues
           WHERE project_id = ANY($1::uuid[])
             AND (assigned_to = $2 OR reported_by = $2)`,
          [pids, userId]
        ),
      ]);

      const folded = foldStatusRows(statusRes.rows);
      const pending = pendingRes.rows;
      const pendingTotal = pendingCountRes.rows[0]?.c ?? 0;

      return res.status(200).json({
        success: true,
        data: {
          view: "member",
          role: "developer",
          projects: projectCount,
          teamMembers: teamRes.rows[0]?.c ?? 0,
          openedCount: openedRes.rows[0]?.c ?? 0,
          assignedCount: assignedRes.rows[0]?.c ?? 0,
          pendingCount: pendingTotal,
          issues: involvedRes.rows[0]?.c ?? 0,
          activeIssues: folded.active,
          solvedIssues: folded.solved,
          unsolvedIssues: folded.unsolved,
          healthPercent: folded.healthPercent,
          byStatus: folded.byStatus,
          pendingIssues: mapPendingRows(pending),
          projectsChart: chartRes.rows,
        },
      });
    }

    if (role === "tester") {
      const [
        openedRes,
        assignedRes,
        statusRes,
        pendingRes,
        pendingCountRes,
        chartRes,
        teamRes,
      ] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS c FROM issues
           WHERE project_id = ANY($1::uuid[]) AND reported_by = $2`,
          [pids, userId]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS c FROM issues
           WHERE project_id = ANY($1::uuid[]) AND assigned_to = $2`,
          [pids, userId]
        ),
        pool.query(
          `SELECT i.status::text AS status, COUNT(*)::int AS c
           FROM issues i
           WHERE i.project_id = ANY($1::uuid[])
           GROUP BY i.status`,
          [pids]
        ),
        pool.query(
          `SELECT i.issue_id, i.project_id, p.name AS project_name, i.title,
                  i.status::text AS status, i.priority::text AS priority,
                  i.reported_by, i.assigned_to
           FROM issues i
           JOIN projects p ON p.project_id = i.project_id
           WHERE i.project_id = ANY($1::uuid[])
             AND i.status IN ('open', 'in_progress')
           ORDER BY i.last_updated DESC NULLS LAST
           LIMIT 75`,
          [pids]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS c FROM issues
           WHERE project_id = ANY($1::uuid[])
             AND status IN ('open', 'in_progress')`,
          [pids]
        ),
        projectsIssueCounts(pids),
        pool.query(
          `SELECT COUNT(DISTINCT user_id)::int AS c FROM project_members
           WHERE project_id = ANY($1::uuid[])`,
          [pids]
        ),
      ]);

      const folded = foldStatusRows(statusRes.rows);
      const pending = pendingRes.rows;
      const pendingTotal = pendingCountRes.rows[0]?.c ?? 0;

      return res.status(200).json({
        success: true,
        data: {
          view: "member",
          role: "tester",
          projects: projectCount,
          teamMembers: teamRes.rows[0]?.c ?? 0,
          openedCount: openedRes.rows[0]?.c ?? 0,
          assignedCount: assignedRes.rows[0]?.c ?? 0,
          pendingCount: pendingTotal,
          issues: folded.total,
          activeIssues: folded.active,
          solvedIssues: folded.solved,
          unsolvedIssues: folded.unsolved,
          healthPercent: folded.healthPercent,
          byStatus: folded.byStatus,
          pendingIssues: mapPendingRows(pending),
          projectsChart: chartRes.rows,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        view: "member",
        role,
        projects: projectCount,
        teamMembers: 0,
        openedCount: 0,
        assignedCount: 0,
        pendingCount: 0,
        issues: 0,
        activeIssues: 0,
        solvedIssues: 0,
        unsolvedIssues: 0,
        healthPercent: 100,
        byStatus: emptyByStatus(),
        pendingIssues: [],
        projectsChart: [],
      },
    });
  } catch (err) {
    console.error("getDashboardStats:", err.message);
    res.status(500).json({
      success: false,
      message: err.message || "Could not load dashboard stats",
    });
  }
}
