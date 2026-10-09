// TypeScript types matching Prisma models and API responses

export enum TravelMode {
  DRIVING = 'driving',
  WALKING = 'walking',
  CYCLING = 'cycling',
}

export enum RouteMode {
  MANUAL = 'manual',
  OPTIMIZED = 'optimized',
}

export enum StopStatus {
  PENDING = 'pending',
  CURRENT = 'current',
  VISITED = 'visited',
  SKIPPED = 'skipped',
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stop {
  id: string;
  tripId: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  sequence: number;
  notes?: string;
  category?: string;
  estimatedVisitMinutes?: number;
  visitedAt?: string;
  skipped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RouteLeg {
  distance: number;
  duration: number;
}

export interface RouteCache {
  id: string;
  tripId: string;
  totalDistance: number;
  totalDuration: number;
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString;
  legs: RouteLeg[];
  calculatedAt: string;
}

export interface Trip {
  id: string;
  ownerId?: string;
  sessionId?: string;
  name: string;
  description?: string;
  startLocationName?: string;
  startLatitude?: number;
  startLongitude?: number;
  endLocationName?: string;
  endLatitude?: number;
  endLongitude?: number;
  travelMode: string;
  routeMode: string;
  isPublic: boolean;
  shareToken?: string;
  stops?: Stop[];
  routeCache?: RouteCache;
  createdAt: string;
  updatedAt: string;
}

export interface GeocodingResult {
  displayName: string;
  lat: number;
  lon: number;
  placeId: string;
  type: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface ApiError extends Error {
  status: number;
  details?: unknown;
}
