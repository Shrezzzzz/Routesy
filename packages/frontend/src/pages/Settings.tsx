import { Sun, Moon, LogIn, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

export default function Settings() {
  const { theme, setTheme } = useTheme();

  // Check for auth token in localStorage
  const authToken = localStorage.getItem('routeora-token');
  const userEmail = localStorage.getItem('routeora-user-email');
  const isAuthenticated = Boolean(authToken);

  function handleLogout() {
    localStorage.removeItem('routeora-token');
    localStorage.removeItem('routeora-user-email');
    // Force re-render (page reload keeps it simple for now)
    window.location.reload();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Settings</h1>

      {/* Display preferences */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Display
        </h2>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Theme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choose light or dark mode
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
              <button
                onClick={() => setTheme('light')}
                aria-label="Switch to light mode"
                aria-pressed={theme === 'light'}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors min-h-[36px]',
                  theme === 'light'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                )}
              >
                <Sun className="w-4 h-4" aria-hidden="true" />
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                aria-label="Switch to dark mode"
                aria-pressed={theme === 'dark'}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors min-h-[36px]',
                  theme === 'dark'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                )}
              >
                <Moon className="w-4 h-4" aria-hidden="true" />
                Dark
              </button>
            </div>
          </div>
        </Card>
      </section>

      {/* Account section */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Account
        </h2>
        <Card>
          {isAuthenticated ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Signed in
                </p>
                {userEmail && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {userEmail}
                  </p>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Sign in to sync your trips across devices and access them anywhere.
              </p>
              <div className="flex gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-h-[44px]"
                >
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors min-h-[44px]"
                >
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  Create account
                </Link>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* App info */}
      <p className="text-xs text-center text-slate-400 dark:text-slate-600 mt-8">
        Routeora — Plan your stops. Enjoy the journey.
      </p>
    </div>
  );
}
