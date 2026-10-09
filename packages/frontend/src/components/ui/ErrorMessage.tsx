import { AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

interface ErrorMessageProps {
  message: string;
  retry?: () => void;
  className?: string;
}

export function ErrorMessage({ message, retry, className }: ErrorMessageProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800',
        className
      )}
      role="alert"
    >
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      {retry && (
        <Button variant="secondary" size="sm" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
