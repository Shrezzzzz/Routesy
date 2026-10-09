import { useState } from 'react';
import { MapPin, Clock, Copy, Trash2, ExternalLink, Pencil, Check, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Trip } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface TripCardProps {
  trip: Trip;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

function formatDistance(metres?: number): string | null {
  if (metres === undefined || metres === null) return null;
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TripCard({ trip, onOpen, onDuplicate, onRename, onDelete }: TripCardProps) {
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(trip.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleRenameSubmit() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== trip.name) {
      onRename(trip.id, trimmed);
    }
    setRenaming(false);
  }

  function handleRenameCancel() {
    setNameValue(trip.name);
    setRenaming(false);
  }

  const distance = trip.routeCache
    ? formatDistance(trip.routeCache.totalDistance)
    : null;
  const stopCount = trip.stops?.length ?? 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        {/* Title */}
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                id={`rename-${trip.id}`}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') handleRenameCancel();
                }}
                className="flex-1 rounded border border-indigo-400 px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                aria-label="Trip name"
              />
              <button
                onClick={handleRenameSubmit}
                aria-label="Confirm rename"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={handleRenameCancel}
                aria-label="Cancel rename"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{trip.name}</h3>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              {stopCount} stop{stopCount !== 1 ? 's' : ''}
            </span>
            {distance && (
              <span>{distance}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              {formatDate(trip.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onOpen(trip.id)}
          className="flex items-center gap-1"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          Open
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onDuplicate(trip.id)}
          aria-label={`Duplicate trip ${trip.name}`}
          className={cn('flex items-center gap-1')}
        >
          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          Duplicate
        </Button>
        <button
          onClick={() => setRenaming(true)}
          aria-label={`Rename trip ${trip.name}`}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-red-600 dark:text-red-400">Delete?</span>
            <button
              onClick={() => onDelete(trip.id)}
              aria-label="Confirm delete"
              className="min-h-[36px] px-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              aria-label="Cancel delete"
              className="min-h-[36px] px-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete trip ${trip.name}`}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </Card>
  );
}
