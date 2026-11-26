
import express from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import cookieParser from 'cookie-parser';


const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/v1/auth', authRoutes);

// Not Found & Error Handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
