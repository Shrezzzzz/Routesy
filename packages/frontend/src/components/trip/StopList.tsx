import { useState, useRef, type DragEvent } from 'react';
import { StopCard } from './StopCard';
import type { Stop } from '../../types';
import { StopStatus } from '../../types';

interface StopListProps {
  stops: Stop[];
  selectedStopId?: string;
  onSelect?: (stopId: string) => void;
  onReorder?: (reordered: Stop[]) => void;
  onEdit?: (stopId: string) => void;
  onDelete?: (stopId: string) => void;
}

function getStopStatus(stop: Stop): StopStatus {
  if (stop.visitedAt) return StopStatus.VISITED;
  if (stop.skipped) return StopStatus.SKIPPED;
  return StopStatus.PENDING;
}

export function StopList({
  stops,
  selectedStopId,
  onSelect,
  onReorder,
  onEdit,
  onDelete,
}: StopListProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragItemRef = useRef<Stop | null>(null);

  function handleDragStart(e: DragEvent<HTMLDivElement>, index: number) {
    dragItemRef.current = stops[index];
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== overIndex) {
      setOverIndex(index);
    }
  }

  function handleDragEnd() {
    if (
      draggingIndex !== null &&
      overIndex !== null &&
      draggingIndex !== overIndex &&
      onReorder
    ) {
      const newStops = [...stops];
      const [removed] = newStops.splice(draggingIndex, 1);
      newStops.splice(overIndex, 0, removed);

      // Re-assign sequence numbers
      const reordered = newStops.map((s, i) => ({ ...s, sequence: i + 1 }));
      onReorder(reordered);
    }
    setDraggingIndex(null);
    setOverIndex(null);
    dragItemRef.current = null;
  }

  function handleDragLeave() {
    setOverIndex(null);
  }

  if (stops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
        <p className="text-sm">No stops added yet.</p>
        <p className="text-xs mt-1">Add your first destination above.</p>
      </div>
    );
  }

  return (
    <ol className="space-y-2" aria-label="Trip stops">
      {stops.map((stop, index) => {
        const status = getStopStatus(stop);
        const isDragging = draggingIndex === index;
        const isOver = overIndex === index && draggingIndex !== index;

        return (
          <li
            key={stop.id}
            className={isOver ? 'border-t-2 border-indigo-400' : undefined}
          >
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDragLeave={handleDragLeave}
            >
              <StopCard
                stop={stop}
                sequenceNumber={stop.sequence}
                status={status}
                selected={selectedStopId === stop.id}
                onSelect={() => onSelect?.(stop.id)}
                onEdit={onEdit ? () => onEdit(stop.id) : undefined}
                onDelete={onDelete ? () => onDelete(stop.id) : undefined}
                isDragging={isDragging}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
