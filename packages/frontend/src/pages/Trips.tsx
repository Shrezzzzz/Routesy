import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin } from 'lucide-react';
import { api } from '../utils/api';
import { ApiError } from '../utils/api';
import { TripCard } from '../components/trip/TripCard';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Button } from '../components/ui/Button';
import type { Trip } from '../types';

export default function Trips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadTrips() {
    setIsLoading(true);
    setError(null);
    api
      .get<Trip[]>('/api/trips')
      .then((data) => {
        setTrips(Array.isArray(data) ? data : []);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : 'Failed to load trips'
        );
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadTrips();
  }, []);

  async function handleDelete(id: string) {
    try {
      await api.del(`/api/trips/${id}`);
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // Keep the list, silently fail — user can retry
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const duplicated = await api.post<Trip>(`/api/trips/${id}/duplicate`);
      setTrips((prev) => [duplicated, ...prev]);
    } catch {
      // ignore
    }
  }

  async function handleRename(id: string, name: string) {
    try {
      const updated = await api.put<Trip>(`/api/trips/${id}`, { name });
      setTrips((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Trips</h1>
        <Button onClick={() => navigate('/trips/new')} className="flex items-center gap-2">
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Trip
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <ErrorMessage message={error} retry={loadTrips} />
      )}

      {/* Empty state */}
      {!isLoading && !error && trips.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            No trips yet
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-xs">
            Create your first trip to start planning your route.
          </p>
          <Button onClick={() => navigate('/trips/new')}>Create your first trip</Button>
        </div>
      )}

      {/* Trip list */}
      {!isLoading && !error && trips.length > 0 && (
        <div className="space-y-4">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onOpen={(id) => navigate(`/trips/${id}`)}
              onDuplicate={handleDuplicate}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
