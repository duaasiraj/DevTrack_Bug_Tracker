import pool from "../db.js";

const getAdminActivityLog = async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || "200"), 10) || 200, 1),
      500
    );

    const result = await pool.query(
      `SELECT
        al.log_id,
        al.performed_at,
        al.action_performed,
        al.details,
        al.issue_id,
        al.project_id,
        u.username AS actor_username,
        p.name AS project_name,
        i.title AS issue_title
      FROM activity_log al
      LEFT JOIN users u ON u.user_id = al.user_id
      LEFT JOIN projects p ON p.project_id = al.project_id
      LEFT JOIN issues i ON i.issue_id = al.issue_id
      ORDER BY al.performed_at DESC
      LIMIT $1`,
      [limit]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { getAdminActivityLog };
