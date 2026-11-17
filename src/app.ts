import 'dotenv/config';
import express from 'express';
import mediaRoutes from './routes/mediaRoutes.js'

// Config
const app = express();

// Middleware
app.use(mediaRoutes)

export default app;