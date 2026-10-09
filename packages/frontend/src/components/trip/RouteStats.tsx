import { Car, Bike, Footprints, Loader2, Route } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { RouteCache } from '../../types';
import { Button } from '../ui/Button';

interface RouteStatsProps {
  routeCache?: RouteCache | null;
  stopCount: number;
  travelMode?: string;
  isStale?: boolean;
  isCalculating?: boolean;
  onCalculate?: () => void;
  className?: string;
}

function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function TravelModeIcon({ mode }: { mode?: string }) {
  const cls = 'w-4 h-4';
  switch (mode) {
    case 'walking':
      return <Footprints className={cls} aria-hidden="true" />;
    case 'cycling':
      return <Bike className={cls} aria-hidden="true" />;
    default:
      return <Car className={cls} aria-hidden="true" />;
  }
}

export function RouteStats({
  routeCache,
  stopCount,
  travelMode,
  isStale = false,
  isCalculating = false,
  onCalculate,
  className,
}: RouteStatsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
        <TravelModeIcon mode={travelMode} />
        <span className="text-xs capitalize">{travelMode ?? 'driving'}</span>
      </div>

      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
        <Route className="w-4 h-4" aria-hidden="true" />
        <span className="text-xs">{stopCount} stops</span>
      </div>

      {isCalculating ? (
        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 ml-auto">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span className="text-xs">Calculating…</span>
        </div>
      ) : routeCache ? (
        <>
          <div className="flex items-center gap-3 ml-auto text-sm font-medium text-slate-900 dark:text-white">
            <span>{formatDistance(routeCache.totalDistance)}</span>
            <span className="text-slate-400">·</span>
            <span>{formatDuration(routeCache.totalDuration)}</span>
            {isStale && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-normal">(stale)</span>
            )}
          </div>
          {isStale && onCalculate && (
            <Button variant="ghost" size="sm" onClick={onCalculate}>
              Refresh
            </Button>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-400">Route not calculated</span>
          {onCalculate && (
            <Button variant="secondary" size="sm" onClick={onCalculate}>
              Calculate
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
