import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Share2, Play, ChevronDown, ChevronUp, Loader2, MapPin } from 'lucide-react';
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
import { Input } from '../components/ui/Input';
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

// Pending stop form state for the add/edit dialogs
interface PendingStop {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export default function TripPlanner() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  const { trip, isLoading: tripLoading, error: tripError, refetch: refetchTrip, updateTrip } = useTrip(tripId);

  const { routeCache, isCalculating, calculateRoute, clearRoute } = useRoute(tripId, trip?.routeCache);

  // Combined onMutate: refetch the trip and clear the stale route display
  const handleMutate = useCallback(() => {
    refetchTrip();
    clearRoute();
  }, [refetchTrip, clearRoute]);

  const { stops, addStop, updateStop, deleteStop, reorderStops } = useStops(tripId, trip?.stops ?? [], handleMutate);

  const { search: searchGeo, results: geoResults, isLoading: geoLoading, clearResults } = useGeocoding();

  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [addStopDialogOpen, setAddStopDialogOpen] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  // Route Settings collapsible (open if start or end is missing)
  const [routeSettingsOpen, setRouteSettingsOpen] = useState(false);
  useEffect(() => {
    if (trip) {
      setRouteSettingsOpen(!trip.startLocationName || !trip.endLocationName);
    }
  }, [trip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Geocoding hooks for start/end location search
  const {
    search: searchStart,
    results: startResults,
    isLoading: startLoading,
    clearResults: clearStartResults,
  } = useGeocoding();
  const {
    search: searchEnd,
    results: endResults,
    isLoading: endLoading,
    clearResults: clearEndResults,
  } = useGeocoding();

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

  // Start location selection
  const handleStartSelect = useCallback(
    async (result: GeocodingResult) => {
      await updateTrip({
        startLocationName: result.displayName,
        startLatitude: result.lat,
        startLongitude: result.lon,
      });
      refetchTrip();
      clearStartResults();
    },
    [updateTrip, refetchTrip, clearStartResults]
  );

  // End location selection
  const handleEndSelect = useCallback(
    async (result: GeocodingResult) => {
      await updateTrip({
        endLocationName: result.displayName,
        endLatitude: result.lat,
        endLongitude: result.lon,
      });
      refetchTrip();
      clearEndResults();
    },
    [updateTrip, refetchTrip, clearEndResults]
  );

  // ── Add Stop dialog state ──────────────────────────────────────────────────
  const [pendingStop, setPendingStop] = useState<PendingStop | null>(null);
  const [pendingStopName, setPendingStopName] = useState('');

  const handleAddStopSelect = useCallback((result: GeocodingResult) => {
    const name = result.displayName.split(',')[0].trim();
    setPendingStop({ name, address: result.displayName, lat: result.lat, lng: result.lon });
    setPendingStopName(name);
  }, []);

  const handleAddStopConfirm = useCallback(async () => {
    if (!pendingStop || !tripId) return;
    const nextSeq = stops.length + 1;
    await addStop({
      name: pendingStopName.trim() || pendingStop.name,
      address: pendingStop.address,
      latitude: pendingStop.lat,
      longitude: pendingStop.lng,
      sequence: nextSeq,
      skipped: false,
    });
    setPendingStop(null);
    setPendingStopName('');
    clearResults();
    setAddStopDialogOpen(false);
  }, [pendingStop, pendingStopName, tripId, stops.length, addStop, clearResults]);

  const handleAddStopDialogClose = useCallback(() => {
    setAddStopDialogOpen(false);
    setPendingStop(null);
    setPendingStopName('');
    clearResults();
  }, [clearResults]);

  // ── Edit Stop dialog state ─────────────────────────────────────────────────
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [editStopName, setEditStopName] = useState('');
  const [editStopAddress, setEditStopAddress] = useState('');
  const [editPendingGeo, setEditPendingGeo] = useState<{ lat: number; lng: number } | null>(null);

  const {
    search: searchEditGeo,
    results: editGeoResults,
    isLoading: editGeoLoading,
    clearResults: clearEditResults,
  } = useGeocoding();

  const handleOpenEdit = useCallback(
    (stopId: string) => {
      const stop = stops.find((s) => s.id === stopId);
      if (!stop) return;
      setEditingStop(stop);
      setEditStopName(stop.name);
      setEditStopAddress(stop.address ?? '');
      setEditPendingGeo(null);
      clearEditResults();
    },
    [stops, clearEditResults]
  );

  const handleEditGeoSelect = useCallback((result: GeocodingResult) => {
    setEditStopAddress(result.displayName);
    setEditPendingGeo({ lat: result.lat, lng: result.lon });
  }, []);

  const handleEditStopSave = useCallback(async () => {
    if (!editingStop) return;
    const lat = editPendingGeo?.lat ?? editingStop.latitude;
    const lng = editPendingGeo?.lng ?? editingStop.longitude;
    await updateStop(editingStop.id, {
      name: editStopName.trim() || editingStop.name,
      address: editStopAddress,
      latitude: lat,
      longitude: lng,
    });
    setEditingStop(null);
    setEditPendingGeo(null);
    clearEditResults();
  }, [editingStop, editStopName, editStopAddress, editPendingGeo, updateStop, clearEditResults]);

  const handleEditStopClose = useCallback(() => {
    setEditingStop(null);
    setEditPendingGeo(null);
    clearEditResults();
  }, [clearEditResults]);

  // ── Reorder ────────────────────────────────────────────────────────────────
  const handleReorder = useCallback(
    async (reordered: Stop[]) => {
      const payload = reordered.map((s) => ({ id: s.id, sequence: s.sequence }));
      await reorderStops(payload);
    },
    [reorderStops]
  );

  // ── Share ──────────────────────────────────────────────────────────────────
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

  const isLoading = tripLoading;
  const loadError = tripError;

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

      {/* Route Settings collapsible */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setRouteSettingsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors min-h-[44px]"
          aria-expanded={routeSettingsOpen}
          aria-controls="route-settings-panel"
        >
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-indigo-500" aria-hidden="true" />
            Route Settings
          </span>
          {routeSettingsOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
          )}
        </button>
        {routeSettingsOpen && (
          <div id="route-settings-panel" className="px-4 pb-4 space-y-3">
            <SearchCombobox
              id="start-location"
              label="Start location"
              placeholder={activeTrip?.startLocationName ?? 'Search for start location…'}
              onSearch={async (q) => {
                searchStart(q);
                return startResults;
              }}
              onSelect={handleStartSelect}
              isLoading={startLoading}
            />
            <SearchCombobox
              id="end-location"
              label="End location"
              placeholder={activeTrip?.endLocationName ?? 'Search for end location…'}
              onSearch={async (q) => {
                searchEnd(q);
                return endResults;
              }}
              onSelect={handleEndSelect}
              isLoading={endLoading}
            />
          </div>
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
          onEdit={handleOpenEdit}
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
                  onEdit={handleOpenEdit}
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
        onClose={handleAddStopDialogClose}
        title="Add a stop"
      >
        <div className="space-y-4">
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
            <div className="flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" aria-hidden="true" />
            </div>
          )}

          {pendingStop && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Input
                id="add-stop-name"
                label="Stop name"
                value={pendingStopName}
                onChange={(e) => setPendingStopName(e.target.value)}
                placeholder="Enter stop name"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={pendingStop.address}>
                {pendingStop.address}
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={handleAddStopDialogClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleAddStopConfirm()}
                  disabled={!pendingStop}
                >
                  Add Stop
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* Edit stop dialog */}
      <Dialog
        open={editingStop !== null}
        onClose={handleEditStopClose}
        title="Edit stop"
      >
        <div className="space-y-4">
          <Input
            id="edit-stop-name"
            label="Stop name"
            value={editStopName}
            onChange={(e) => setEditStopName(e.target.value)}
            placeholder="Enter stop name"
          />
          <SearchCombobox
            id="edit-stop-search"
            label="Change location (optional)"
            placeholder="Search for a new location…"
            onSearch={async (q) => {
              searchEditGeo(q);
              return editGeoResults;
            }}
            onSelect={handleEditGeoSelect}
            isLoading={editGeoLoading}
          />
          {editStopAddress && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={editStopAddress}>
              {editPendingGeo ? '📍 New: ' : '📍 Current: '}{editStopAddress}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={handleEditStopClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleEditStopSave()}
              disabled={!editStopName.trim()}
            >
              Save Changes
            </Button>
          </div>
        </div>
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
