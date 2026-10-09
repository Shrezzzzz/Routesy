import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    console.error('[ErrorHandler]', err);
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Resource not found' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Resource already exists' });
      return;
    }
  }

  if (err instanceof Error) {
    res.status(500).json({ success: false, error: err.message });
    return;
  }

  res.status(500).json({ success: false, error: 'Internal server error' });
}
