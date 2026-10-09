import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Footprints, Bike } from 'lucide-react';
import { api } from '../utils/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { SearchCombobox } from '../components/ui/SearchCombobox';
import { useGeocoding } from '../hooks/useGeocoding';
import type { GeocodingResult, Trip } from '../types';
import { cn } from '../utils/cn';

type TravelMode = 'driving' | 'walking' | 'cycling';

interface FormErrors {
  name?: string;
}

interface LocationField {
  name: string;
  lat: number | null;
  lng: number | null;
}

const TRAVEL_MODES: { value: TravelMode; label: string; Icon: React.ElementType }[] = [
  { value: 'driving', label: 'Driving', Icon: Car },
  { value: 'walking', label: 'Walking', Icon: Footprints },
  { value: 'cycling', label: 'Cycling', Icon: Bike },
];

export default function NewTrip() {
  const navigate = useNavigate();
  const { search: searchGeo, results: geoResults, isLoading: geoLoading } = useGeocoding();

  const [tripName, setTripName] = useState('');
  const [description, setDescription] = useState('');
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');
  const [startLocation, setStartLocation] = useState<LocationField>({
    name: '',
    lat: null,
    lng: null,
  });
  const [endLocation, setEndLocation] = useState<LocationField>({
    name: '',
    lat: null,
    lng: null,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!tripName.trim()) {
      newErrors.name = 'Trip name is required.';
    } else if (tripName.trim().length < 2) {
      newErrors.name = 'Trip name must be at least 2 characters.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload: Record<string, unknown> = {
        name: tripName.trim(),
        travelMode,
      };
      if (description.trim()) payload.description = description.trim();
      if (startLocation.lat != null) {
        payload.startLocationName = startLocation.name;
        payload.startLatitude = startLocation.lat;
        payload.startLongitude = startLocation.lng;
      }
      if (endLocation.lat != null) {
        payload.endLocationName = endLocation.name;
        payload.endLatitude = endLocation.lat;
        payload.endLongitude = endLocation.lng;
      }

      const created = await api.post<Trip>('/api/trips', payload);
      navigate(`/trips/${created.id}`);
    } catch (err) {
      setSubmitError((err as Error).message ?? 'Failed to create trip.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStartSelect(result: GeocodingResult) {
    setStartLocation({ name: result.displayName, lat: result.lat, lng: result.lon });
  }

  function handleEndSelect(result: GeocodingResult) {
    setEndLocation({ name: result.displayName, lat: result.lat, lng: result.lon });
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        Create a new trip
      </h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Trip name */}
        <Input
          id="trip-name"
          label="Trip name"
          type="text"
          placeholder="e.g. Durga Puja 2024 — Kolkata"
          value={tripName}
          onChange={(e) => {
            setTripName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
          required
          autoFocus
        />

        {/* Description */}
        <div>
          <label
            htmlFor="trip-description"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
          >
            Description{' '}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="trip-description"
            rows={2}
            placeholder="A short note about this trip"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none"
          />
        </div>

        {/* Start location */}
        <SearchCombobox
          id="start-location"
          label="Start location (optional)"
          placeholder="Search for a starting point…"
          onSearch={async (q) => {
            searchGeo(q);
            return geoResults;
          }}
          onSelect={handleStartSelect}
          isLoading={geoLoading}
        />

        {/* End location */}
        <SearchCombobox
          id="end-location"
          label="End location (optional)"
          placeholder="Search for an ending point…"
          onSearch={async (q) => {
            searchGeo(q);
            return geoResults;
          }}
          onSelect={handleEndSelect}
          isLoading={geoLoading}
        />

        {/* Travel mode */}
        <div>
          <span
            id="travel-mode-label"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2"
          >
            Travel mode
          </span>
          <div
            role="group"
            aria-labelledby="travel-mode-label"
            className="flex gap-3"
          >
            {TRAVEL_MODES.map(({ value, label, Icon }) => (
              <label
                key={value}
                htmlFor={`travel-mode-${value}`}
                className={cn(
                  'flex flex-1 flex-col items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors',
                  travelMode === value
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                )}
              >
                <input
                  id={`travel-mode-${value}`}
                  type="radio"
                  name="travelMode"
                  value={value}
                  checked={travelMode === value}
                  onChange={() => setTravelMode(value)}
                  className="sr-only"
                />
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="text-xs font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit error */}
        {submitError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {submitError}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/trips')}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">
            Create Trip
          </Button>
        </div>
      </form>
    </div>
  );
}
