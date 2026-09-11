import { describe, expect, it } from 'vitest';
import { estimateEtaMinutes, haversineKm } from './geo';

describe('geo helpers', () => {
  it('measures a short Parral hop in kilometers', () => {
    const km = haversineKm(
      { latitude: -36.141, longitude: -71.822 },
      { latitude: -36.151, longitude: -71.832 },
    );
    expect(km).toBeGreaterThan(1);
    expect(km).toBeLessThan(2);
  });

  it('estimates ETA at 40 km/h with a 1 minute floor', () => {
    expect(estimateEtaMinutes(0)).toBe(1);
    expect(estimateEtaMinutes(20)).toBe(30);
  });
});
