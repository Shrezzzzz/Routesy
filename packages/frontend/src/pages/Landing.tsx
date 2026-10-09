import { useNavigate } from 'react-router-dom';
import { MapPin, Route, Navigation } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

const SAMPLE_STOPS = [
  { name: 'College Square Puja', address: 'College Square, Kolkata', sequence: 1 },
  { name: 'Kumartuli Park', address: 'Kumartuli, North Kolkata', sequence: 2 },
  { name: 'Bagbazar Sarbojanin', address: 'Bagbazar, Kolkata', sequence: 3 },
  { name: 'Shyambazar Five Point', address: 'Shyambazar, Kolkata', sequence: 4 },
];

const HOW_IT_WORKS = [
  {
    icon: MapPin,
    step: '1',
    title: 'Add your stops',
    description:
      'Search for any destination and build your itinerary. Add as many stops as you need — no limits.',
  },
  {
    icon: Route,
    step: '2',
    title: 'View the route',
    description:
      'See all your stops on one interactive map with numbered markers. Calculate the total distance and travel time.',
  },
  {
    icon: Navigation,
    step: '3',
    title: 'Navigate one stop at a time',
    description:
      'Open Google Maps to each stop in sequence. Mark stops as visited and track your progress.',
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Hero section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6">
          <MapPin className="w-4 h-4" aria-hidden="true" />
          Multi-stop route planner
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
          Plan your stops.{' '}
          <span className="text-indigo-600 dark:text-indigo-400">Enjoy the journey.</span>
        </h1>

        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
          Built for Durga Puja pandal-hopping, road trips, food tours, and any multi-stop
          adventure. Plan once, share once, navigate one stop at a time.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={() => navigate('/trips/new')}>
            Create a Trip
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/trips')}
          >
            View My Trips
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-10">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map(({ icon: Icon, step, title, description }) => (
            <div key={step} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 mb-4">
                <Icon className="w-7 h-7" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {step}. {title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sample itinerary preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-lg mx-auto">
          <Card shadow>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Durga Puja 2024 — Kolkata
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {SAMPLE_STOPS.length} stops · ~18 km
                </p>
              </div>
              <Badge variant="current">In Progress</Badge>
            </div>

            <ol className="space-y-2">
              {SAMPLE_STOPS.map((stop, i) => (
                <li
                  key={stop.name}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    {stop.sequence}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {stop.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {stop.address}
                    </p>
                  </div>
                  {i === 0 && (
                    <Badge variant="visited">Visited</Badge>
                  )}
                </li>
              ))}
            </ol>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => navigate('/trips/new')}
              >
                Create your own
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
