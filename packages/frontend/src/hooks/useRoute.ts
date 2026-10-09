import { useState, useCallback } from 'react';
import { api } from '../utils/api';
import type { RouteCache } from '../types';

interface UseRouteResult {
  routeCache: RouteCache | null;
  isLoading: boolean;
  isCalculating: boolean;
  error: string | null;
  calculateRoute: () => Promise<void>;
  optimizeRoute: () => Promise<void>;
}

export function useRoute(tripId?: string): UseRouteResult {
  const [routeCache, setRouteCache] = useState<RouteCache | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRoute = useCallback(async () => {
    if (!tripId) return;
    setIsCalculating(true);
    setError(null);
    try {
      const result = await api.post<RouteCache>(`/api/trips/${tripId}/route/calculate`);
      setRouteCache(result);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to calculate route');
    } finally {
      setIsCalculating(false);
    }
  }, [tripId]);

  const optimizeRoute = useCallback(async () => {
    if (!tripId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.post<RouteCache>(`/api/trips/${tripId}/route/optimize`);
      setRouteCache(result);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to optimize route');
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  return {
    routeCache,
    isLoading,
    isCalculating,
    error,
    calculateRoute,
    optimizeRoute,
  };
}
