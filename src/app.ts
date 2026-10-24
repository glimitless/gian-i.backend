import express from 'express';
import dotenv from 'dotenv';

// Config
dotenv.config();
const app = express();

// Middleware
app.use(express.static('assets'));

export default app;