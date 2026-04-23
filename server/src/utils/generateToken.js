import jwt from "jsonwebtoken";

export const generateToken = (payload, res) => {

    const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});

    res.cookie("jwt",token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: (1000 * 60 * 60 * 24)*7,
    });
    return token;
};