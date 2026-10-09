/**
 * Check whether the requester owns the trip.
 * Ownership is established by authenticated user ID or matching session ID.
 */
export function isOwner(
  trip: { ownerId: string | null; sessionId: string | null; isPublic?: boolean },
  userId: string | null | undefined,
  sessionId: string | null | undefined
): boolean {
  if (userId && trip.ownerId === userId) return true;
  if (sessionId && trip.sessionId === sessionId) return true;
  return false;
}
