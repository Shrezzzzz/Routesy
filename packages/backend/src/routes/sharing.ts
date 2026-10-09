import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { generateShareToken, buildPublicTripPayload } from '../services/ShareService';
import { sendSuccess, sendError } from '../utils/responseHelpers';

const router = Router({ mergeParams: true });

/**
 * Check trip ownership by userId or sessionId.
 */
function isOwner(
  trip: { ownerId: string | null; sessionId: string | null },
  userId: string | null | undefined,
  sessionId: string | null | undefined
): boolean {
  if (userId && trip.ownerId === userId) return true;
  if (sessionId && trip.sessionId === sessionId) return true;
  return false;
}

// POST /api/trips/:id/share — enable sharing
router.post('/:id/share', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sessionId = req.headers['x-session-id'] as string | undefined;
    const userId = req.user?.id;

    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Trip not found', 404);
      return;
    }

    if (!isOwner(existing, userId, sessionId)) {
      sendError(res, 'Access denied', 403);
      return;
    }

    const shareToken = existing.shareToken ?? generateShareToken();

    const trip = await prisma.trip.update({
      where: { id },
      data: { isPublic: true, shareToken },
    });

    sendSuccess(res, { shareToken: trip.shareToken });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/trips/:id/share — disable sharing
router.delete('/:id/share', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sessionId = req.headers['x-session-id'] as string | undefined;
    const userId = req.user?.id;

    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Trip not found', 404);
      return;
    }

    if (!isOwner(existing, userId, sessionId)) {
      sendError(res, 'Access denied', 403);
      return;
    }

    await prisma.trip.update({
      where: { id },
      data: { isPublic: false, shareToken: null },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/trips/:id/share/regenerate — regenerate share token
router.post('/:id/share/regenerate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sessionId = req.headers['x-session-id'] as string | undefined;
    const userId = req.user?.id;

    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Trip not found', 404);
      return;
    }

    if (!isOwner(existing, userId, sessionId)) {
      sendError(res, 'Access denied', 403);
      return;
    }

    const newToken = generateShareToken();

    const trip = await prisma.trip.update({
      where: { id },
      data: { isPublic: true, shareToken: newToken },
    });

    sendSuccess(res, { shareToken: trip.shareToken });
  } catch (err) {
    next(err);
  }
});

// GET /api/share/:token — public shared trip view
router.get('/token/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    const trip = await prisma.trip.findFirst({
      where: { shareToken: token, isPublic: true },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        routeCache: true,
        owner: true,
      },
    });

    if (!trip) {
      sendError(res, 'Shared trip not found', 404);
      return;
    }

    // Strip private fields — NEVER expose email or password
    const publicPayload = buildPublicTripPayload(trip as Parameters<typeof buildPublicTripPayload>[0]);

    sendSuccess(res, publicPayload);
  } catch (err) {
    next(err);
  }
});

export default router;
