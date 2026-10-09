import { useMemo } from 'react';
import type { Stop } from '../types';

interface ProgressStats {
  totalStops: number;
  visitedCount: number;
  skippedCount: number;
  progressPercent: number;
  currentStop: Stop | null;
  remainingStops: Stop[];
}

/**
 * Pure computation hook — derives trip progress stats from a stops array.
 * No API calls. All derived from the stops prop.
 */
export function useProgress(stops: Stop[]): ProgressStats {
  return useMemo(() => {
    const totalStops = stops.length;
    const visitedCount = stops.filter((s) => s.visitedAt != null).length;
    const skippedCount = stops.filter((s) => s.skipped && !s.visitedAt).length;
    const completedCount = visitedCount + skippedCount;

    const progressPercent =
      totalStops > 0 ? Math.round((completedCount / totalStops) * 100) : 0;

    // Current stop is the first unvisited, non-skipped stop in sequence order
    const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
    const currentStop =
      sorted.find((s) => !s.visitedAt && !s.skipped) ?? null;

    // Remaining stops are unvisited and non-skipped stops after (and including) current
    const remainingStops = sorted.filter((s) => !s.visitedAt && !s.skipped);

    return {
      totalStops,
      visitedCount,
      skippedCount,
      progressPercent,
      currentStop,
      remainingStops,
    };
  }, [stops]);
}
