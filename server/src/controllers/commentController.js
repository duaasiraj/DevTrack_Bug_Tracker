import pool from "../db.js";
import {createNotification} from "../utils/notificationHelper.js";

const getComments = async (req, res) =>{

    try{
            
        const {issueId} = req.params;

        const issueCheck = await pool.query(
            `SELECT project_id FROM issues WHERE issue_id = $1`,
            [issueId]
        );

        if(issueCheck.rows.length===0){
            return res.status(404).json({
                success: false,
                message: "Issue not found",
            });
        }

        if(req.user.role !== "admin"){

            const memberCheck = await pool.query(

                `SELECT 1 FROM project_members
                WHERE project_id = $1 AND user_id = $2`,
                [issueCheck.rows[0].project_id, req.user.user_id]
            );
        
            if(memberCheck.rows.length === 0){
                return res.status(403).json({
                    success: false,
                    message: "You are not a member of this project",
                });
            }
        }
    
        const result = await pool.query(
            `SELECT c.comment_id, c.content, c.created_at, u.user_id, u.username
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.issue_id = $1
            ORDER BY c.created_at DESC`,
            [issueId]
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

const createComment = async (req, res) =>{

    try{

        const {issueId} = req.params;
        const {content} = req.body;

        if(!content || content.trim() === ""){
            return res.status(400).json({
                success: false,
                message: "Comment content is required",
            });
        }

        const issueCheck = await pool.query(
            `SELECT project_id, assigned_to, title
            FROM issues 
            WHERE issue_id = $1`,
            [issueId]
        );

        if (issueCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Issue not found",
            });
        }
    
        const issue = issueCheck.rows[0];

        if(req.user.role !== "admin"){

            const memberCheck = await pool.query(

                `SELECT 1 FROM project_members
                WHERE project_id = $1 AND user_id = $2`,
                [issue.project_id, req.user.user_id]
            );
        
            if(memberCheck.rows.length === 0){
                return res.status(403).json({
                    success: false,
                    message: "You are not a member of this project",
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO comments (issue_id, user_id, content)
            VALUES ($1, $2, $3)
            RETURNING comment_id, content, created_at`,
            [issueId, req.user.user_id, content.trim()]
        );

        if(issue.assigned_to){

            try{

                await createNotification(issue.assigned_to, issueId, req.user.user_id, `New comment on issue: ${issue.title}`, "commented");

            }catch(notifError){
                console.log("Notification failed:", notifError.message);
            }

        }

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

const deleteComment = async (req, res) =>{

    try{
            
        const {id} = req.params;

        const commentCheck = await pool.query(
            `SELECT * FROM comments WHERE comment_id = $1`,
            [id]
        );

        if(commentCheck.rows.length===0){
            return res.status(404).json({
                success: false,
                message: "Comment not found",
            });
        }

        const comment = commentCheck.rows[0];

        if (req.user.role !== "admin" && comment.user_id !== req.user.user_id) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own comments",
            });
        }
    
        await pool.query(
            `DELETE FROM comments WHERE comment_id = $1`,
            [id]
        );

        res.status(200).json({
            success: true,
            message:"Comment deleted successfully" 
        });
    
    }catch(error){
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export {getComments, createComment, deleteComment};