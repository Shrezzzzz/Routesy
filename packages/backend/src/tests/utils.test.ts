import { describe, it, expect } from 'vitest';
import { buildGoogleMapsUrl } from '../utils/navigationUrl';
import { generateShareToken } from '../services/ShareService';

describe('buildGoogleMapsUrl', () => {
  it('builds a driving URL with travelmode=driving', () => {
    const url = buildGoogleMapsUrl(22.5726, 88.3639, 'Victoria Memorial', 'driving');
    expect(url).toContain('travelmode=driving');
    expect(url).toContain('destination=');
    expect(url).toContain('google.com/maps/dir/');
  });

  it('builds a walking URL with travelmode=walking', () => {
    const url = buildGoogleMapsUrl(22.5726, 88.3639, 'Victoria Memorial', 'walking');
    expect(url).toContain('travelmode=walking');
  });

  it('builds a cycling URL with travelmode=bicycling', () => {
    const url = buildGoogleMapsUrl(22.5726, 88.3639, 'Victoria Memorial', 'cycling');
    expect(url).toContain('travelmode=bicycling');
  });

  it('defaults to driving when no mode specified', () => {
    const url = buildGoogleMapsUrl(22.5726, 88.3639, 'Victoria Memorial');
    expect(url).toContain('travelmode=driving');
  });

  it('includes encoded coordinates in the URL', () => {
    const url = buildGoogleMapsUrl(22.5726, 88.3639, 'Test Place', 'driving');
    expect(url).toContain('22.5726');
    expect(url).toContain('88.3639');
  });
});

describe('generateShareToken', () => {
  it('returns a 21-character string', () => {
    const token = generateShareToken();
    expect(token).toHaveLength(21);
  });

  it('returns a string (not null or undefined)', () => {
    const token = generateShareToken();
    expect(typeof token).toBe('string');
  });

  it('generates unique tokens each time', () => {
    const token1 = generateShareToken();
    const token2 = generateShareToken();
    expect(token1).not.toBe(token2);
  });
});

describe('reorder sequence logic', () => {
  it('correctly sorts stops by sequence after reorder updates', () => {
    const stops = [
      { id: 'a', sequence: 2 },
      { id: 'b', sequence: 0 },
      { id: 'c', sequence: 1 },
    ];

    const reorderInput = [
      { id: 'a', sequence: 0 },
      { id: 'b', sequence: 1 },
      { id: 'c', sequence: 2 },
    ];

    // Apply the reorder
    const updated = stops.map((stop) => {
      const update = reorderInput.find((r) => r.id === stop.id);
      return update ? { ...stop, sequence: update.sequence } : stop;
    });

    // Sort by sequence
    const sorted = [...updated].sort((a, b) => a.sequence - b.sequence);

    expect(sorted[0].id).toBe('a');
    expect(sorted[1].id).toBe('b');
    expect(sorted[2].id).toBe('c');
    expect(sorted.map((s) => s.sequence)).toEqual([0, 1, 2]);
  });
});
