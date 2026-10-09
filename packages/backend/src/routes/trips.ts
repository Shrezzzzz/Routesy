import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { CreateTripSchema, UpdateTripSchema } from '../validators/tripValidators';
import { sendSuccess, sendError } from '../utils/responseHelpers';

const router = Router();

/**
 * Checks whether the requester owns the trip.
 * Ownership is established by either authenticated user ID or session ID.
 */
function isOwner(
  trip: { ownerId: string | null; sessionId: string | null; isPublic: boolean },
  userId: string | null | undefined,
  sessionId: string | null | undefined
): boolean {
  if (userId && trip.ownerId === userId) return true;
  if (sessionId && trip.sessionId === sessionId) return true;
  return false;
}

// GET /api/trips — list trips for authenticated user or session
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.headers['x-session-id'] as string | undefined;
    const userId = req.user?.id;

    if (!userId && !sessionId) {
      sendSuccess(res, []);
      return;
    }

    const trips = await prisma.trip.findMany({
      where: {
        OR: [
          userId ? { ownerId: userId } : {},
          sessionId ? { sessionId } : {},
        ].filter((c) => Object.keys(c).length > 0),
      },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        routeCache: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    sendSuccess(res, trips);
  } catch (err) {
    next(err);
  }
});

// POST /api/trips — create a new trip
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateTripSchema.parse(req.body);
    const sessionId = req.headers['x-session-id'] as string | undefined;
    const userId = req.user?.id;

    const trip = await prisma.trip.create({
      data: {
        ...input,
        ownerId: userId ?? null,
        sessionId: userId ? null : (sessionId ?? null),
      },
      include: {
        stops: true,
        routeCache: true,
      },
    });

    sendSuccess(res, trip, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/trips/:id — get a trip with stops and route cache
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sessionId = req.headers['x-session-id'] as string | undefined;
    const userId = req.user?.id;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        routeCache: true,
      },
    });

    if (!trip) {
      sendError(res, 'Trip not found', 404);
      return;
    }

    // Allow access if owner, session matches, or trip is public
    if (!isOwner(trip, userId, sessionId) && !trip.isPublic) {
      sendError(res, 'Access denied', 403);
      return;
    }

    sendSuccess(res, trip);
  } catch (err) {
    next(err);
  }
});

// PUT /api/trips/:id — update trip fields
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
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

    const input = UpdateTripSchema.parse(req.body);

    const updated = await prisma.trip.update({
      where: { id },
      data: input,
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        routeCache: true,
      },
    });

    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/trips/:id — delete a trip
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
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

    await prisma.trip.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/trips/:id/duplicate — duplicate a trip with all its stops
router.post('/:id/duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sessionId = req.headers['x-session-id'] as string | undefined;
    const userId = req.user?.id;

    const original = await prisma.trip.findUnique({
      where: { id },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    });

    if (!original) {
      sendError(res, 'Trip not found', 404);
      return;
    }

    if (!isOwner(original, userId, sessionId) && !original.isPublic) {
      sendError(res, 'Access denied', 403);
      return;
    }

    // Create a copy of the trip
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      shareToken: _shareToken,
      stops,
      ...tripData
    } = original;

    const duplicate = await prisma.trip.create({
      data: {
        ...tripData,
        name: `${original.name} (Copy)`,
        isPublic: false,
        ownerId: userId ?? null,
        sessionId: userId ? null : (sessionId ?? null),
        stops: {
          create: stops.map((stop) => {
            const {
              id: _sid,
              tripId: _tid,
              createdAt: _sca,
              updatedAt: _sua,
              visitedAt: _va,
              ...stopData
            } = stop;
            return { ...stopData, skipped: false };
          }),
        },
      },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        routeCache: true,
      },
    });

    sendSuccess(res, duplicate, 201);
  } catch (err) {
    next(err);
  }
});

export default router;
