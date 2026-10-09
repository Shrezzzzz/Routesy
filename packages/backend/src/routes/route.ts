import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { routingService } from '../services/RoutingService';
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

// POST /api/trips/:id/route/calculate — calculate and cache route
router.post('/calculate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sessionId = req.headers['x-session-id'] as string | undefined;
    const userId = req.user?.id;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    });

    if (!trip) {
      sendError(res, 'Trip not found', 404);
      return;
    }

    if (!isOwner(trip, userId, sessionId) && !trip.isPublic) {
      sendError(res, 'Access denied', 403);
      return;
    }

    if (trip.stops.length < 2) {
      sendError(res, 'At least 2 stops are required to calculate a route', 400);
      return;
    }

    const stops = trip.stops.map((s) => ({ lat: s.latitude, lng: s.longitude }));
    const result = await routingService.calculateRoute(stops, trip.travelMode);

    // Upsert RouteCache
    const cache = await prisma.routeCache.upsert({
      where: { tripId: id },
      create: {
        tripId: id,
        totalDistance: result.totalDistance,
        totalDuration: result.totalDuration,
        geometry: result.geometry as object,
        legs: result.legs as unknown as object,
        calculatedAt: new Date(),
      },
      update: {
        totalDistance: result.totalDistance,
        totalDuration: result.totalDuration,
        geometry: result.geometry as object,
        legs: result.legs as unknown as object,
        calculatedAt: new Date(),
      },
    });

    sendSuccess(res, cache);
  } catch (err) {
    next(err);
  }
});

// GET /api/trips/:id/route — get cached route
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sessionId = req.headers['x-session-id'] as string | undefined;
    const userId = req.user?.id;

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      sendError(res, 'Trip not found', 404);
      return;
    }

    if (!isOwner(trip, userId, sessionId) && !trip.isPublic) {
      sendError(res, 'Access denied', 403);
      return;
    }

    const cache = await prisma.routeCache.findUnique({ where: { tripId: id } });
    if (!cache) {
      sendError(res, 'No cached route found — run calculate first', 404);
      return;
    }

    sendSuccess(res, cache);
  } catch (err) {
    next(err);
  }
});

// POST /api/trips/:id/route/optimize — optimize stop order using OSRM table service
router.post('/optimize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sessionId = req.headers['x-session-id'] as string | undefined;
    const userId = req.user?.id;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    });

    if (!trip) {
      sendError(res, 'Trip not found', 404);
      return;
    }

    if (!isOwner(trip, userId, sessionId)) {
      sendError(res, 'Access denied', 403);
      return;
    }

    if (trip.stops.length < 2) {
      sendError(res, 'At least 2 stops are required to optimize a route', 400);
      return;
    }

    // Call OSRM trip service (nearest-neighbor optimization)
    const profile = trip.travelMode === 'walking' ? 'foot' : trip.travelMode === 'cycling' ? 'cycling' : 'driving';
    const coordinates = trip.stops.map((s) => `${s.longitude},${s.latitude}`).join(';');
    const url = `http://router.project-osrm.org/trip/v1/${profile}/${coordinates}?source=first&roundtrip=false`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM optimization request failed: ${response.status}`);
    }

    const data = await response.json() as { code: string; waypoints: Array<{ waypoint_index: number; trips_index: number }> };

    if (data.code !== 'Ok') {
      throw new Error(`OSRM optimization returned code: ${data.code}`);
    }

    // Resequence stops according to OSRM's waypoint order
    const optimizedOrder = data.waypoints
      .slice()
      .sort((a, b) => a.waypoint_index - b.waypoint_index)
      .map((wp) => trip.stops[wp.trips_index]);

    await prisma.$transaction(
      optimizedOrder.map((stop, idx) =>
        prisma.stop.update({
          where: { id: stop.id },
          data: { sequence: idx },
        })
      )
    );

    // Clear route cache since order changed
    await prisma.routeCache.deleteMany({ where: { tripId: id } });

    const updatedStops = await prisma.stop.findMany({
      where: { tripId: id },
      orderBy: { sequence: 'asc' },
    });

    sendSuccess(res, { stops: updatedStops });
  } catch (err) {
    next(err);
  }
});

// POST /api/trips/:id/route/confirm-order — mark trip as manual route mode
router.post('/confirm-order', async (req: Request, res: Response, next: NextFunction) => {
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

    const trip = await prisma.trip.update({
      where: { id },
      data: { routeMode: 'manual' },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        routeCache: true,
      },
    });

    sendSuccess(res, trip);
  } catch (err) {
    next(err);
  }
});

export default router;
