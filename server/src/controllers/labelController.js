import pool from "../db.js";

const getLabels = async (req, res) =>{

    try{

        const projectId = req.params.projectId;

        const projectCheck = await pool.query(
            `SELECT 1 FROM projects
            WHERE project_id = $1`,
            [projectId]
        );

        if(projectCheck.rows.length === 0){
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        if (req.user.role !== "admin") {
            const memberCheck = await pool.query(
                `SELECT 1 FROM project_members
                WHERE project_id = $1 AND user_id = $2`,
                [projectId, req.user.user_id]
            );
        
            if (memberCheck.rows.length === 0) {
                return res.status(403).json({
                success: false,
                message: "You are not a member of this project",
                });
            }
        }

        const result = await pool.query(
            `SELECT label_id, name, description, color_hex
            FROM labels
            WHERE project_id = $1
            ORDER BY name ASC`,
            [projectId]
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

const createLabels = async (req, res) =>{

    try{

        const projectId = req.params.projectId;
        const {name, description, color_hex} = req.body;

        if(!name || name.trim() === ""){
            return res.status(400).json({
                success: false,
                message: "Label name is required"
            });
        }

        const projectCheck = await pool.query(
            `SELECT 1 FROM projects
            WHERE project_id = $1`,
            [projectId]
        );

        if(projectCheck.rows.length === 0){
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        if (req.user.role !== "admin") {
            const memberCheck = await pool.query(
                `SELECT 1 FROM project_members
                WHERE project_id = $1 AND user_id = $2`,
                [projectId, req.user.user_id]
            );
        
            if (memberCheck.rows.length === 0) {
                return res.status(403).json({
                success: false,
                message: "You are not a member of this project",
                });
            }
        }

        const duplicateCheck = await pool.query(
            `SELECT 1 FROM labels 
            WHERE project_id = $1 AND name = $2`,
            [projectId, name]
        );

        if(duplicateCheck.rows.length > 0){
            return res.status(400).json({
                success: false,
                message: "Label already exists in this project"
            });
        }

        

        const result = await pool.query(
            `INSERT INTO labels (project_id, name, description, color_hex)
            VALUES ($1, $2, $3, $4)
            RETURNING label_id, name, description, color_hex`,
            [projectId, name, description || null, color_hex || null]
        );

        

        res.status(201).json({
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

const updateLabels = async (req, res) =>{

    try{

        const {projectId, labelId} = req.params;
        const {name, description, color_hex} = req.body;

        if (!name && !description && !color_hex){
            return res.status(400).json({
                success: false,
                message: "No fields provided to update"
            });
        }

        const labelCheck = await pool.query(
            `SELECT 1 FROM labels 
            WHERE label_id = $1 AND project_id = $2`,
            [labelId, projectId]
        );
    
        if (labelCheck.rows.length === 0){
            return res.status(404).json({
                success: false,
                message: "Label not found in this project"
            });
        }

        const result = await pool.query(
            `UPDATE labels SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            color_hex = COALESCE($3, color_hex)
            WHERE label_id = $4 AND project_id = $5
            RETURNING label_id, name, description, color_hex`,
            [name || null, description || null, color_hex || null, labelId, projectId]
        );

        

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

const deleteLabel = async (req, res) => {

  try {

    const {projectId, labelId} = req.params;
 

    const result = await pool.query(
      `DELETE FROM labels
       WHERE label_id = $1 AND project_id = $2
       RETURNING label_id, name`,
      [labelId, projectId]
    );
 
    if (result.rows.length === 0){
      return res.status(404).json({
        success: false,
        message: "Label not found in this project"
      });
    }
 
    res.status(200).json({
      success: true,
      message: `Label ${result.rows[0].name} deleted successfully`
    });

  }catch (error){
    console.log(error.message);
    res.status(500).json({
        success: false, 
        message: error.message 
    });
  }
};

const attachLabel = async (req, res) => {

    try{

        const issueId = req.params.issueId;
        const {label_id} = req.body;

        if(!label_id){
            return res.status(400).json({
                success: false,
                message: "label_id is required"
            });
        }

        const issueCheck = await pool.query(
            `SELECT project_id FROM issues 
            WHERE issue_id = $1`,
            [issueId]
        );
    
        if(issueCheck.rows.length === 0){
            return res.status(404).json({
                success: false,
                message: "Issue not found"
            });
        }


        const projectId = issueCheck.rows[0].project_id;

        if(req.user.role !== "admin"){

            const memberCheck = await pool.query(
                `SELECT 1 FROM project_members
                WHERE project_id = $1 AND user_id = $2`,
                [projectId, req.user.user_id]
            );
        
            if(memberCheck.rows.length === 0){

                return res.status(403).json({
                    success: false,
                    message: "You are not a member of this project"
                });
            }
        }

        const labelCheck = await pool.query(
            `SELECT 1 FROM labels 
            WHERE label_id = $1 AND project_id = $2`,
            [label_id, projectId]
        );
    
        if(labelCheck.rows.length === 0){
            return res.status(400).json({
                success: false,
                message: "Label does not belong to this project"
            });
        }

        const alreadyAttached = await pool.query(
            `SELECT 1 FROM issue_labels
            WHERE issue_id = $1 AND label_id = $2`,
            [issueId, label_id]
        );
    
        if(alreadyAttached.rows.length > 0){
            return res.status(400).json({
                success: false,
                message: "Label is already attached to this issue"
            });
        }

        await pool.query(
            `INSERT INTO issue_labels (issue_id, label_id)
            VALUES ($1, $2)`,
            [issueId, label_id]
        );
    
        res.status(201).json({
            success: true,
            message: "Label attached to issue successfully"
        });


    }catch(error){
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }


};

const detachLabel = async (req, res)=> {

    try {
        const {issueId, labelId} = req.params;
    
        const result = await pool.query(
            `DELETE FROM issue_labels
            WHERE issue_id = $1 AND label_id = $2
            RETURNING issue_id`,
            [issueId, labelId]
        );
    
        if(result.rows.length === 0){
            return res.status(404).json({
                success: false,
                message: "Label is not attached to this issue"
            });
        }
    
        res.status(200).json({
            success: true,
            message: "Label detached from issue successfully"
        });


    }catch (error){
        console.log(error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

export {getLabels, createLabels, updateLabels, deleteLabel, attachLabel, detachLabel};