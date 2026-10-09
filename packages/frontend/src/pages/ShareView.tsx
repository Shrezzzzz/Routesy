import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Copy, Check, ExternalLink, Navigation } from 'lucide-react';

import RouteMapContainer from '../components/map/MapContainer';
import { NumberedMarker } from '../components/map/NumberedMarker';
import { RoutePolyline } from '../components/map/RoutePolyline';
import { RouteStats } from '../components/trip/RouteStats';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Button } from '../components/ui/Button';

import { api } from '../utils/api';
import type { Trip, Stop } from '../types';
import { StopStatus } from '../types';

// Public trip payload — never includes owner email or password
interface PublicTrip {
  id: string;
  name: string;
  description?: string;
  travelMode: string;
  routeMode: string;
  stops: Stop[];
  routeCache?: Trip['routeCache'];
  createdAt: string;
  updatedAt: string;
}

function getStopStatus(stop: Stop): StopStatus {
  if (stop.visitedAt) return StopStatus.VISITED;
  if (stop.skipped) return StopStatus.SKIPPED;
  return StopStatus.PENDING;
}

/**
 * Builds a Google Maps directions URL for the full trip.
 * Uses the /dir/ URL format with up to 9 intermediate waypoints.
 * First stop = origin, last stop = destination, up to 9 middle stops as waypoints.
 */
function buildFullTripGoogleMapsUrl(stops: Stop[]): string {
  if (stops.length === 0) return 'https://maps.google.com';

  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);

  if (sorted.length === 1) {
    const s = sorted[0];
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.latitude},${s.longitude}`)}`;
  }

  const origin = sorted[0];
  const destination = sorted[sorted.length - 1];
  const waypoints = sorted.slice(1, sorted.length - 1).slice(0, 9);

  const originStr = `${origin.latitude},${origin.longitude}`;
  const destStr = `${destination.latitude},${destination.longitude}`;

  let url = `https://www.google.com/maps/dir/${encodeURIComponent(originStr)}`;

  for (const wp of waypoints) {
    url += `/${encodeURIComponent(`${wp.latitude},${wp.longitude}`)}`;
  }

  url += `/${encodeURIComponent(destStr)}`;

  return url;
}

export default function ShareView() {
  const { shareToken } = useParams<{ shareToken: string }>();

  const [tripData, setTripData] = useState<PublicTrip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!shareToken) return;

    setIsLoading(true);
    setError(null);

    api
      .get<PublicTrip>(`/api/share/${shareToken}`)
      .then((data) => {
        setTripData(data);
      })
      .catch((err: Error) => {
        setError(err.message ?? 'Could not load this shared trip.');
      })
      .finally(() => setIsLoading(false));
  }, [shareToken]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <LoadingSkeleton variant="map-panel" />
      </div>
    );
  }

  if (error || !tripData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center px-4">
        <ErrorMessage message={error ?? 'Trip not found.'} />
        <Link
          to="/"
          className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Go to Routesy
        </Link>
      </div>
    );
  }

  const stops = tripData.stops ?? [];
  const googleMapsUrl = buildFullTripGoogleMapsUrl(stops);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Minimal header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-base hover:opacity-80 transition-opacity"
          >
            <MapPin className="w-4 h-4" aria-hidden="true" />
            Routesy
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4" aria-hidden="true" />
              )}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors min-h-[36px]"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              Open in Google Maps
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Trip title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {tripData.name}
          </h1>
          {tripData.description && (
            <p className="text-slate-600 dark:text-slate-400 mt-1">{tripData.description}</p>
          )}
        </div>

        {/* Route stats */}
        <RouteStats
          routeCache={tripData.routeCache}
          stopCount={stops.length}
          travelMode={tripData.travelMode}
          className="mb-4"
        />

        {/* Map + stop list side-by-side on desktop */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Map */}
          <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 min-h-[320px] lg:min-h-[520px]">
            <RouteMapContainer className="h-full w-full" zoom={12}>
              {stops.map((stop) => (
                <NumberedMarker
                  key={stop.id}
                  position={[stop.latitude, stop.longitude]}
                  number={stop.sequence}
                  name={stop.name}
                  status={getStopStatus(stop)}
                />
              ))}
              {tripData.routeCache?.geometry && (
                <RoutePolyline geometry={tripData.routeCache.geometry} />
              )}
            </RouteMapContainer>
          </div>

          {/* Stop list */}
          <div className="lg:w-80 flex-shrink-0">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
              {stops.length} Stop{stops.length !== 1 ? 's' : ''}
            </h2>
            <ol className="space-y-2">
              {stops
                .slice()
                .sort((a, b) => a.sequence - b.sequence)
                .map((stop) => (
                  <li
                    key={stop.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                      {stop.sequence}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {stop.name}
                      </p>
                      {stop.address && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {stop.address}
                        </p>
                      )}
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stop.latitude},${stop.longitude}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open directions to ${stop.name} in Google Maps`}
                      className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <Navigation className="w-4 h-4" aria-hidden="true" />
                    </a>
                  </li>
                ))}
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}

