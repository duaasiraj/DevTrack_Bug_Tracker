import pool from "../db.js";
import bcrypt from "bcryptjs";

const getAllUsers = async (req, res) => {

    try{

        const result = await pool.query(

            `SELECT user_id, username, email, role, created_at
            FROM users
            ORDER BY created_at DESC`

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

const getUserById = async (req, res) => {

    try{
        
        const result = await pool.query(
            `SELECT user_id, username, email, role, created_at
            FROM users
            WHERE user_id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0){

            return res.status(400).json({
                success: false,
                message: 'User not found'
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

const updateUser = async(req, res) => {

    try{
        
        const id = req.params.id;
        const {username, email, password, role} = req.body;

        if(req.user.role !== "admin" && id !== req.user.user_id){
            return res.status(403).json({
                success: false,
                message: "You can only update your own profile.",
            });
        }

        if(role && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can update roles",
            });
        }

        const exists = await pool.query(
            `SELECT * FROM users
            WHERE user_id = $1`,
            [id]
        );

        if(exists.rows.length===0){
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }

        let hashedPassword = null;
        if(password){
            hashedPassword = await bcrypt.hash(password, 10);
        }

        if (!username && !email && !password && !role) {
            return res.status(400).json({
                success: false,
                message: "No fields provided to update",
            });
        }

        const result = await pool.query(
            `UPDATE users SET
            username = COALESCE($1, username),
            email = COALESCE($2, email),
            hashed_password = COALESCE($3, hashed_password),
            role = COALESCE($4, role)
            WHERE user_id = $5
            RETURNING user_id, username, email, role, created_at`,
            [username || null, email || null, hashedPassword || null, role || null, id]
        );

        res.status(200).json({
            success: true,
            data: result.rows[0],
        });

    }catch(error){
        console.log(error.message);

        if (error.code === "23505"){
            return res.status(400).json({
                success: false,
                message: "Username or email already in use",
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

const deleteUser = async(req, res) => {

    try{

        const id = req.params.id;

        if(req.user.user_id === id){

            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account"
            });

        }


        const result = await pool.query(
            `DELETE FROM users
            WHERE user_id = $1
            RETURNING user_id, username`,
            [id]
        );

        if (result.rows.length === 0){

            return res.status(400).json({
                success: false,
                message: 'User not found'
            });

        }

        res.status(200).json({
            success: true,
            message: `User ${result.rows[0].username} deleted successfully`
        });

    }catch(error){
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

export {getAllUsers, getUserById, updateUser, deleteUser}