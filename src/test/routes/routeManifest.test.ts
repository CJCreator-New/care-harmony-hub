import { describe, expect, it } from 'vitest';
import { flatRouteManifest } from '@/config/routeManifest';

describe('route manifest contract', () => {
  it('defines unique hrefs for every manifest entry', () => {
    const hrefs = flatRouteManifest.map((route) => route.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('requires feature flags for all tier3 routes', () => {
    const tier3Routes = flatRouteManifest.filter((route) => route.releaseTier === 'tier3');

    expect(tier3Routes.length).toBeGreaterThan(0);
    tier3Routes.forEach((route) => {
      expect(route.featureFlag).toBeTruthy();
    });
  });
});
