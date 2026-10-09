import rateLimit from 'express-rate-limit';

/**
 * Geocoding limiter: 1 req/sec per IP, 60 requests per minute window
 */
export const geocodeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // 60 requests per minute = ~1/sec
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many geocoding requests, please slow down' },
});

/**
 * General API limiter: 100 requests per minute per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});
