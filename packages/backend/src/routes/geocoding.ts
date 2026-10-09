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

export default router;
