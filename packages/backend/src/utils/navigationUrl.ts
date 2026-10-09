/**
 * Builds a Google Maps URL to navigate to a destination.
 * Google Maps travelmode params: driving, walking, bicycling, transit
 */
export function buildGoogleMapsUrl(
  lat: number,
  lng: number,
  name: string,
  mode: 'driving' | 'walking' | 'cycling' = 'driving'
): string {
  const travelmodeMap: Record<string, string> = {
    driving: 'driving',
    walking: 'walking',
    cycling: 'bicycling',
  };

  const travelmode = travelmodeMap[mode] ?? 'driving';
  const destination = encodeURIComponent(`${lat},${lng}`);
  const destinationName = encodeURIComponent(name);

  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${destinationName}&travelmode=${travelmode}`;
}
