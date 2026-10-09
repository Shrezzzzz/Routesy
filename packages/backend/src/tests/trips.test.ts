import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';

// Mock the Prisma singleton so tests never touch a real DB
vi.mock('../lib/prisma', () => {
  const mockPrisma = {
    trip: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    stop: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    routeCache: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    $disconnect: vi.fn(),
  };
  return { prisma: mockPrisma };
});

// Import prisma AFTER the mock is registered
import { prisma } from '../lib/prisma';

const mockPrismaTrip = prisma.trip as ReturnType<typeof vi.fn> & typeof prisma.trip;

const MOCK_TRIP = {
  id: 'trip-123',
  name: 'Test Trip',
  description: null,
  ownerId: null,
  sessionId: 'session-abc',
  startLocationName: null,
  startLatitude: null,
  startLongitude: null,
  endLocationName: null,
  endLatitude: null,
  endLongitude: null,
  travelMode: 'driving',
  routeMode: 'manual',
  isPublic: true,
  shareToken: 'share-token-21-chars-ok',
  stops: [],
  routeCache: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_TRIP_WITH_OWNER = {
  ...MOCK_TRIP,
  ownerId: 'user-456',
  sessionId: null,
  owner: {
    id: 'user-456',
    email: 'owner@example.com',
    password: 'hashed-password-should-not-appear',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/trips', () => {
  it('creates a trip and returns 201 with the trip name', async () => {
    vi.mocked(mockPrismaTrip.create).mockResolvedValueOnce(MOCK_TRIP);

    const res = await request(app)
      .post('/api/trips')
      .set('x-session-id', 'session-abc')
      .send({ name: 'Test Trip' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Trip');
  });

  it('returns 422 when name is missing', async () => {
    const res = await request(app)
      .post('/api/trips')
      .set('x-session-id', 'session-abc')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/trips/:id', () => {
  it('returns the trip for a public trip', async () => {
    vi.mocked(mockPrismaTrip.findUnique).mockResolvedValueOnce(MOCK_TRIP);

    const res = await request(app).get('/api/trips/trip-123');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('trip-123');
  });

  it('returns 404 when trip does not exist', async () => {
    vi.mocked(mockPrismaTrip.findUnique).mockResolvedValueOnce(null);

    const res = await request(app).get('/api/trips/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/share/:token — security test', () => {
  it('returns trip without owner.email or owner.password', async () => {
    vi.mocked(prisma.trip.findFirst).mockResolvedValueOnce(
      MOCK_TRIP_WITH_OWNER
    );

    const res = await request(app).get('/api/share/share-token-21-chars-ok');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Critical security check: no sensitive fields
    const data = res.body.data;
    expect(data.ownerId).toBeUndefined();
    expect(data.sessionId).toBeUndefined();

    // If owner is present, it must not contain email or password
    if (data.owner) {
      expect(data.owner.email).toBeUndefined();
      expect(data.owner.password).toBeUndefined();
    }
  });
});

describe('DELETE /api/trips/:id', () => {
  it('returns 204 when owner deletes their trip', async () => {
    vi.mocked(mockPrismaTrip.findUnique).mockResolvedValueOnce(MOCK_TRIP);
    vi.mocked(mockPrismaTrip.delete).mockResolvedValueOnce(MOCK_TRIP);

    const res = await request(app)
      .delete('/api/trips/trip-123')
      .set('x-session-id', 'session-abc');

    expect(res.status).toBe(204);
  });

  it('returns 403 when session does not match', async () => {
    vi.mocked(mockPrismaTrip.findUnique).mockResolvedValueOnce({
      ...MOCK_TRIP,
      isPublic: false,
      sessionId: 'other-session',
    });

    const res = await request(app)
      .delete('/api/trips/trip-123')
      .set('x-session-id', 'wrong-session');

    expect(res.status).toBe(403);
  });
});
