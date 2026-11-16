import express from 'express';
import dotenv from 'dotenv';
import mediaRoutes from './routes/mediaRoutes.js'

// Config
dotenv.config();
const app = express();

// Middleware
app.use(mediaRoutes)

export default app;