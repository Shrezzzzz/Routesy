import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import type { Stop } from '../types';

interface UseStopsResult {
  stops: Stop[];
  isLoading: boolean;
  error: string | null;
  addStop: (stop: Omit<Stop, 'id' | 'tripId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateStop: (stopId: string, data: Partial<Stop>) => Promise<void>;
  deleteStop: (stopId: string) => Promise<void>;
  reorderStops: (reordered: Array<{ id: string; sequence: number }>) => Promise<void>;
  markVisited: (stopId: string) => Promise<void>;
  skipStop: (stopId: string) => Promise<void>;
  refetch: () => void;
}

export function useStops(tripId?: string): UseStopsResult {
  const [stops, setStops] = useState<Stop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const refetch = useCallback(() => {
    setRevision((r) => r + 1);
  }, []);

  useEffect(() => {
    if (!tripId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .get<{ stops: Stop[] } | Stop[]>(`/api/trips/${tripId}`)
      .then((data) => {
        if (!cancelled) {
          // The trip endpoint returns the full trip including stops
          const stopsArray = Array.isArray(data)
            ? data
            : (data as { stops?: Stop[] }).stops ?? [];
          setStops(stopsArray.sort((a, b) => a.sequence - b.sequence));
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? 'Failed to load stops');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tripId, revision]);

  const addStop = useCallback(
    async (stop: Omit<Stop, 'id' | 'tripId' | 'createdAt' | 'updatedAt'>) => {
      if (!tripId) return;
      await api.post(`/api/trips/${tripId}/stops`, stop);
      refetch();
    },
    [tripId, refetch]
  );

  const updateStop = useCallback(
    async (stopId: string, data: Partial<Stop>) => {
      if (!tripId) return;
      await api.put(`/api/trips/${tripId}/stops/${stopId}`, data);
      refetch();
    },
    [tripId, refetch]
  );

  const deleteStop = useCallback(
    async (stopId: string) => {
      if (!tripId) return;
      await api.del(`/api/trips/${tripId}/stops/${stopId}`);
      refetch();
    },
    [tripId, refetch]
  );

  const reorderStops = useCallback(
    async (reordered: Array<{ id: string; sequence: number }>) => {
      if (!tripId) return;
      await api.put(`/api/trips/${tripId}/stops/reorder`, reordered);
      refetch();
    },
    [tripId, refetch]
  );

  const markVisited = useCallback(
    async (stopId: string) => {
      if (!tripId) return;
      await api.patch(`/api/trips/${tripId}/stops/${stopId}/visit`);
      refetch();
    },
    [tripId, refetch]
  );

  const skipStop = useCallback(
    async (stopId: string) => {
      if (!tripId) return;
      await api.patch(`/api/trips/${tripId}/stops/${stopId}/skip`);
      refetch();
    },
    [tripId, refetch]
  );

  return {
    stops,
    isLoading,
    error,
    addStop,
    updateStop,
    deleteStop,
    reorderStops,
    markVisited,
    skipStop,
    refetch,
  };
}
