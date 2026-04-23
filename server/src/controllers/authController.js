import pool from "../db.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";

const register = async (req, res) => {

    try{
        const body = req.body;
        const {username, email, password, role} = body;
        
        if(!username){
            return res.status(400).json({
                success: false,
                message: 'Username is required'
            });

        }    

        if(!email){
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        } 

        if(!password){
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        } 

        const userExists = await pool.query(
            'SELECT * FROM users u WHERE u.email = $1',
            [email]
        );


        if(userExists.rows.length > 0){
                return res.status(400).json({
                    success: false,
                    message: "Email already in use"
                });
        }


        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (username, email, hashed_password, role) VALUES ($1, $2, $3, $4) RETURNING user_id, username, email, role, created_at',
            [username, email, hashedPassword, role]
        );

        const user = newUser.rows[0]

        const tokenPayload = {
            user_id: user.user_id, 
            username: user.username, 
            email: user.email, 
            role: user.role 
        };

        const token = generateToken(tokenPayload, res);



        res.status(201).json({
            success: true,
            data: user
        });

    }catch(error){
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const login = async (req, res) => {

    try{

        const {email, password} = req.body;

        if(!email){
            return res.status(400).json({
                success: false,
            message: "Email required"
            });
        }
        if(!password){
            return res.status(400).json({
                success: false,
            message: "Password required"
            });
        }

        const userCheck = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if(userCheck.rows.length===0){
            return res.status(400).json({
                success: false,
                message: "User does not exist"
            });
        }

        const user = userCheck.rows[0];

        const isValid = await bcrypt.compare(password, user.hashed_password);
        
        if(!isValid){

            return res.status(400).json({
                success: false,
                message: "Invalid Password"
            });

        }

        const tokenPayload = {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role
        };

        const token = generateToken(tokenPayload, res);
        const loginUser = {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role
            };
        res.status(200).json({
            success: true,
            data: loginUser
        });

    }catch(error){

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
    
};

const logout = async (req, res) => {
    res.cookie("jwt", "", {
        httpOnly: true,
        expires: new Date(0)
    });

    res.status(200).json({
        success: true,
        message: "Logged out successfully"
    });
};

const getMe = (req, res) => {
    res.status(200).json({
        success: true,
        data: req.user
    });
};

export {register, login, logout, getMe};