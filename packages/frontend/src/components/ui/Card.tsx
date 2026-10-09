import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  shadow?: boolean;
  border?: boolean;
}

export function Card({
  children,
  className,
  padding = true,
  shadow = false,
  border = true,
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl',
        border && 'border border-slate-200 dark:border-slate-700',
        padding && 'p-4',
        shadow && 'shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}
