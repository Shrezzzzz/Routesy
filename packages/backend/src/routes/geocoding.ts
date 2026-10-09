import { Router, Request, Response, NextFunction } from 'express';
import { geocodingService } from '../services/GeocodingService';
import { geocodeLimiter } from '../middleware/rateLimiter';
import { sendSuccess, sendError } from '../utils/responseHelpers';

const router = Router();

// GET /api/geocode/search?q=...&limit=5
router.get('/search', geocodeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query['q'] as string | undefined;
    const limitParam = req.query['limit'];
    const limit = limitParam ? parseInt(String(limitParam), 10) : 5;

    if (!query || query.trim().length === 0) {
      sendError(res, 'Query parameter "q" is required', 400);
      return;
    }

    const results = await geocodingService.search(query.trim(), limit);
    sendSuccess(res, results);
  } catch (err) {
    next(err);
  }
});

// GET /api/geocode/reverse?lat=...&lng=...
router.get('/reverse', geocodeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const latParam = req.query['lat'] as string | undefined;
    const lngParam = req.query['lng'] as string | undefined;

    if (!latParam || !lngParam) {
      sendError(res, 'Query parameters "lat" and "lng" are required', 400);
      return;
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (isNaN(lat) || isNaN(lng)) {
      sendError(res, 'Parameters "lat" and "lng" must be valid numbers', 400);
      return;
    }

    const result = await geocodingService.reverse(lat, lng);
    if (!result) {
      sendError(res, 'No result found for the given coordinates', 404);
      return;
    }

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
