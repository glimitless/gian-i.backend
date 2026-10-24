import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';

// Config
dotenv.config();
const app = express();

// Middleware
app.use(express.static('assets'));
app.use('/', authRoutes);

export default app;