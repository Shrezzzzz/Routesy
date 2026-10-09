interface StopCoordinate {
  lat: number;
  lng: number;
}

interface RouteLeg {
  distance: number;
  duration: number;
}

interface RouteResult {
  totalDistance: number;  // in metres
  totalDuration: number;  // in seconds
  geometry: unknown;      // GeoJSON geometry
  legs: RouteLeg[];
}

interface OSRMRoute {
  distance: number;
  duration: number;
  geometry: unknown;
  legs: Array<{ distance: number; duration: number }>;
}

interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
}

export class RoutingService {
  private lastRequestAt = 0;
  private readonly minIntervalMs = 1000; // 1-second rate limit
  private readonly maxWaypoints = 25;

  async calculateRoute(stops: StopCoordinate[], travelMode = 'driving'): Promise<RouteResult> {
    if (stops.length < 2) {
      throw new Error('At least 2 stops are required to calculate a route');
    }

    // Map travel mode to OSRM profile
    const profileMap: Record<string, string> = {
      driving: 'driving',
      walking: 'foot',
      cycling: 'cycling',
    };
    const profile = profileMap[travelMode] ?? 'driving';

    // For more than 25 waypoints, split into overlapping segments and merge
    if (stops.length > this.maxWaypoints) {
      return this.calculateLargeRoute(stops, profile);
    }

    return this.fetchRoute(stops, profile);
  }

  private async fetchRoute(stops: StopCoordinate[], profile: string): Promise<RouteResult> {
    // Enforce 1-second rate limit
    await this.enforceRateLimit();

    // OSRM coordinate order is longitude,latitude
    const coordinates = stops.map((s) => `${s.lng},${s.lat}`).join(';');
    const url = `http://router.project-osrm.org/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&steps=false`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OSRM routing request failed with status ${response.status}`);
    }

    const data: OSRMResponse = await response.json() as OSRMResponse;

    if (data.code !== 'Ok') {
      throw new Error(`OSRM returned error code: ${data.code}`);
    }

    const route = data.routes[0];
    if (!route) {
      throw new Error('OSRM returned no routes');
    }

    return {
      totalDistance: route.distance,
      totalDuration: route.duration,
      geometry: route.geometry,
      legs: route.legs.map((leg) => ({
        distance: leg.distance,
        duration: leg.duration,
      })),
    };
  }

  private async calculateLargeRoute(stops: StopCoordinate[], profile: string): Promise<RouteResult> {
    const segments: RouteResult[] = [];
    let i = 0;

    while (i < stops.length - 1) {
      const end = Math.min(i + this.maxWaypoints, stops.length);
      const segment = stops.slice(i, end);

      if (segment.length < 2) break;

      const result = await this.fetchRoute(segment, profile);
      segments.push(result);

      // Overlap by 1 (the last stop of this segment is the first of the next)
      i += this.maxWaypoints - 1;
    }

    // Merge segments
    const allLegs: RouteLeg[] = [];
    let totalDistance = 0;
    let totalDuration = 0;
    // Use geometry from first segment (simplified merge)
    const mergedGeometry = segments[0]?.geometry ?? { type: 'LineString', coordinates: [] };

    for (const seg of segments) {
      totalDistance += seg.totalDistance;
      totalDuration += seg.totalDuration;
      allLegs.push(...seg.legs);
    }

    return {
      totalDistance,
      totalDuration,
      geometry: mergedGeometry,
      legs: allLegs,
    };
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < this.minIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, this.minIntervalMs - elapsed));
    }
    this.lastRequestAt = Date.now();
  }
}

// Singleton instance
export const routingService = new RoutingService();
