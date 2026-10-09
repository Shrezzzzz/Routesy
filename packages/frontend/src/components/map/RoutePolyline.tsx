import { Polyline } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import type { RouteCache } from '../../types';

interface RoutePolylineProps {
  geometry: RouteCache['geometry'] | null | undefined;
  color?: string;
  weight?: number;
  opacity?: number;
}

function extractCoordinates(
  geometry: RouteCache['geometry']
): LatLngTuple[] {
  if (geometry.type === 'LineString') {
    return geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLngTuple);
  }

  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.flat().map(([lng, lat]) => [lat, lng] as LatLngTuple);
  }

  return [];
}

/**
 * Renders the GeoJSON route geometry as a Leaflet Polyline.
 * Renders nothing if geometry is null/undefined.
 */
export function RoutePolyline({
  geometry,
  color = '#4f46e5',
  weight = 4,
  opacity = 0.7,
}: RoutePolylineProps) {
  if (!geometry) return null;

  const positions = extractCoordinates(geometry);
  if (positions.length === 0) return null;

  return (
    <Polyline
      positions={positions}
      pathOptions={{ color, weight, opacity }}
    />
  );
}
