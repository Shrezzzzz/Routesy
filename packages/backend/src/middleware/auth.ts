import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user: AuthUser | null;
    }
  }
}

/**
 * Optional auth — attaches req.user if valid JWT present, otherwise null.
 * Never rejects the request.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const secret = process.env.JWT_SECRET ?? 'dev-secret';
      const payload = jwt.verify(token, secret) as AuthUser;
      req.user = { id: payload.id, email: payload.email };
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
}

/**
 * Require auth — calls next() only if req.user is set. Returns 401 otherwise.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  next();
}
