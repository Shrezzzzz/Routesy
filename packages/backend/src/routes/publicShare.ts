import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { buildPublicTripPayload } from '../services/ShareService';
import { sendSuccess, sendError } from '../utils/responseHelpers';

const router = Router();

// GET /api/share/:token — public shared trip (no auth required)
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
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
