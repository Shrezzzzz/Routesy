import {
  useState,
  useEffect,
  useRef,
  type KeyboardEvent,
  useCallback,
} from 'react';
import { Search, Loader2, MapPin } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { GeocodingResult } from '../../types';

interface SearchComboboxProps {
  placeholder?: string;
  onSearch: (query: string) => Promise<GeocodingResult[]> | void;
  onSelect: (result: GeocodingResult) => void;
  isLoading?: boolean;
  className?: string;
  label: string;
  id?: string;
}

export function SearchCombobox({
  placeholder = 'Search for a location…',
  onSearch,
  onSelect,
  isLoading = false,
  className,
  label,
  id,
}: SearchComboboxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  const doSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      setSearching(true);
      try {
        const r = await onSearch(q);
        if (r) {
          setResults(r);
          setOpen(r.length > 0);
          setActiveIndex(-1);
        }
      } finally {
        setSearching(false);
      }
    },
    [onSearch]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectResult(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function selectResult(result: GeocodingResult) {
    onSelect(result);
    setQuery(result.displayName);
    setOpen(false);
    setResults([]);
    setActiveIndex(-1);
  }

  const isSearching = isLoading || searching;

  return (
    <div className={cn('relative', className)}>
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="w-4 h-4" aria-hidden="true" />
          )}
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${inputId}-listbox`}
          aria-activedescendant={activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
        />
      </div>

      {open && results.length > 0 && (
        <ul
          ref={listRef}
          id={`${inputId}-listbox`}
          role="listbox"
          aria-label={`Search results for ${query}`}
          className="absolute z-50 mt-1 w-full rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg max-h-60 overflow-y-auto"
        >
          {results.map((result, index) => (
            <li
              key={result.placeId}
              id={`${inputId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={() => selectResult(result)}
              className={cn(
                'flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors',
                index === activeIndex
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              )}
            >
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
              <span className="text-sm line-clamp-2">{result.displayName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
