import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import Layout from '../components/Layout';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

const Landing = lazy(() => import('../pages/Landing'));
const Trips = lazy(() => import('../pages/Trips'));
const NewTrip = lazy(() => import('../pages/NewTrip'));
const TripPlanner = lazy(() => import('../pages/TripPlanner'));
const TripNavigate = lazy(() => import('../pages/TripNavigate'));
const ShareView = lazy(() => import('../pages/ShareView'));
const Settings = lazy(() => import('../pages/Settings'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSkeleton variant="card" className="w-80" />
    </div>
  );
}

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageFallback />}>
            <Landing />
          </Suspense>
        ),
      },
      {
        path: 'trips',
        element: (
          <Suspense fallback={<PageFallback />}>
            <Trips />
          </Suspense>
        ),
      },
      {
        path: 'trips/new',
        element: (
          <Suspense fallback={<PageFallback />}>
            <NewTrip />
          </Suspense>
        ),
      },
      {
        path: 'trips/:tripId',
        element: (
          <Suspense fallback={<PageFallback />}>
            <TripPlanner />
          </Suspense>
        ),
      },
      {
        path: 'trips/:tripId/navigate',
        element: (
          <Suspense fallback={<PageFallback />}>
            <TripNavigate />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageFallback />}>
            <Settings />
          </Suspense>
        ),
      },
    ],
  },
  // Share route has no Layout (public, no nav)
  {
    path: '/share/:shareToken',
    element: (
      <Suspense fallback={<PageFallback />}>
        <ShareView />
      </Suspense>
    ),
  },
];

export const router = createBrowserRouter(routes);
