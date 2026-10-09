import { cn } from '../../utils/cn';

interface LoadingSkeletonProps {
  variant?: 'card' | 'list-item' | 'map-panel';
  className?: string;
}

export function LoadingSkeleton({ variant = 'card', className }: LoadingSkeletonProps) {
  if (variant === 'list-item') {
    return (
      <div className={cn('animate-pulse flex items-center gap-3 p-3', className)}>
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (variant === 'map-panel') {
    return (
      <div className={cn('animate-pulse w-full h-full bg-slate-200 dark:bg-slate-700 rounded-lg', className)} />
    );
  }

  // Default: card
  return (
    <div className={cn('animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3', className)}>
      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>
    </div>
  );
}
