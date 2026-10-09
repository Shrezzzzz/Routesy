import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import {
  CreateStopSchema,
  UpdateStopSchema,
  ReorderStopsSchema,
} from '../validators/stopValidators';
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

/**
 * Load trip and verify ownership. Returns the trip or sends error.
 */
async function loadAndAuthorizeTrip(
  req: Request,
  res: Response
): Promise<{ ownerId: string | null; sessionId: string | null; id: string } | null> {
  const tripId = req.params.id;
  const sessionId = req.headers['x-session-id'] as string | undefined;
  const userId = req.user?.id;

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) {
    sendError(res, 'Trip not found', 404);
    return null;
  }

  if (!isOwner(trip, userId, sessionId)) {
    sendError(res, 'Access denied', 403);
    return null;
  }

  return trip;
}

// POST /api/trips/:id/stops — create a stop
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await loadAndAuthorizeTrip(req, res);
    if (!trip) return;

    const input = CreateStopSchema.parse(req.body);

    const stop = await prisma.stop.create({
      data: {
        ...input,
        tripId: trip.id,
      },
    });

    sendSuccess(res, stop, 201);
  } catch (err) {
    next(err);
  }
});

// PUT /api/trips/:id/stops/reorder — reorder stops
// Note: This must be defined before /:stopId to avoid route conflicts
router.put('/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await loadAndAuthorizeTrip(req, res);
    if (!trip) return;

    const input = ReorderStopsSchema.parse(req.body);

    // Update all sequences in a transaction
    await prisma.$transaction(
      input.map((item) =>
        prisma.stop.update({
          where: { id: item.id, tripId: trip.id },
          data: { sequence: item.sequence },
        })
      )
    );

    const stops = await prisma.stop.findMany({
      where: { tripId: trip.id },
      orderBy: { sequence: 'asc' },
    });

    sendSuccess(res, stops);
  } catch (err) {
    next(err);
  }
});

// PUT /api/trips/:id/stops/:stopId — update a stop
router.put('/:stopId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await loadAndAuthorizeTrip(req, res);
    if (!trip) return;

    const { stopId } = req.params;
    const input = UpdateStopSchema.parse(req.body);

    const stop = await prisma.stop.update({
      where: { id: stopId, tripId: trip.id },
      data: input,
    });

    sendSuccess(res, stop);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/trips/:id/stops/:stopId — delete a stop and resequence
router.delete('/:stopId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await loadAndAuthorizeTrip(req, res);
    if (!trip) return;

    const { stopId } = req.params;

    // Get the deleted stop's sequence
    const deletedStop = await prisma.stop.findUnique({
      where: { id: stopId, tripId: trip.id },
    });

    if (!deletedStop) {
      sendError(res, 'Stop not found', 404);
      return;
    }

    await prisma.stop.delete({ where: { id: stopId } });

    // Resequence remaining stops after the deleted one
    const remainingStops = await prisma.stop.findMany({
      where: { tripId: trip.id, sequence: { gt: deletedStop.sequence } },
      orderBy: { sequence: 'asc' },
    });

    if (remainingStops.length > 0) {
      await prisma.$transaction(
        remainingStops.map((s, i) =>
          prisma.stop.update({
            where: { id: s.id },
            data: { sequence: deletedStop.sequence + i },
          })
        )
      );
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// PATCH /api/trips/:id/stops/:stopId/visit — mark stop as visited
router.patch('/:stopId/visit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await loadAndAuthorizeTrip(req, res);
    if (!trip) return;

    const { stopId } = req.params;

    const stop = await prisma.stop.update({
      where: { id: stopId, tripId: trip.id },
      data: { visitedAt: new Date() },
    });

    sendSuccess(res, stop);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/trips/:id/stops/:stopId/skip — toggle stop skipped state
router.patch('/:stopId/skip', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await loadAndAuthorizeTrip(req, res);
    if (!trip) return;

    const { stopId } = req.params;

    const existing = await prisma.stop.findUnique({
      where: { id: stopId, tripId: trip.id },
    });

    if (!existing) {
      sendError(res, 'Stop not found', 404);
      return;
    }

    const stop = await prisma.stop.update({
      where: { id: stopId },
      data: { skipped: !existing.skipped },
    });

    sendSuccess(res, stop);
  } catch (err) {
    next(err);
  }
});

export default router;
