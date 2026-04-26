import pool from "../db.js";

const getNotifications = async (req, res) =>{

    try{

        const result = await pool.query(

            `SELECT n.notif_id, n.message, n.type, n.is_read, n.created_at, n.issue_id, u.username AS triggered_by_username
            FROM notifications n
            LEFT JOIN users u ON n.triggered_by = u.user_id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC`,
            [req.user.user_id]

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


const markAsRead = async (req, res) =>{

    try{

        const id = req.params.id;

        const result = await pool.query(
            `UPDATE notifications
            SET is_read = true
            WHERE notif_id = $1 AND user_id = $2
            RETURNING notif_id`,
            [id, req.user.user_id]
        );

        if(result.rows.length===0){
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Notification marked as read"
        });
    
    }catch(error){
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const markAllAsRead = async (req, res) =>{

    try{

        const id = req.params.id;

        await pool.query(
            `UPDATE notifications
            SET is_read = true
            WHERE user_id = $1`,
            [req.user.user_id]
        );

        res.status(200).json({
            success: true,
            message: "All notifications marked as read"
        });
    
    }catch(error){
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export {getNotifications, markAsRead, markAllAsRead};