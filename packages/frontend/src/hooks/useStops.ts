import { useCallback } from 'react';
import { api } from '../utils/api';
import type { Stop } from '../types';

interface UseStopsResult {
  stops: Stop[];
  addStop: (stop: Omit<Stop, 'id' | 'tripId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateStop: (stopId: string, data: Partial<Stop>) => Promise<void>;
  deleteStop: (stopId: string) => Promise<void>;
  reorderStops: (reordered: Array<{ id: string; sequence: number }>) => Promise<void>;
  markVisited: (stopId: string) => Promise<void>;
  skipStop: (stopId: string) => Promise<void>;
}

/**
 * Provides stop mutation methods derived from a stops array already loaded by
 * the parent (e.g. useTrip). Calls onMutate after each successful mutation so
 * the parent can refetch the trip and propagate fresh data.
 *
 * No independent fetch on mount — the duplicate GET /api/trips/:id has been removed.
 */
export function useStops(
  tripId: string | undefined,
  initialStops: Stop[],
  onMutate: () => void
): UseStopsResult {
  const addStop = useCallback(
    async (stop: Omit<Stop, 'id' | 'tripId' | 'createdAt' | 'updatedAt'>) => {
      if (!tripId) return;
      await api.post(`/api/trips/${tripId}/stops`, stop);
      onMutate();
    },
    [tripId, onMutate]
  );

  const updateStop = useCallback(
    async (stopId: string, data: Partial<Stop>) => {
      if (!tripId) return;
      await api.put(`/api/trips/${tripId}/stops/${stopId}`, data);
      onMutate();
    },
    [tripId, onMutate]
  );

  const deleteStop = useCallback(
    async (stopId: string) => {
      if (!tripId) return;
      await api.del(`/api/trips/${tripId}/stops/${stopId}`);
      onMutate();
    },
    [tripId, onMutate]
  );

  const reorderStops = useCallback(
    async (reordered: Array<{ id: string; sequence: number }>) => {
      if (!tripId) return;
      await api.put(`/api/trips/${tripId}/stops/reorder`, reordered);
      onMutate();
    },
    [tripId, onMutate]
  );

  const markVisited = useCallback(
    async (stopId: string) => {
      if (!tripId) return;
      await api.patch(`/api/trips/${tripId}/stops/${stopId}/visit`);
      onMutate();
    },
    [tripId, onMutate]
  );

  const skipStop = useCallback(
    async (stopId: string) => {
      if (!tripId) return;
      await api.patch(`/api/trips/${tripId}/stops/${stopId}/skip`);
      onMutate();
    },
    [tripId, onMutate]
  );

  return {
    stops: initialStops,
    addStop,
    updateStop,
    deleteStop,
    reorderStops,
    markVisited,
    skipStop,
  };
}
