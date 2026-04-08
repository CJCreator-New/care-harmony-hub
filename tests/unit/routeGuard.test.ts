import { describe, expect, it } from 'vitest';
import { checkRouteAccess } from '@/middleware/routeGuard';

describe('checkRouteAccess', () => {
  it('uses the most specific route match for nested settings routes', () => {
    expect(checkRouteAccess('/settings/staff', ['admin']).allowed).toBe(true);
    expect(checkRouteAccess('/settings/staff', ['doctor']).allowed).toBe(false);
  });

  it('supports inherited permissions instead of exact string matches only', () => {
    expect(checkRouteAccess('/billing', ['receptionist']).allowed).toBe(true);
    expect(checkRouteAccess('/queue', ['doctor']).allowed).toBe(true);
  });

  it('allows operational roles to access the shared workflow dashboard', () => {
    expect(checkRouteAccess('/integration/workflow', ['doctor']).allowed).toBe(true);
    expect(checkRouteAccess('/integration/workflow', ['lab_technician']).allowed).toBe(true);
    expect(checkRouteAccess('/integration/workflow', ['patient']).allowed).toBe(false);
  });
});
