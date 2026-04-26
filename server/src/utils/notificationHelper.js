import pool from "../db.js"

const createNotification = async(userId, issueId, triggeredBy, message, type) =>{
    if(userId===triggeredBy){
        return;
    }
    await pool.query(
        `INSERT INTO notifications (user_id, issue_id, triggered_by, message, type)
        VALUES ($1, $2, $3, $4, $5)`,
        [userId, issueId, triggeredBy, message, type]
    );
};

export {createNotification};