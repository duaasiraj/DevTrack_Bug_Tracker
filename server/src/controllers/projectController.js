import pool from "../db.js";

/** Non-admins: project creator, or member with project_manager / project_lead role. */
async function canManageProject(conn, projectId, user) {
  if (user.role === "admin") return true;
  const r = await conn.query(
    `SELECT 1 FROM projects p
     WHERE p.project_id = $1
     AND (
       p.created_by = $2
       OR EXISTS (
         SELECT 1 FROM project_members pm
         WHERE pm.project_id = p.project_id
         AND pm.user_id = $2
         AND pm.project_role IN ('project_manager', 'project_lead')
       )
     )`,
    [projectId, user.user_id]
  );
  return r.rows.length > 0;
}

const getProjects = async (req, res) =>{

    try{
        
        const result = await pool.query(
            `SELECT p.project_id, p.name, p.description, p.status, p.created_by, p.created_at ,u.username AS created_by_username, pm.project_role, pm.joined_at
            FROM projects p
            JOIN project_members pm ON p.project_id = pm.project_id
            LEFT JOIN users u ON p.created_by = u.user_id
            WHERE pm.user_id = $1
            ORDER BY p.created_at DESC`,
            [req.user.user_id]
        );

        if(result.rows.length===0){
            return res.status(404).json({
                success: false,
                message: 'No projects found'
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows
        });

    }catch(error){
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

const getAllProjects = async (req, res) =>{

    try{
        if(req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can view all projects",
            });
        }
        
        const result = await pool.query(
            `SELECT p.project_id, p.name, p.description, p.status, p.created_by, p.created_at
            FROM projects p
            ORDER BY p.created_at DESC`
        );

        if(result.rows.length===0){
            return res.status(404).json({
                success: false,
                message: 'No projects found'
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows
        });

    }catch(error){
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

const getProjectById = async (req, res) =>{

    try{
        
        const id = req.params.id;

        const memberCheck = await pool.query(
            `SELECT 1 FROM project_members
            WHERE user_id = $1 AND project_id = $2`,
            [req.user.user_id, id]
        );


        if(memberCheck.rows.length === 0 && req.user.role !== "admin"){
        return res.status(403).json({
            success: false,
            message: "You are not a member of this project",
        });
        }

        const result = await pool.query(
            `SELECT p.project_id, p.name, p.description, p.status, p.created_by, p.created_at ,u.username AS created_by_username
            FROM projects p
            LEFT JOIn users u ON p.created_by = u.user_id
            WHERE p.project_id = $1`,
            [id]
        );

        if(result.rows.length===0){
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0],
        });

    }catch(error){
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

const createProject = async (req, res) =>{

    const client = await pool.connect();

    try{
        
        const {name, description, projectManagerId} = req.body;

        if(!name){
            return res.status(400).json({
                success: false,
                message: "Project name is required",
            });
        }

        if(!projectManagerId){
            return res.status(400).json({
                success: false,
                message: "A project manager is required",
            });
        }

        // Verify the project manager user exists
        const pmCheck = await client.query(
            `SELECT user_id, username FROM users WHERE user_id = $1`,
            [projectManagerId]
        );
        if(pmCheck.rows.length === 0){
            return res.status(404).json({
                success: false,
                message: "Project manager user not found",
            });
        }
        
        await client.query("BEGIN");

        const projResult = await client.query(
            `INSERT INTO projects (name, description, created_by)
            VALUES ($1, $2, $3)
            RETURNING project_id, name, description, status, created_at`,
            [name, description || null, req.user.user_id]
        );

        const project = projResult.rows[0]

        // Add creator as project_lead (only if they are not the same as the PM)
        if(String(req.user.user_id) !== String(projectManagerId)){
            await client.query(
                `INSERT INTO project_members (project_id, user_id, project_role)
                VALUES ($1, $2, $3)`,
                [project.project_id, req.user.user_id, "project_lead"]
            );
        }

        // Add the chosen project manager
        await client.query(
            `INSERT INTO project_members (project_id, user_id, project_role)
            VALUES ($1, $2, $3)
            ON CONFLICT (project_id, user_id) DO UPDATE SET project_role = 'project_manager'`,
            [project.project_id, projectManagerId, "project_manager"]
        );

        await client.query(
            `INSERT INTO activity_log (project_id, user_id, issue_id, action_performed, details)
            VALUES ($1, $2, NULL, 'created', $3)`,
            [project.project_id, req.user.user_id, `Project created: ${project.name}`]
        );

        await client.query("COMMIT");
 
        res.status(201).json({
        success: true,
        data: project,
        });

    }catch(error){
        await client.query("ROLLBACK");
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally{
        client.release();
    }


};

const updateProject = async (req, res) =>{

    try{
        
        const id = req.params.id;
        const {name, description, status} = req.body;

         if(!name && !description && !status){
            return res.status(400).json({
                success: false,
                message: "No fields provided to update"
            });
        }

        if(req.user.role !== "admin"){
            const ok = await canManageProject(pool, id, req.user);
            if (!ok) {
                return res.status(403).json({
                    success: false,
                    message: "Only admins or project leads/managers for this project can update it"
                });
            }
        }

        const result = await pool.query(

            `UPDATE projects SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            status = COALESCE($3, status)
            where project_id = $4
            RETURNING project_id, name, description, status, created_at`,
            [name || null, description || null, status || null, id]

        );

        if(result.rows.length===0){
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }    

        res.status(200).json({
        success: true,
        data: result.rows[0]
        });

    }catch(error){
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

const deleteProject = async (req, res) =>{

    try{
    
        const id = req.params.id;

        if(req.user.role !== "admin"){
            const ok = await canManageProject(pool, id, req.user);
            if (!ok) {

                return res.status(403).json({
                    success: false,
                    message: "Only admins or project leads/managers for this project can delete it"
                });

            }

        }


        const result = await pool.query(
            `DELETE FROM projects
            WHERE project_id = $1
            RETURNING project_id, name`,
            [id]
        );
        
        if(result.rows.length===0){
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

         res.status(200).json({
            success: true,
            message: `Project ${result.rows[0].name} deleted successfully`
        });

    }catch(error){
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

const getMembers = async (req, res) =>{

    try{
        
        const id = req.params.id;
        
        const memberCheck = await pool.query(
            `SELECT 1 FROM project_members
            WHERE user_id = $1 AND project_id = $2`,
            [req.user.user_id, id]
        );


        if(memberCheck.rows.length === 0 && req.user.role !== "admin"){
        return res.status(403).json({
            success: false,
            message: "You are not a member of this project"
        });
        }

        const result = await pool.query(
            `SELECT u.user_id, u.username, u.role, pm.project_role, pm.joined_at
            FROM project_members pm
            JOIN users u ON u.user_id = pm.user_id
            WHERE pm.project_id = $1
            ORDER BY pm.joined_at DESC`,
            [id]
        );


        res.status(200).json({
            success: true,
            data: result.rows
        });

    }catch(error){
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }    

};

const addMember = async (req, res) =>{

    const client = await pool.connect();

    try{
        
        const id = req.params.id;
        const {userId, projRole} = req.body;

        if(!userId){
            return res.status(400).json({
                success: false,
                message: "user_id is required"
            });
        }

        if(req.user.role !== "admin"){
            const ok = await canManageProject(pool, id, req.user);
            if(!ok){

                return res.status(403).json({
                    success: false,
                    message: "Only admins or project leads/managers for this project can add members"
                });

            }

        }

        const projectCheck = await client.query(
            `SELECT 1 FROM projects 
            WHERE project_id = $1`,
            [id]
        );
        
        if (projectCheck.rows.length === 0) {
        
        return res.status(404).json({ 
            success: false, 
            message: "Project not found" 
        });
        }

        const userCheck = await client.query(
            `SELECT user_id, username FROM users 
            WHERE user_id = $1`,
            [userId]
        );

        if (userCheck.rows.length === 0) {
            
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }


        const alreadyMember = await client.query(
            `SELECT 1 FROM project_members
            WHERE project_id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (alreadyMember.rows.length !== 0) {
            
            return res.status(400).json({ 
                success: false, 
                message: "User already in this project" 
            });
        }
        await client.query("BEGIN");
        const newUser = await client.query(
            `INSERT INTO project_members (project_id, user_id, project_role)
            VALUES ($1, $2, $3)
            RETURNING project_id, user_id, project_role`,
            [id, userId, projRole || "member"]
        );

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            data: newUser.rows[0]
        });

    }catch(error){
        await client.query("ROLLBACK");
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally{
        client.release();
    }

};

const removeMember = async (req, res) =>{

    try{
        
        const {id, userId} = req.params;

        if(req.user.role !== "admin"){
            const ok = await canManageProject(pool, id, req.user);
            if(!ok){

                return res.status(403).json({
                    success: false,
                    message: "Only admins or project leads/managers for this project can remove members"
                });

            }

        }

        if (userId === req.user.user_id) {
            return res.status(400).json({
                success:false,
                message:"Project lead cannot remove themselves"
            });
        }

        const result = await pool.query(
            `DELETE FROM project_members
            WHERE project_id = $1 AND user_id = $2
            RETURNING user_id`,
            [id, userId]
        );

        if(result.rows.length === 0){
            return res.status(404).json({
                success: false,
                message: "Member not found in this project"
            });
        }

        res.status(200).json({
            success: true,
            message: "Member removed from project successfully"
        });

    }catch(error){
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

const updateMemberRole = async (req,res) => {

  try {
    const {id, userId} = req.params;
    const {projRole} = req.body;

    if (!projRole) {
      return res.status(400).json({
        success:false,
        message:"projectRole required"
      });
    }

    if(req.user.role !== "admin"){
        const ok = await canManageProject(pool, id, req.user);
        if(!ok){

            return res.status(403).json({
                success: false,
                message: "Only admins or project leads/managers for this project can change member roles"
            });

        }

    }

    const result = await pool.query(
      `UPDATE project_members SET project_role = $1
      WHERE project_id = $2
      AND user_id = $3
      RETURNING project_id, user_id, project_role, joined_at`,
      [projRole, id, userId]
    );

    if (result.rows.length===0) {
      return res.status(404).json({
        success:false,
        message:"Member not found"
      });
    }

    res.status(200).json({
      success:true,
      data: result.rows[0]
    });

  } catch(error){
    console.error(error.message);

    res.status(500).json({
      success:false,
      message:error.message
    });
  }
};

const getProjectIssueLog = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const memberCheck = await pool.query(
      `SELECT 1 FROM project_members
      WHERE user_id = $1 AND project_id = $2`,
      [req.user.user_id, projectId]
    );

    if (memberCheck.rows.length === 0 && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this project",
      });
    }

    const projectExists = await pool.query(
      `SELECT 1 FROM projects WHERE project_id = $1`,
      [projectId]
    );
    if (projectExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const result = await pool.query(
      `SELECT * FROM (
        SELECT
          'status_change'::text AS entry_type,
          h.changed_at AS occurred_at,
          h.issue_id,
          i.title AS issue_title,
          h.changed_by AS actor_id,
          u.username AS actor_username,
          h.old_status::text AS old_status,
          h.new_status::text AS new_status,
          NULL::text AS comment_preview,
          h.history_id::text AS entry_id
        FROM issue_status_history h
        JOIN issues i ON i.issue_id = h.issue_id
        LEFT JOIN users u ON u.user_id = h.changed_by
        WHERE i.project_id = $1
        UNION ALL
        SELECT
          'comment'::text AS entry_type,
          c.created_at AS occurred_at,
          c.issue_id,
          i.title AS issue_title,
          c.user_id AS actor_id,
          u.username AS actor_username,
          NULL::text AS old_status,
          NULL::text AS new_status,
          LEFT(TRIM(c.content), 280) AS comment_preview,
          c.comment_id::text AS entry_id
        FROM comments c
        JOIN issues i ON i.issue_id = c.issue_id
        LEFT JOIN users u ON u.user_id = c.user_id
        WHERE i.project_id = $1
      ) AS combined
      ORDER BY combined.occurred_at DESC
      LIMIT 300`,
      [projectId]
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

const getProjectStats = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const memberCheck = await pool.query(
      `SELECT 1 FROM project_members
      WHERE user_id = $1 AND project_id = $2`,
      [req.user.user_id, projectId]
    );

    if (memberCheck.rows.length === 0 && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this project",
      });
    }

    const projectExists = await pool.query(
      `SELECT 1 FROM projects WHERE project_id = $1`,
      [projectId]
    );
    if (projectExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const [totalRes, statusRes, priorityRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total FROM issues WHERE project_id = $1`,
        [projectId]
      ),
      pool.query(
        `SELECT i.status::text AS status, COUNT(*)::int AS count
        FROM issues i
        WHERE i.project_id = $1
        GROUP BY i.status`,
        [projectId]
      ),
      pool.query(
        `SELECT i.priority::text AS priority, COUNT(*)::int AS count
        FROM issues i
        WHERE i.project_id = $1
        GROUP BY i.priority`,
        [projectId]
      ),
    ]);

    const totalIssues = totalRes.rows[0]?.total ?? 0;
    const byStatus = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    for (const row of statusRes.rows) {
      if (Object.prototype.hasOwnProperty.call(byStatus, row.status)) {
        byStatus[row.status] = row.count;
      }
    }
    const resolvedCount = (byStatus.resolved || 0) + (byStatus.closed || 0);
    const unresolvedCount = Math.max(0, totalIssues - resolvedCount);

    const byPriority = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const row of priorityRes.rows) {
      if (Object.prototype.hasOwnProperty.call(byPriority, row.priority)) {
        byPriority[row.priority] = row.count;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        total_issues: totalIssues,
        by_status: byStatus,
        resolved_count: resolvedCount,
        unresolved_count: unresolvedCount,
        by_priority: byPriority,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export {updateMemberRole, getAllProjects, getProjects, getProjectById, createProject, updateProject, deleteProject, getMembers, addMember, removeMember, getProjectIssueLog, getProjectStats};

