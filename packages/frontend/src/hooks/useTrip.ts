import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type { Trip } from '../types';

interface UseTripResult {
  trip: Trip | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateTrip: (data: Partial<Trip>) => Promise<void>;
  deleteTrip: () => Promise<void>;
  duplicateTrip: () => Promise<Trip | null>;
}

export function useTrip(tripId?: string): UseTripResult {
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
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
      .get<Trip>(`/api/trips/${tripId}`)
      .then((data) => {
        if (!cancelled) setTrip(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? 'Failed to load trip');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tripId, revision]);

  const updateTrip = useCallback(
    async (data: Partial<Trip>) => {
      if (!tripId) return;
      const updated = await api.put<Trip>(`/api/trips/${tripId}`, data);
      setTrip(updated);
    },
    [tripId]
  );

  const deleteTrip = useCallback(async () => {
    if (!tripId) return;
    await api.del(`/api/trips/${tripId}`);
    navigate('/trips');
  }, [tripId, navigate]);

  const duplicateTrip = useCallback(async (): Promise<Trip | null> => {
    if (!tripId) return null;
    const duplicated = await api.post<Trip>(`/api/trips/${tripId}/duplicate`);
    return duplicated;
  }, [tripId]);

  return { trip, isLoading, error, refetch, updateTrip, deleteTrip, duplicateTrip };
}
