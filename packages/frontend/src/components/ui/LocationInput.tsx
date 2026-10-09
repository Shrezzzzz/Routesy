import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { SearchCombobox } from './SearchCombobox';
import MapPickerModal from '../map/MapPickerModal';
import { Button } from './Button';
import { useGeocoding } from '../../hooks/useGeocoding';
import type { GeocodingResult } from '../../types';
import { cn } from '../../utils/cn';

export interface LocationValue {
  name: string;
  lat: number;
  lng: number;
}

export interface LocationInputProps {
  id: string;
  label: string;
  placeholder?: string;
  value?: LocationValue | null;
  onChange: (loc: LocationValue | null) => void;
  required?: boolean;
  className?: string;
}

/**
 * LocationInput — composite component that wraps SearchCombobox (geocode search) with
 * a "Choose on Map" button that opens MapPickerModal.
 *
 * SearchCombobox handles its own debouncing internally — do NOT add another debounce here.
 */
function LocationInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  required,
  className,
}: LocationInputProps) {
  const [mapOpen, setMapOpen] = useState(false);
  const { search, results, isLoading } = useGeocoding();

  function handleGeoSelect(result: GeocodingResult) {
    onChange({ name: result.displayName, lat: result.lat, lng: result.lon });
  }

  function handleMapConfirm(lat: number, lng: number, displayName: string) {
    onChange({ name: displayName, lat, lng });
    setMapOpen(false);
  }

  return (
    <div className={cn('space-y-1', className)}>
      {/* Label */}
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {/* Search + Map button row */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {/* SearchCombobox handles its own label internally but we supply an empty label
              here and show our own above, so pass a visually hidden label string */}
          <SearchCombobox
            id={id}
            label=""
            placeholder={value?.name ?? placeholder ?? 'Search for a location…'}
            onSearch={async (q) => {
              search(q);
              return results;
            }}
            onSelect={handleGeoSelect}
            isLoading={isLoading}
            // Remove top margin that SearchCombobox adds via its internal label div
            className="[&>label]:hidden"
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setMapOpen(true)}
          aria-label={`Choose ${label} on map`}
          className="flex-shrink-0 flex items-center gap-1.5 mt-0"
        >
          <MapPin className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Map</span>
        </Button>
      </div>

      {/* Currently selected location name (below the input, only when a value is set) */}
      {value?.name && (
        <p
          className="text-xs text-indigo-600 dark:text-indigo-400 truncate"
          title={value.name}
          aria-live="polite"
        >
          📍 {value.name}
        </p>
      )}

      {/* Map picker modal */}
      <MapPickerModal
        open={mapOpen}
        initialLat={value?.lat}
        initialLng={value?.lng}
        onConfirm={handleMapConfirm}
        onCancel={() => setMapOpen(false)}
        title={`Choose ${label} on Map`}
      />
    </div>
  );
}

LocationInput.displayName = 'LocationInput';

export default LocationInput;
