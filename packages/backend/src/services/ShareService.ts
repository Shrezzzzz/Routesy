// nanoid v3.x uses CommonJS — must use require() for compatibility
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { nanoid } = require('nanoid') as { nanoid: (size?: number) => string };

/**
 * Generate a 21-character URL-safe share token using nanoid.
 */
export function generateShareToken(): string {
  return nanoid(21);
}

interface TripWithOwner {
  ownerId?: string | null;
  sessionId?: string | null;
  owner?: {
    email?: string;
    password?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

interface PublicTripPayload {
  [key: string]: unknown;
}

/**
 * Strips private fields from a trip before returning it to public callers.
 * Never exposes ownerId, sessionId, or owner.email/owner.password.
 */
export function buildPublicTripPayload(trip: TripWithOwner): PublicTripPayload {
  // Destructure to remove private fields
  const { ownerId: _ownerId, sessionId: _sessionId, owner, ...publicTrip } = trip;

  // If owner is present, strip sensitive fields
  if (owner) {
    const { email: _email, password: _password, ...safeOwner } = owner;
    return { ...publicTrip, owner: safeOwner };
  }

  return publicTrip;
}
