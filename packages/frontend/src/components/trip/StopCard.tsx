import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Badge } from '../ui/Badge';
import type { Stop } from '../../types';
import { StopStatus } from '../../types';

interface StopCardProps {
  stop: Stop;
  sequenceNumber: number;
  status: StopStatus;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}

function getStatusVariant(status: StopStatus) {
  switch (status) {
    case StopStatus.VISITED:
      return 'visited' as const;
    case StopStatus.SKIPPED:
      return 'skipped' as const;
    case StopStatus.CURRENT:
      return 'current' as const;
    default:
      return 'pending' as const;
  }
}

function getStatusLabel(status: StopStatus): string {
  switch (status) {
    case StopStatus.VISITED:
      return 'Visited';
    case StopStatus.SKIPPED:
      return 'Skipped';
    case StopStatus.CURRENT:
      return 'Current';
    default:
      return 'Pending';
  }
}

function formatVisitTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StopCard({
  stop,
  sequenceNumber,
  status,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  dragHandleProps,
  isDragging = false,
}: StopCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer',
        'min-h-[44px]',
        selected
          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        aria-label="Drag to reorder"
        className="flex-shrink-0 text-slate-300 dark:text-slate-600 hover:text-slate-500 cursor-grab active:cursor-grabbing min-h-[44px] min-w-[24px] flex items-center"
      >
        <GripVertical className="w-4 h-4" aria-hidden="true" />
      </div>

      {/* Sequence badge */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
          status === StopStatus.VISITED
            ? 'bg-green-500 text-white'
            : status === StopStatus.SKIPPED
            ? 'bg-amber-500 text-white'
            : status === StopStatus.CURRENT
            ? 'bg-red-500 text-white'
            : 'bg-indigo-600 text-white'
        )}
        aria-label={`Stop ${sequenceNumber}`}
      >
        {sequenceNumber}
      </div>

      {/* Name and address */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{stop.name}</p>
        {stop.address && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {stop.address}
          </p>
        )}
        {stop.visitedAt && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
            Visited at {formatVisitTime(stop.visitedAt)}
          </p>
        )}
      </div>

      {/* Status badge */}
      <Badge variant={getStatusVariant(status)} className="flex-shrink-0">
        {getStatusLabel(status)}
      </Badge>

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {onEdit && (
          <button
            onClick={onEdit}
            aria-label={`Edit stop ${stop.name}`}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            aria-label={`Delete stop ${stop.name}`}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
