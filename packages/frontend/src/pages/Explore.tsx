import { Link } from 'react-router-dom';
import { Map } from 'lucide-react';

export default function Explore() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 mb-6">
        <Map className="w-8 h-8 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
      </div>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Explore</h1>

      <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-8">
        Discover public trips and popular routes — coming soon.
      </p>

      <Link
        to="/trips"
        className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 text-sm min-h-[44px]"
      >
        Back to My Trips
      </Link>
    </div>
  );
}
