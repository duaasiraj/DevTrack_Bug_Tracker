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
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/users — returns all users for the Dashboard user table
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, username, email, role
       FROM users
       ORDER BY username ASC`
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/users/:userId/role — update a user's system role
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ success: false, message: "role is required" });
    }

    // Normalise: accept "project manager" or "project_manager"
    const normalised = role.trim().toLowerCase().replace(' ', '_');
    const allowed = ['admin', 'project_manager', 'developer', 'tester'];
    if (!allowed.includes(normalised)) {
      return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${allowed.join(', ')}` });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1 WHERE user_id = $2
       RETURNING user_id, username, email, role`,
      [normalised, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/users/:userId — permanently delete a user
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent self-deletion
    if (String(userId) === String(req.user.user_id)) {
      return res.status(400).json({ success: false, message: "Cannot delete your own account" });
    }

    const result = await pool.query(
      `DELETE FROM users WHERE user_id = $1 RETURNING user_id, username`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: `User ${result.rows[0].username} deleted successfully`,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export { getAdminActivityLog, getUsers, updateUserRole, deleteUser };