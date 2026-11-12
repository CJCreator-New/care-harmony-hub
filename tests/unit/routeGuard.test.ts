import { describe, expect, it } from 'vitest';
import { checkRouteAccess } from '@/middleware/routeGuard';

// The guard takes the acting role (one canonical role), not a list of roles.
describe('checkRouteAccess', () => {
  it('uses the most specific route match for nested settings routes', () => {
    expect(checkRouteAccess('/settings/staff', 'admin').allowed).toBe(true);
    expect(checkRouteAccess('/settings/staff', 'doctor').allowed).toBe(false);
  });

  it('applies the route policy for front-desk and clinical routes', () => {
    expect(checkRouteAccess('/billing', 'receptionist').allowed).toBe(true);
    expect(checkRouteAccess('/queue', 'doctor').allowed).toBe(true);
  });

  it('allows operational roles to access the shared workflow dashboard', () => {
    expect(checkRouteAccess('/integration/workflow', 'doctor').allowed).toBe(true);
    expect(checkRouteAccess('/integration/workflow', 'lab_technician').allowed).toBe(true);
    expect(checkRouteAccess('/integration/workflow', 'patient').allowed).toBe(false);
  });

  it('denies a role list passed where a single acting role is expected', () => {
    expect(checkRouteAccess('/queue', ['doctor'] as unknown as string).allowed).toBe(false);
  });
});
