import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';


import authRoutes from "./routes/authRoutes.js";
// import commentRoutes from "./routes/commentRoutes.js";
// import issueRoutes from "./routes/issueRoutes.js";
// import notificationRoutes from "./routes/notificationRoutes.js"
import projectRoutes from "./routes/projectRoutes.js"
import userRoutes from "./routes/userRoutes.js";

dotenv.config();
const app = express();

app.use(cors({ 
    origin: 'http://localhost:5173', 
    credentials: true 
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status).json({ 
    success: false, 
    message: err.message || 'Server error'});
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});
