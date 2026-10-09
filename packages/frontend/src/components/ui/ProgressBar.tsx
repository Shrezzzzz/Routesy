import { cn } from '../../utils/cn';

type ProgressBarVariant = 'indigo' | 'green' | 'amber' | 'red';

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  color?: ProgressBarVariant;
  className?: string;
}

const colorClasses: Record<ProgressBarVariant, string> = {
  indigo: 'bg-indigo-600',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

export function ProgressBar({
  value,
  label,
  color = 'indigo',
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>{label}</span>
          <span>{Math.round(clampedValue)}%</span>
        </div>
      )}
      <div
        className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', colorClasses[color])}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
