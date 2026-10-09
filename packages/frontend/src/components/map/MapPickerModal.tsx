import { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { MapContainer as LeafletMapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { MapPin, Loader2, X } from 'lucide-react';
import L from 'leaflet';
import { Button } from '../ui/Button';
import { SESSION_ID_KEY } from '../../utils/api';

// Fix Leaflet default icon broken-image issue with Vite
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

// Kolkata default center
const DEFAULT_LAT = 22.5726;
const DEFAULT_LNG = 88.3639;

export interface MapPickerModalProps {
  open: boolean;
  initialLat?: number;
  initialLng?: number;
  onConfirm: (lat: number, lng: number, displayName: string) => void;
  onCancel: () => void;
  title?: string;
}

/**
 * Inner component that listens to map move events and reports new center coordinates.
 * Follows the same pattern as MapBoundsFitter in TripPlanner.tsx (useMap/useMapEvents).
 */
function MapCenterListener({ onCenterChange }: { onCenterChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    moveend(e) {
      const c = e.target.getCenter();
      onCenterChange(c.lat, c.lng);
    },
  });
  return null;
}

/**
 * MapPickerModal — full-screen overlay with a Leaflet map, centered crosshair pin,
 * reverse geocoding on moveend, and Confirm/Cancel actions.
 */
function MapPickerModal({
  open,
  initialLat,
  initialLng,
  onConfirm,
  onCancel,
  title = 'Choose Location on Map',
}: MapPickerModalProps) {
  const centerLat = initialLat ?? DEFAULT_LAT;
  const centerLng = initialLng ?? DEFAULT_LNG;

  const [currentLat, setCurrentLat] = useState(centerLat);
  const [currentLng, setCurrentLng] = useState(centerLng);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [reverseError, setReverseError] = useState(false);

  // Reset state when modal opens with new initial coords
  useEffect(() => {
    if (open) {
      setCurrentLat(initialLat ?? DEFAULT_LAT);
      setCurrentLng(initialLng ?? DEFAULT_LNG);
      setResolvedAddress(null);
      setReverseError(false);
    }
  }, [open, initialLat, initialLng]);

  const handleCenterChange = useCallback((lat: number, lng: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    setResolvedAddress(null);
    setReverseError(false);
    setIsReverseGeocoding(true);

    const baseUrl = (import.meta.env as Record<string, string>).VITE_API_URL ?? '';
    const sessionId = localStorage.getItem(SESSION_ID_KEY) ?? '';
    const url = `${baseUrl}/api/geocode/reverse?lat=${lat}&lng=${lng}`;

    fetch(url, { headers: { 'X-Session-Id': sessionId } })
      .then((res) => res.json())
      .then((json) => {
        const data = json?.data ?? json;
        if (data?.displayName) {
          setResolvedAddress(data.displayName as string);
        } else {
          setReverseError(true);
        }
      })
      .catch(() => {
        setReverseError(true);
      })
      .finally(() => {
        setIsReverseGeocoding(false);
      });
  }, []);

  const handleConfirm = useCallback(() => {
    const displayName = resolvedAddress ?? `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`;
    onConfirm(currentLat, currentLng, displayName);
  }, [currentLat, currentLng, resolvedAddress, onConfirm]);

  // Keyboard: Escape cancels
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[600] flex flex-col bg-white dark:bg-slate-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-indigo-600" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        </div>
        <button
          onClick={onCancel}
          aria-label="Close map picker"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Map area — fills remaining vertical space */}
      <div className="flex-1 relative overflow-hidden">
        {/* Leaflet MapContainer */}
        <LeafletMapContainer
          center={[centerLat, centerLng]}
          zoom={15}
          scrollWheelZoom
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapCenterListener onCenterChange={handleCenterChange} />
        </LeafletMapContainer>

        {/* Centered crosshair pin — CSS positioned outside MapContainer but inside relative parent */}
        <div
          className="absolute top-1/2 left-1/2 pointer-events-none"
          style={{ transform: 'translate(-50%, -100%)', zIndex: 1000 }}
          aria-hidden="true"
        >
          <MapPin className="w-8 h-8 text-indigo-600" />
        </div>
      </div>

      {/* Footer — address display + buttons */}
      <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 space-y-3">
        {/* Coordinates */}
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
        </p>

        {/* Resolved address */}
        <div className="min-h-[24px]">
          {isReverseGeocoding ? (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span className="text-sm">Resolving address…</span>
            </div>
          ) : reverseError ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
              Address not available — coordinates will be used
            </p>
          ) : resolvedAddress ? (
            <p className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2" title={resolvedAddress}>
              <span className="text-indigo-600 dark:text-indigo-400 mr-1">📍</span>
              {resolvedAddress}
            </p>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">Pan the map to pick a location</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            Confirm Location
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

MapPickerModal.displayName = 'MapPickerModal';

export default MapPickerModal;
