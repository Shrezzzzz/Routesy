import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navigation, CheckCircle, SkipForward, ArrowLeft, PartyPopper, MapPin } from 'lucide-react';

import { useTrip } from '../hooks/useTrip';
import { useStops } from '../hooks/useStops';
import { useProgress } from '../hooks/useProgress';

import RouteMapContainer from '../components/map/MapContainer';
import { NumberedMarker } from '../components/map/NumberedMarker';
import { RoutePolyline } from '../components/map/RoutePolyline';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Dialog } from '../components/ui/Dialog';

import { buildGoogleMapsUrl } from '../utils/navigationUrl';
import type { Stop } from '../types';
import { StopStatus } from '../types';

function getStopStatus(stop: Stop): StopStatus {
  if (stop.visitedAt) return StopStatus.VISITED;
  if (stop.skipped) return StopStatus.SKIPPED;
  return StopStatus.PENDING;
}

export default function TripNavigate() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  const { trip, isLoading: tripLoading, error: tripError } = useTrip(tripId);
  const {
    stops,
    isLoading: stopsLoading,
    error: stopsError,
    markVisited,
    skipStop,
  } = useStops(tripId);

  const { totalStops, visitedCount, progressPercent, currentStop, remainingStops } =
    useProgress(stops);

  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [isActing, setIsActing] = useState(false);

  const isLoading = tripLoading || stopsLoading;
  const loadError = tripError || stopsError;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSkeleton variant="card" className="w-80" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <ErrorMessage message={loadError} />
      </div>
    );
  }

  const travelMode = (trip?.travelMode ?? 'driving') as 'driving' | 'walking' | 'cycling';

  async function handleMarkVisited() {
    if (!currentStop) return;
    setIsActing(true);
    try {
      await markVisited(currentStop.id);
    } finally {
      setIsActing(false);
    }
  }

  async function handleSkip() {
    if (!currentStop) return;
    setIsActing(true);
    try {
      await skipStop(currentStop.id);
      setSkipDialogOpen(false);
    } finally {
      setIsActing(false);
    }
  }

  function handleNavigate() {
    if (!currentStop) return;
    const url = buildGoogleMapsUrl(
      currentStop.latitude,
      currentStop.longitude,
      currentStop.name,
      travelMode
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const nextStop = remainingStops.length > 1 ? remainingStops[1] : null;
  const allDone = totalStops > 0 && currentStop === null;
  const routeCache = trip?.routeCache;

  // Trip complete state
  if (allDone) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <PartyPopper className="w-10 h-10 text-green-600 dark:text-green-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Trip Complete!
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-2">
          You visited {visitedCount} of {totalStops} stops.
        </p>
        <ProgressBar
          value={progressPercent}
          label="Progress"
          color="green"
          className="w-48 mb-6"
        />
        <Button onClick={() => navigate(`/trips/${tripId}`)}>
          Back to Planner
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
        <button
          onClick={() => navigate(`/trips/${tripId}`)}
          aria-label="Back to planner"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {trip?.name ?? 'Trip'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {visitedCount} of {totalStops} stops visited
          </p>
        </div>
      </header>

      {/* Map — top 60% */}
      <div className="flex-shrink-0" style={{ height: '60%' }}>
        <RouteMapContainer className="h-full w-full">
          {stops.map((stop) => (
            <NumberedMarker
              key={stop.id}
              position={[stop.latitude, stop.longitude]}
              number={stop.sequence}
              name={stop.name}
              status={
                currentStop?.id === stop.id ? StopStatus.CURRENT : getStopStatus(stop)
              }
              selected={currentStop?.id === stop.id}
            />
          ))}

          {routeCache?.geometry && (
            <RoutePolyline geometry={routeCache.geometry} />
          )}
        </RouteMapContainer>
      </div>

      {/* Bottom section */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-4 space-y-4">
        {/* Progress bar */}
        <ProgressBar
          value={progressPercent}
          label={`${visitedCount} of ${totalStops} stops visited`}
        />

        {/* Current stop card */}
        {currentStop && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 text-white text-sm font-bold flex items-center justify-center">
                {currentStop.sequence}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {currentStop.name}
                </p>
                {currentStop.address && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentStop.address}
                  </p>
                )}
                {currentStop.notes && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 italic">
                    {currentStop.notes}
                  </p>
                )}
                {currentStop.estimatedVisitMinutes != null && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    ~{currentStop.estimatedVisitMinutes} min visit
                  </p>
                )}
              </div>
            </div>

            {/* Primary Navigate button */}
            <Button
              size="lg"
              onClick={handleNavigate}
              className="w-full flex items-center justify-center gap-2"
            >
              <Navigation className="w-5 h-5" aria-hidden="true" />
              Navigate
            </Button>

            {/* Secondary actions */}
            <div className="flex gap-3 mt-3">
              <Button
                variant="secondary"
                size="md"
                loading={isActing}
                onClick={handleMarkVisited}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" aria-hidden="true" />
                Mark Visited
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => setSkipDialogOpen(true)}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <SkipForward className="w-4 h-4" aria-hidden="true" />
                Skip
              </Button>
            </div>
          </div>
        )}

        {/* Next stop preview */}
        {nextStop && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex-shrink-0">
              Next
            </div>
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              {nextStop.sequence}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {nextStop.name}
              </p>
              {nextStop.address && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {nextStop.address}
                </p>
              )}
            </div>
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
          </div>
        )}

        {/* Remaining stops count */}
        {remainingStops.length > 0 && (
          <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            {remainingStops.length} stop{remainingStops.length !== 1 ? 's' : ''} remaining
          </p>
        )}
      </div>

      {/* Skip confirmation dialog */}
      <Dialog
        open={skipDialogOpen}
        onClose={() => setSkipDialogOpen(false)}
        title="Skip this stop?"
      >
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Skip <strong className="text-slate-900 dark:text-white">{currentStop?.name}</strong>?
          You can still come back to it later.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setSkipDialogOpen(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={isActing}
            onClick={handleSkip}
            className="flex-1"
          >
            Skip
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
