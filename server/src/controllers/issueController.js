import pool from "../db.js";
import {createNotification} from "../utils/notificationHelper.js"

async function mergeIssueLabels(rows) {
    if (!rows?.length) return rows;
    const ids = rows.map((r) => r.issue_id);
    const { rows: labRows } = await pool.query(
        `SELECT il.issue_id, l.label_id, l.name, l.color_hex
        FROM issue_labels il
        JOIN labels l ON l.label_id = il.label_id
        WHERE il.issue_id = ANY($1::uuid[])`,
        [ids]
    );
    const map = {};
    for (const r of labRows) {
        if (!map[r.issue_id]) map[r.issue_id] = [];
        map[r.issue_id].push({
            label_id: r.label_id,
            name: r.name,
            color_hex: r.color_hex,
        });
    }
    return rows.map((issue) => ({
        ...issue,
        labels: map[issue.issue_id] || [],
    }));
}

const getIssues = async(req, res) =>{
    
    try{

        const {project_id, status, priority, assigned_to, type, scope} = req.query;
        const memberProjectsScope = scope === "member_projects";

        if(!project_id && !memberProjectsScope){
            return res.status(400).json({
                success: false,
                message: "project_id is required unless scope=member_projects"
            });
        }

        if(project_id && memberProjectsScope){
            return res.status(400).json({
                success: false,
                message: "Cannot use project_id together with scope=member_projects"
            });
        }

        let query;
        const values = [];
        let count = 1;

        if(memberProjectsScope){
            query = `SELECT i.issue_id, i.project_id, p.name AS project_name, i.title, i.description, i.type, i.priority, i.status, i.created_at, i.last_updated, i.resolved_at, u1.username AS reported_by_username, u2.username AS assigned_to_username, i.reported_by, i.assigned_to
        FROM issues i
        JOIN projects p ON i.project_id = p.project_id
        LEFT JOIN users u1 ON i.reported_by = u1.user_id
        LEFT JOIN users u2 ON i.assigned_to = u2.user_id
        WHERE `;

            if(req.user.role === "admin"){
                query += "1=1";
            } else {
                query += `i.project_id IN (SELECT project_id FROM project_members WHERE user_id = $${count})`;
                values.push(req.user.user_id);
                count++;
            }
        } else {

        if(req.user.role !== "admin"){
            
            const memberCheck = await pool.query(
                `SELECT 1 FROM project_members
                WHERE project_id = $1 AND user_id = $2`,
                [project_id, req.user.user_id]
            );


            if(memberCheck.rows.length===0){
                return res.status(403).json({
                    success: false,
                    message: "You are not a member of this project"
                });
            }

        }

        query = `SELECT i.issue_id, i.project_id, i.title, i.description, i.type, i.priority, i.status, i.created_at, i.last_updated, i.resolved_at, u1.username AS reported_by_username, u2.username AS assigned_to_username, i.reported_by, i.assigned_to
        FROM issues i
        LEFT JOIN users u1 ON i.reported_by = u1.user_id
        LEFT JOIN users u2 ON i.assigned_to = u2.user_id
        WHERE i.project_id = $${count}`;

        values.push(project_id);
        count++;

        }

        if(status){
            query += ` AND i.status = $${count}`;
            values.push(status);
            count++;
        }

        if(priority){
            query += ` AND i.priority = $${count}`;
            values.push(priority);
            count++;
        }

        if(assigned_to){
            if (
                req.user.role === "developer" &&
                String(assigned_to) === String(req.user.user_id)
            ) {
                query += ` AND (i.assigned_to = $${count} OR i.reported_by = $${count})`;
                values.push(assigned_to);
                count++;
            } else {
                query += ` AND i.assigned_to = $${count}`;
                values.push(assigned_to);
                count++;
            }
        }

        if(type){
            query += ` AND i.type = $${count}`;
            values.push(type);
            count++;
        }

        query += ` ORDER BY i.created_at DESC`;

        const result = await pool.query(query, values);

        const data = await mergeIssueLabels(result.rows);

        res.status(200).json({
            success: true,
            data
        });


    }catch(error){
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

const getIssueById = async (req, res) =>{

    try{

        const id = req.params.id;

        const result = await pool.query(
            `SELECT i.issue_id, i.title, i.description, i.type, i.priority, i.status, i.created_at, i.last_updated, i.resolved_at, i.project_id, u1.username AS reported_by_username, i.reported_by, u2.username AS assigned_to_username, i.assigned_to
            FROM issues i
            LEFT JOIN users u1 ON i.reported_by = u1.user_id
            LEFT JOIN users u2 ON i.assigned_to = u2.user_id
            WHERE i.issue_id = $1`,
            [id]
        );

        if (result.rows.length === 0){

            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });

        }


        const issue = result.rows[0];

        if(req.user.role !== "admin"){
            
            const memberCheck = await pool.query(
                `SELECT 1 FROM project_members
                WHERE project_id = $1 AND user_id = $2`,
                [issue.project_id, req.user.user_id]
            );


            if(memberCheck.rows.length===0){
                return res.status(403).json({
                    success: false,
                    message: "You are not a member of this project",
                });
            }

        }


        const labels = await pool.query(
            `SELECT l.label_id, l.name, l.color_hex
            FROM issue_labels il
            JOIN labels l ON il.label_id = l.label_id
            WHERE il.issue_id = $1`,
            [id]
        );

        res.status(200).json({
            success: true,
            data: { ...issue, 
                labels: labels.rows}
        });


    }catch(error){
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

const createIssue = async (req, res) =>{

    try {
    
        const {project_id, title, description, type, priority, label_ids} = req.body;

        if(!project_id){
            return res.status(400).json({
                success: false,
                message: "project_id is required as a query parameter"
            });
        }

        if(!title){
            return res.status(400).json({
                success: false,
                message: "title is required as a query parameter"
            });
        }

        if(req.user.role !== "admin"){
            
            const memberCheck = await pool.query(
                `SELECT 1 FROM project_members
                WHERE project_id = $1 AND user_id = $2`,
                [project_id, req.user.user_id]
            );


            if(memberCheck.rows.length===0){
                return res.status(403).json({
                    success: false,
                    message: "You are not a member of this project"
                });
            }

        }

        const result = await pool.query(

            `INSERT INTO issues (project_id, reported_by, title, description, type, priority)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING issue_id, project_id, title, description, type, priority, status, created_at`,
            [project_id, req.user.user_id, title, description || null, type || "bug", priority || "medium"]

        );

        const created = result.rows[0];

        if (Array.isArray(label_ids) && label_ids.length > 0) {
            for (const lid of label_ids) {
                if (!lid) continue;
                const ok = await pool.query(
                    `SELECT 1 FROM labels WHERE label_id = $1 AND project_id = $2`,
                    [lid, project_id]
                );
                if (ok.rows.length > 0) {
                    await pool.query(
                        `INSERT INTO issue_labels (issue_id, label_id) VALUES ($1, $2)
                        ON CONFLICT (issue_id, label_id) DO NOTHING`,
                        [created.issue_id, lid]
                    );
                }
            }
        }


        res.status(201).json({
            success: true,
            data: created
        });

    }catch(error){
        console.log(error.message);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }

};

const updateIssue = async(req, res) =>{

    const client = await pool.connect();

    try {
        
        const id = req.params.id;
        const {title, description, type, priority, status, reason} = req.body;

        if (!title && !description && !type && !priority && !status){
        
        return res.status(400).json({
            success: false,
            message: "No fields provided to update",
        });
        }



        const curr = await pool.query(
            `SELECT * FROM issues WHERE issue_id = $1`,
            [id]
        );

        if (curr.rows.length === 0){
            return res.status(404).json({ 
                success: false, 
                message: "Issue not found" 
            });
        }

        const issue = curr.rows[0];

        if(req.user.role !== "admin"){
            
            const memberCheck = await pool.query(
                `SELECT 1 FROM project_members
                WHERE project_id = $1 AND user_id = $2`,
                [issue.project_id, req.user.user_id]
            );


            if(memberCheck.rows.length===0){
                return res.status(403).json({
                    success: false,
                    message: "You are not a member of this project"
                });
            }

        }

        if (status==="closed" && req.user.role !== "admin" && req.user.role !== "project_manager"){
            return res.status(403).json({
                success: false,
                message: "Only admins or project managers can close an issue"
            });
        }

        if (
            req.user.role === "developer" &&
            issue.assigned_to !== req.user.user_id &&
            issue.reported_by !== req.user.user_id
        ) {
            return res.status(403).json({
                success: false,
                message: "Developers can only update issues assigned to them or that they reported",
            });
        }

        await client.query("BEGIN");

        const result = await client.query(
            `UPDATE issues SET
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                type = COALESCE($3, type),
                priority = COALESCE($4, priority),
                status = COALESCE($5, status)
            WHERE issue_id = $6
            RETURNING *`,
            [title || null, description || null, type || null, priority || null, status || null,id]
        );

        if(status && status !== issue.status){
            await client.query(
                `INSERT INTO issue_status_history (issue_id, changed_by, old_status, new_status, reason)
                VALUES ($1, $2, $3, $4, $5)`,
                [id, req.user.user_id, issue.status, status, reason || null]
            );
        }

        await client.query("COMMIT");

        res.status(200).json({
            success: true,
            data: result.rows[0],
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

const assignIssue = async(req, res) =>{

    const client = await pool.connect();


    try{

        const id = req.params.id;
        const {assigned_to} = req.body;

        if(!assigned_to){
            return res.status(400).json({
                success: false,
                message: "assigned_to (user_id) is required",
            });
        }



        const current = await pool.query(
            `SELECT * FROM issues WHERE issue_id = $1`,
            [id]
        );

        if(current.rows.length===0){
            return res.status(404).json({
                success: false, 
                message: "Issue not found" 
            });
        }

        const issue = current.rows[0];
        
        const managerCheck = await pool.query(
            `SELECT 1 FROM project_members
            WHERE project_id = $1 AND user_id = $2`,
            [issue.project_id, req.user.user_id]
        );

        if(req.user.role !== "admin"){
        if(managerCheck.rows.length===0){
            return res.status(403).json({
                success: false,
                message: "You cannot assign issues as you are not a part of this project"
            });
        }
    }
            
        const memberCheck = await pool.query(
            `SELECT 1 FROM project_members
            WHERE project_id = $1 AND user_id = $2`,
            [issue.project_id, assigned_to]
        );


        if(memberCheck.rows.length===0){
            return res.status(403).json({
                success: false,
                message: "Issue cannot be assigned to member who is not part of this project"
            });
        }

        if (issue.assigned_to === assigned_to) {
            return res.status(400).json({
                success:false,
                message:"Issue already assigned to this user"
            });
        }

        await client.query("BEGIN");

        const result = await client.query(
            `UPDATE issues SET 
            assigned_to = $1, 
            assigned_by = $2
            WHERE issue_id = $3
            RETURNING *`,
            [assigned_to, req.user.user_id, id]
        );

            
        await client.query("COMMIT");

        try{
        await createNotification(assigned_to, id, req.user.user_id, `You have been assigned issue: ${issue.title}`, "assigned");
        }catch(notifError){
            console.log("Notification failed:", notifError.message);
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    }catch(error){
        await client.query("ROLLBACK");
        return res.status(500).json({
            success: false,
            message: error.message
        });
    } finally{
        client.release();
    }

};

const deleteIssue = async (req, res) => {

    try{

        const id = req.params.id;

        const current = await pool.query(
            `SELECT * FROM issues WHERE issue_id = $1`,
            [id]
        );

        if(current.rows.length===0){
            return res.status(404).json({
                success: false, 
                message: "Issue not found" 
            });
        }

        const issue = current.rows[0];

        if(req.user.role !== "admin" && req.user.role !== "project_manager" && req.user.user_id !== issue.reported_by){
            return res.status(403).json({
                success: false,
                message: "Only admins, project managers, or the issue reporter can delete an issue"
            });
        }

        await pool.query(
            "DELETE FROM issues WHERE issue_id = $1", 
            [id]
        );

        res.status(200).json({
            success: true,
            message: "Issue deleted successfully"
        });

    }catch(error){
        console.log(error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }

}

const getIssueHistory = async (req, res) => {

    try{

        const id = req.params.id;

        const issueCheck = await pool.query(
            `SELECT * FROM issues WHERE issue_id = $1`,
            [id]
        );

        if(issueCheck.rows.length===0){
            return res.status(404).json({
                success: false, 
                message: "Issue not found" 
            });
        }

        if(req.user.role !== "admin"){
            
            const memberCheck = await pool.query(
                `SELECT 1 FROM project_members
                WHERE project_id = $1 AND user_id = $2`,
                [issueCheck.rows[0].project_id, req.user.user_id]
            );


            if(memberCheck.rows.length===0){
                return res.status(403).json({
                    success: false,
                    message: "You are not a member of this project"
                });
            }
        }

        const result = await pool.query(
            `SELECT h.history_id, h.old_status, h.new_status, h.reason, h.changed_at, u.username AS changed_by_username
            FROM issue_status_history h
            LEFT JOIN users u ON h.changed_by = u.user_id
            WHERE h.issue_id = $1
            ORDER BY h.changed_at ASC`,
            [id]
        );

        res.status(200).json({
            success: true,
            data: result.rows
        });

    }catch(error){
        console.log(error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }

}

export {getIssues, getIssueById, createIssue, updateIssue, assignIssue, deleteIssue, getIssueHistory};