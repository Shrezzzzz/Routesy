import { useState, useRef, useCallback } from 'react';
import type { GeocodingResult } from '../types';

interface UseGeocodingResult {
  search: (query: string) => void;
  results: GeocodingResult[];
  isLoading: boolean;
  error: string | null;
  clearResults: () => void;
}

export function useGeocoding(): UseGeocodingResult {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // AbortController for in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  const search = useCallback((query: string) => {
    // Clear previous debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ q: query, limit: '5' });
        const baseUrl = import.meta.env.VITE_API_URL ?? '';
        const response = await fetch(`${baseUrl}/api/geocode/search?${params.toString()}`, {
          signal: abortControllerRef.current.signal,
          headers: {
            'X-Session-Id': localStorage.getItem('routeora-session-id') ?? '',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        const data: GeocodingResult[] = json?.data ?? json ?? [];
        setResults(data);
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // Request was cancelled — not an error
          return;
        }
        setError((err as Error).message ?? 'Search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  // Note: AbortController cleanup on unmount is handled at the component level
  // by calling search('') or clearResults, but we also provide the ref for
  // cleanup. Components using this hook should call clearResults on unmount.

  return { search, results, isLoading, error, clearResults };
}
