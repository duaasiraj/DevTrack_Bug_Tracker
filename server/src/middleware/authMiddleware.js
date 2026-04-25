import jwt from "jsonwebtoken";
import pool from "../db.js";

export const authMiddleware = async (req, res, next) =>{

    let token;
    token = req.cookies.jwt;

    if(!token){
        return res.status(401).json({
            success: false,
            message: "Not authorized. No token provided"
        });

    }

    try{

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await pool.query(
            'SELECT user_id, username, email, role FROM users WHERE user_id = $1',
            [decoded.user_id]
        );

        if(user.rows.length === 0){
            return res.status(401).json({
                success: false,
                message: "User does not exist"
            });
        }

        req.user = user.rows[0];
        next();

    }catch(error){
        return res.status(401).json({
            success: false,
            message: "Not authorized, token failed."
        });
    }


};