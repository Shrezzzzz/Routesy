interface NominatimResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: Record<string, string>;
}

interface GeocodingResult {
  displayName: string;
  lat: number;
  lon: number;
  placeId: string;
  type: string;
}

export class GeocodingService {
  private lastRequestAt = 0;
  private readonly minIntervalMs = 1000; // 1-second minimum between requests

  async search(query: string, limit = 5): Promise<GeocodingResult[]> {
    // Enforce 1-second rate limit between requests
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < this.minIntervalMs) {
      await this.delay(this.minIntervalMs - elapsed);
    }

    this.lastRequestAt = Date.now();

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Routesy/1.0 (contact@routesy.app)',
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding request failed with status ${response.status}`);
    }

    const results: NominatimResult[] = await response.json() as NominatimResult[];

    return results.map((r) => ({
      displayName: r.display_name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      placeId: String(r.place_id),
      type: r.type,
    }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const geocodingService = new GeocodingService();
