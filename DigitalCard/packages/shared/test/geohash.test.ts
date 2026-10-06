import { describe, expect, it } from 'vitest';
import { encodeGeohash } from '../src/geohash';

describe('encodeGeohash', () => {
  it('matches known reference values', () => {
    expect(encodeGeohash(57.64911, 10.40744, 11)).toBe('u4pruydqqvj');
    expect(encodeGeohash(47.9184, 106.9177)).toBe('y2s08g'); // Ulaanbaatar, Sükhbaatar Square
  });
  it('is coarse: two phones a few metres apart share the 5-char cell', () => {
    expect(encodeGeohash(47.9184, 106.9177).slice(0, 5)).toBe(encodeGeohash(47.91845, 106.91775).slice(0, 5));
  });
  it('uses only the geohash alphabet accepted by the database', () => {
    expect(encodeGeohash(-33.86, 151.21)).toMatch(/^[0-9b-hjkmnp-z]{6}$/);
  });
  it('rejects invalid coordinates', () => {
    expect(() => encodeGeohash(91, 0)).toThrow('invalid_coordinates');
    expect(() => encodeGeohash(Number.NaN, 0)).toThrow('invalid_coordinates');
  });
});
