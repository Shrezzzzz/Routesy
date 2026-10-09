/**
 * Builds a Google Maps navigation URL for a given destination.
 * Duplicated intentionally on the frontend to avoid a network call just to get a URL string.
 */
export function buildGoogleMapsUrl(
  lat: number,
  lng: number,
  name: string,
  mode: 'driving' | 'walking' | 'cycling' = 'driving'
): string {
  const modeMap: Record<string, string> = {
    driving: 'driving',
    walking: 'walking',
    cycling: 'bicycling',
  };

  const travelmode = modeMap[mode] ?? 'driving';
  const destination = encodeURIComponent(`${lat},${lng}`);
  const label = encodeURIComponent(name);

  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${label}&travelmode=${travelmode}`;
}
