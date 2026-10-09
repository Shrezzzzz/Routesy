import { forwardRef, type ReactNode } from 'react';
import L from 'leaflet';
import { MapContainer as LeafletMapContainer, TileLayer } from 'react-leaflet';

// Fix Leaflet default icon broken-image issue with Vite
// See: https://github.com/Leaflet/Leaflet/issues/4968
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Remove the broken prototype method and set correct paths
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

interface RouteMapContainerProps {
  children?: ReactNode;
  className?: string;
  center?: [number, number];
  zoom?: number;
}

// Kolkata center coordinates
const KOLKATA_CENTER: [number, number] = [22.57, 88.36];

/**
 * Wraps React Leaflet's MapContainer with sensible defaults for Routeora.
 * Default center is Kolkata for the initial Durga Puja pandal use case.
 */
const RouteMapContainer = forwardRef<L.Map, RouteMapContainerProps>(
  ({ children, className, center = KOLKATA_CENTER, zoom = 12 }, _ref) => {
    return (
      <LeafletMapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className={className ?? 'h-full w-full'}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </LeafletMapContainer>
    );
  }
);

RouteMapContainer.displayName = 'RouteMapContainer';

export default RouteMapContainer;
