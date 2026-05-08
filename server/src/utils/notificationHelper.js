import pool from "../db.js";

const createNotification = async (userId, issueId, triggeredBy, message, type) => {
  if (userId === triggeredBy) {
    return;
  }
  await pool.query(
    `INSERT INTO notifications (user_id, issue_id, triggered_by, message, type)
        VALUES ($1, $2, $3, $4, $5)`,
    [userId, issueId, triggeredBy, message, type]
  );
};

/**
 * All admins (org-wide) + project managers/leads on this project.
 * Excludes the actor. Same user receives at most one notification per call.
 */
async function notifyAdminsAndProjectManagers(
  projectId,
  issueId,
  actorUserId,
  message,
  type
) {
  const [adminsRes, pmsRes] = await Promise.all([
    pool.query(`SELECT user_id FROM users WHERE role = 'admin'`),
    pool.query(
      `SELECT DISTINCT pm.user_id
       FROM project_members pm
       INNER JOIN users u ON u.user_id = pm.user_id
       WHERE pm.project_id = $1
         AND (
           pm.project_role IN ('project_manager', 'project_lead')
           OR u.role = 'project_manager'
         )`,
      [projectId]
    ),
  ]);
  const target = new Set();
  for (const r of adminsRes.rows) target.add(String(r.user_id));
  for (const r of pmsRes.rows) target.add(String(r.user_id));
  target.delete(String(actorUserId));
  for (const uid of target) {
    await createNotification(uid, issueId, actorUserId, message, type);
  }
}

/**
 * Developers and testers who are assignee or reporter on the issue.
 * Excludes the actor. De-duplicates if assignee === reporter.
 */
async function notifyDeveloperTesterStakeholders(
  issueId,
  assigneeId,
  reporterId,
  actorUserId,
  message,
  type
) {
  const raw = [assigneeId, reporterId].filter(Boolean).map(String);
  const unique = [...new Set(raw)].filter((id) => id !== String(actorUserId));
  if (unique.length === 0) return;

  const { rows } = await pool.query(
    `SELECT user_id FROM users
     WHERE user_id = ANY($1::uuid[]) AND role IN ('developer', 'tester')`,
    [unique]
  );
  for (const row of rows) {
    await createNotification(row.user_id, issueId, actorUserId, message, type);
  }
}

export {
  createNotification,
  notifyAdminsAndProjectManagers,
  notifyDeveloperTesterStakeholders,
};
