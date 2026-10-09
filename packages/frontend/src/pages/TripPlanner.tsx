import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Share2, Play, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useMap } from 'react-leaflet';

import { useTrip } from '../hooks/useTrip';
import { useStops } from '../hooks/useStops';
import { useRoute } from '../hooks/useRoute';

import RouteMapContainer from '../components/map/MapContainer';
import { NumberedMarker } from '../components/map/NumberedMarker';
import { RoutePolyline } from '../components/map/RoutePolyline';
import { StopList } from '../components/trip/StopList';
import { RouteStats } from '../components/trip/RouteStats';
import { ShareModal } from '../components/trip/ShareModal';
import { Button } from '../components/ui/Button';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { SearchCombobox } from '../components/ui/SearchCombobox';
import { Dialog } from '../components/ui/Dialog';

import { useGeocoding } from '../hooks/useGeocoding';
import type { Stop, Trip, GeocodingResult } from '../types';
import { StopStatus } from '../types';
import { api } from '../utils/api';

// Inner component to auto-fit bounds whenever stops change
function MapBoundsFitter({ stops }: { stops: Stop[] }) {
  const map = useMap();

  useEffect(() => {
    if (stops.length === 0) return;
    const bounds = stops.map((s) => [s.latitude, s.longitude] as [number, number]);
    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else {
      map.fitBounds(bounds, { padding: [48, 48] });
    }
  }, [map, stops]);

  return null;
}

function getStopStatus(stop: Stop): StopStatus {
  if (stop.visitedAt) return StopStatus.VISITED;
  if (stop.skipped) return StopStatus.SKIPPED;
  return StopStatus.PENDING;
}

export default function TripPlanner() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  const { trip, isLoading: tripLoading, error: tripError, refetch: refetchTrip, updateTrip } = useTrip(tripId);
  const { stops, isLoading: stopsLoading, error: stopsError, addStop, deleteStop, reorderStops } = useStops(tripId);
  const { routeCache, isCalculating, calculateRoute } = useRoute(tripId);

  const { search: searchGeo, results: geoResults, isLoading: geoLoading, clearResults } = useGeocoding();

  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [addStopDialogOpen, setAddStopDialogOpen] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  // Inline trip name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  useEffect(() => {
    if (trip) setNameValue(trip.name);
  }, [trip]);

  const handleNameSave = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (trimmed && trip && trimmed !== trip.name) {
      await updateTrip({ name: trimmed });
      refetchTrip();
    }
    setEditingName(false);
  }, [nameValue, trip, updateTrip, refetchTrip]);

  const handleAddStopSelect = useCallback(
    async (result: GeocodingResult) => {
      if (!tripId) return;
      const nextSeq = stops.length + 1;
      await addStop({
        name: result.displayName.split(',')[0].trim(),
        address: result.displayName,
        latitude: result.lat,
        longitude: result.lon,
        sequence: nextSeq,
        skipped: false,
      });
      clearResults();
      setAddStopDialogOpen(false);
    },
    [tripId, stops.length, addStop, clearResults]
  );

  const handleReorder = useCallback(
    async (reordered: Stop[]) => {
      const payload = reordered.map((s) => ({ id: s.id, sequence: s.sequence }));
      await reorderStops(payload);
    },
    [reorderStops]
  );

  const handleShareToggle = useCallback(
    async (isPublic: boolean) => {
      if (!tripId) return;
      if (isPublic) {
        await api.post(`/api/trips/${tripId}/share`);
      } else {
        await api.del(`/api/trips/${tripId}/share`);
      }
      refetchTrip();
    },
    [tripId, refetchTrip]
  );

  const handleRegenerateLink = useCallback(async () => {
    if (!tripId) return;
    await api.post(`/api/trips/${tripId}/share/regenerate`);
    refetchTrip();
  }, [tripId, refetchTrip]);

  const isLoading = tripLoading || stopsLoading;
  const loadError = tripError || stopsError;

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <LoadingSkeleton variant="map-panel" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <ErrorMessage message={loadError} retry={refetchTrip} />
      </div>
    );
  }

  const activeTrip = trip as Trip;

  const Sidebar = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Trip name */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              id="trip-name-edit"
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleNameSave();
                if (e.key === 'Escape') setEditingName(false);
              }}
              onBlur={() => void handleNameSave()}
              className="flex-1 text-lg font-semibold rounded border border-indigo-400 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
              aria-label="Trip name"
            />
          </div>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-left w-full group"
            aria-label={`Trip name: ${activeTrip?.name}. Click to edit.`}
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
              {activeTrip?.name ?? 'Unnamed Trip'}
            </h2>
          </button>
        )}
      </div>

      {/* Route stats */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <RouteStats
          routeCache={routeCache}
          stopCount={stops.length}
          travelMode={activeTrip?.travelMode}
          isCalculating={isCalculating}
          onCalculate={calculateRoute}
        />
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setAddStopDialogOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Stop
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShareModalOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Share2 className="w-4 h-4" aria-hidden="true" />
          Share
        </Button>
        <Button
          size="sm"
          onClick={() => navigate(`/trips/${tripId}/navigate`)}
          className="flex items-center gap-1.5 ml-auto"
          disabled={stops.length === 0}
        >
          <Play className="w-4 h-4" aria-hidden="true" />
          Start Trip
        </Button>
      </div>

      {/* Stop list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <StopList
          stops={stops}
          selectedStopId={selectedStopId ?? undefined}
          onSelect={(id) => setSelectedStopId((prev) => (prev === id ? null : id))}
          onReorder={handleReorder}
          onDelete={deleteStop}
        />
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row overflow-hidden">
      {/* Desktop sidebar — 380px fixed width, hidden on mobile */}
      <aside className="hidden md:flex md:w-[380px] md:flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {Sidebar}
      </aside>

      {/* Map area — fills remaining space */}
      <div className="flex-1 relative">
        <RouteMapContainer className="h-full w-full">
          <MapBoundsFitter stops={stops} />

          {stops.map((stop) => (
            <NumberedMarker
              key={stop.id}
              position={[stop.latitude, stop.longitude]}
              number={stop.sequence}
              name={stop.name}
              status={getStopStatus(stop)}
              selected={selectedStopId === stop.id}
              onSelect={() => setSelectedStopId((prev) => (prev === stop.id ? null : stop.id))}
            />
          ))}

          {routeCache?.geometry && (
            <RoutePolyline geometry={routeCache.geometry} />
          )}
        </RouteMapContainer>

        {/* Mobile: collapsible bottom panel */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-[400]">
          {/* Panel handle */}
          <button
            onClick={() => setIsMobilePanelOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg min-h-[44px]"
            aria-expanded={isMobilePanelOpen}
            aria-controls="mobile-stop-panel"
          >
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {stops.length} stop{stops.length !== 1 ? 's' : ''}
              {activeTrip?.name ? ` · ${activeTrip.name}` : ''}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/trips/${tripId}/navigate`);
                }}
                disabled={stops.length === 0}
              >
                <Play className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Start
              </Button>
              {isMobilePanelOpen ? (
                <ChevronDown className="w-5 h-5 text-slate-400" aria-hidden="true" />
              ) : (
                <ChevronUp className="w-5 h-5 text-slate-400" aria-hidden="true" />
              )}
            </div>
          </button>

          {/* Collapsible panel content */}
          {isMobilePanelOpen && (
            <div
              id="mobile-stop-panel"
              className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 max-h-[50vh] overflow-y-auto"
            >
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setAddStopDialogOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Add Stop
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShareModalOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                  Share
                </Button>
              </div>
              <div className="px-4 py-3">
                <RouteStats
                  routeCache={routeCache}
                  stopCount={stops.length}
                  travelMode={activeTrip?.travelMode}
                  isCalculating={isCalculating}
                  onCalculate={calculateRoute}
                  className="mb-3"
                />
                <StopList
                  stops={stops}
                  selectedStopId={selectedStopId ?? undefined}
                  onSelect={(id) => setSelectedStopId((prev) => (prev === id ? null : id))}
                  onReorder={handleReorder}
                  onDelete={deleteStop}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add stop dialog */}
      <Dialog
        open={addStopDialogOpen}
        onClose={() => {
          setAddStopDialogOpen(false);
          clearResults();
        }}
        title="Add a stop"
      >
        <SearchCombobox
          id="add-stop-search"
          label="Search for a location"
          placeholder="e.g. College Square, Kolkata"
          onSearch={async (q) => {
            searchGeo(q);
            return geoResults;
          }}
          onSelect={handleAddStopSelect}
          isLoading={geoLoading}
        />
        {geoLoading && (
          <div className="flex items-center justify-center mt-4">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" aria-hidden="true" />
          </div>
        )}
      </Dialog>

      {/* Share modal */}
      <ShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareToken={activeTrip?.shareToken}
        isPublic={activeTrip?.isPublic ?? false}
        tripId={tripId ?? ''}
        onTogglePublic={handleShareToggle}
        onRegenerateLink={handleRegenerateLink}
      />
    </div>
  );
}
