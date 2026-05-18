import { describe, expect, it } from 'vitest';
import { flatRouteManifest } from '@/config/routeManifest';
import { redirectRoutes, protectedRoutes } from '@/routes/routeDefinitions';

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

  it('keeps fixed admin navigation routes available', () => {
    const protectedPaths = protectedRoutes.map((route) => route.path);
    const redirectPaths = redirectRoutes.map((route) => route.path);
    const manifestHrefs = flatRouteManifest.map((route) => route.href);

    expect(protectedPaths).toContain('/kiosk');
    expect(protectedPaths).toContain('/integration/workflow');
    expect(redirectPaths).toContain('/workflow');
    expect(redirectPaths).toContain('/administration');
    expect(manifestHrefs).toContain('/nurse/protocols');
  });

  it('hides business and pharmacy routes from doctor and nurse sidebars', () => {
    const pharmacy = flatRouteManifest.find((route) => route.href === '/pharmacy');
    const billing = flatRouteManifest.find((route) => route.href === '/billing');
    const reports = flatRouteManifest.find((route) => route.href === '/reports');

    expect(pharmacy?.allowedRoles).not.toContain('doctor');
    expect(pharmacy?.allowedRoles).not.toContain('nurse');
    expect(billing?.allowedRoles).not.toContain('doctor');
    expect(billing?.allowedRoles).not.toContain('nurse');
    expect(reports?.allowedRoles).not.toContain('doctor');
    expect(reports?.allowedRoles).not.toContain('nurse');
  });
});
