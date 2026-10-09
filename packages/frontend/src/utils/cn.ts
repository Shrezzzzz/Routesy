import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names with Tailwind CSS conflict resolution.
 * All components use this utility for className construction.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
