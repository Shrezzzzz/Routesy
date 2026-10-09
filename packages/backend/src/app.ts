import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { optionalAuth } from './middleware/auth';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import authRouter from './routes/auth';
import tripsRouter from './routes/trips';
import stopsRouter from './routes/stops';
import routeRouter from './routes/route';
import sharingRouter from './routes/sharing';
import geocodingRouter from './routes/geocoding';
import publicShareRouter from './routes/publicShare';

const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// HTTP request logging (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use(apiLimiter);

// Optional JWT auth — attaches req.user or null
app.use(optionalAuth);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/trips', tripsRouter);

// Nested stop routes: /api/trips/:id/stops
app.use('/api/trips/:id/stops', stopsRouter);

// Nested route calculation: /api/trips/:id/route
app.use('/api/trips/:id/route', routeRouter);

// Trip sharing management (auth required endpoints): /api/trips/:id/share
app.use('/api/trips', sharingRouter);

// Geocoding
app.use('/api/geocode', geocodingRouter);

// Public share endpoint (no auth): /api/share/:token
app.use('/api/share', publicShareRouter);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
