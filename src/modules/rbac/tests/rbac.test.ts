import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_ROLES,
  PermissionCategory,
  ROLE_SCOPE_ONLY_PATHS,
  ROUTE_POLICY_INVALID_ROLES,
  ROUTE_POLICIES,
  can,
  decideRouteAccess,
  findRoutePolicy,
  grantedCapabilities,
  isCanonicalRole,
  policyRolesFor,
  resolveActingRole,
} from '@/modules/rbac';
import { flatRouteManifest, routeManifest } from '@/config/routeManifest';

// Vitest runs from the repository root.
const SRC_DIR = resolve(process.cwd(), 'src');
const ROUTE_DEFINITIONS = join(SRC_DIR, 'routes', 'routeDefinitions.tsx');

describe('canonical roles (ADR-0002)', () => {
  it('lists exactly the seven canonical roles', () => {
    expect([...CANONICAL_ROLES].sort()).toEqual(
      ['admin', 'doctor', 'lab_technician', 'nurse', 'patient', 'pharmacist', 'receptionist'].sort()
    );
  });

  it('rejects roles outside the canonical list, including billing and phantom admin roles', () => {
    for (const role of ['billing_manager', 'super_admin', 'hospital_admin', 'dept_head', 'cfo', '']) {
      expect(isCanonicalRole(role)).toBe(false);
      expect(can(role, PermissionCategory.BILLING_READ)).toBe(false);
    }
  });
});

describe('single decision for guard and navigation', () => {
  it('route table and sidebar agree for every role and every manifest item', () => {
    for (const role of CANONICAL_ROLES) {
      for (const group of routeManifest) {
        const visibleItems = group.items.filter(
          (item) => item.allowedRoles.includes(role) && decideRouteAccess(item.href, role).allowed
        );
        for (const item of group.items) {
          const navVisible = visibleItems.includes(item);
          const guardAllows = decideRouteAccess(item.href, role).allowed;
          expect(navVisible, `${role} ${item.href}`).toBe(guardAllows);
        }
        // A group shows when any of its items does, so a visible item is never hidden in its group.
        expect(group.items.some((item) => decideRouteAccess(item.href, role).allowed)).toBe(
          visibleItems.length > 0
        );
      }
    }
  });

  it('manifest role lists are the policy roles, not hand-written copies', () => {
    for (const item of flatRouteManifest) {
      expect(item.allowedRoles, item.href).toEqual([...policyRolesFor(item.href)]);
    }
  });

  it('every role-protected route in routeDefinitions has a policy', () => {
    const source = readFileSync(ROUTE_DEFINITIONS, 'utf8');
    const pattern = /path:\s*'([^']+)',\s*element:\s*withRoleAccess\(/g;
    const paths = [...source.matchAll(pattern)].map((match) => match[1]);
    expect(paths.length).toBeGreaterThan(40);
    for (const path of paths) {
      const concrete = path.replace(/:[^/]+/g, 'sample');
      expect(findRoutePolicy(concrete), path).toBeDefined();
    }
  });

  it('a route is never allowed when its policy is missing or the role is unknown', () => {
    expect(decideRouteAccess('/no-such-route', 'admin').allowed).toBe(false);
    expect(decideRouteAccess('/patients', 'billing_manager').allowed).toBe(false);
    expect(decideRouteAccess('/patients', undefined).allowed).toBe(false);
  });

  it('keeps the billing boundary: clinical roles never reach billing', () => {
    expect(decideRouteAccess('/billing', 'doctor').allowed).toBe(false);
    expect(decideRouteAccess('/billing', 'nurse').allowed).toBe(false);
    expect(decideRouteAccess('/billing', 'receptionist').allowed).toBe(true);
    expect(can('doctor', 'billing:read')).toBe(false);
    expect(can('nurse', 'billing:write')).toBe(false);
  });
});

describe('matrix and policy parity', () => {
  it('every capability on a route is held by every role the route lists', () => {
    for (const policy of ROUTE_POLICIES) {
      expect(ROUTE_POLICY_INVALID_ROLES, policy.path).toEqual([]);
      if (!policy.capability) continue;
      for (const role of policy.roles) {
        expect(can(role, policy.capability), `${role} ${policy.path} ${policy.capability}`).toBe(true);
      }
    }
  });

  it('pins the routes gated by role scope only, so a new gap is a deliberate decision', () => {
    // These have no canonical capability in rbac.ts yet. Adding one means updating this list too.
    expect([...ROLE_SCOPE_ONLY_PATHS].sort()).toEqual(
      [
        '/ai-demo',
        '/consultations/mobile',
        '/dashboard',
        '/differential-diagnosis',
        '/documents',
        '/hospital/doctor/dashboard',
        '/hospital/nurse/medications',
        '/hospital/pharmacy/queue',
        '/integration/workflow',
        '/laboratory/automation',
        '/length-of-stay-forecasting',
        '/messages',
        '/nurse/protocols',
        '/predictive-analytics',
        '/pharmacy/clinical',
        '/profile',
        '/resource-utilization-optimization',
        '/suppliers',
        '/telemedicine',
        '/testing',
        '/treatment-plan-optimization',
        '/treatment-recommendations',
        '/voice-clinical-notes',
        '/workflow/discharge',
        '/workflow/optimization',
      ].sort()
    );
  });
});

describe('deny by default', () => {
  it('denies non-canonical permission keys, wildcards and unknown capabilities', () => {
    expect(can('admin', '*')).toBe(false);
    expect(can('admin', 'admin:*')).toBe(false);
    expect(can('admin', 'ai-demo')).toBe(false);
    expect(can('doctor', 'predictive-analytics')).toBe(false);
  });

  it('does not grant by substring or by category prefix', () => {
    expect(can('pharmacist', 'prescription')).toBe(false);
    expect(can('doctor', 'patient')).toBe(false);
  });

  it('SECF-07 acceptance: no admin clinical writes and no doctor dispensing', () => {
    expect(can('doctor', 'prescription:dispense')).toBe(false);
    expect(can('admin', 'prescription:write')).toBe(false);
  });

  it('exposes only matrix grants as capabilities', () => {
    expect(grantedCapabilities('patient')).toContain(PermissionCategory.PORTAL_ACCESS);
    expect(grantedCapabilities('patient')).not.toContain(PermissionCategory.PATIENT_WRITE);
    expect(grantedCapabilities(undefined)).toEqual([]);
  });
});

describe('acting role', () => {
  it('acts as the primary role and ignores other roles held', () => {
    const acting = resolveActingRole({ primaryRole: 'receptionist' });
    expect(acting).toBe('receptionist');
    expect(can(acting, 'consultation:write')).toBe(false);
  });

  it('lets a dev test role override the primary role', () => {
    expect(resolveActingRole({ primaryRole: 'admin', testRole: 'nurse' })).toBe('nurse');
  });

  it('returns null, which denies, for missing or non-canonical roles', () => {
    expect(resolveActingRole({ primaryRole: null })).toBeNull();
    expect(resolveActingRole({ primaryRole: 'billing_manager' })).toBeNull();
    expect(resolveActingRole({ primaryRole: 'admin', testRole: 'super_admin' })).toBeNull();
  });
});

describe('manifest exposes no extra roles', () => {
  it('derives group roles from items', () => {
    for (const group of routeManifest) {
      const union = new Set(group.items.flatMap((item) => item.allowedRoles));
      expect(new Set(group.allowedRoles)).toEqual(union);
    }
  });
});

/**
 * Role literals in check positions must be canonical. This scans src/ for role
 * comparisons, role-list checks and role arrays. Test files are excluded because
 * they assert negative cases with non-canonical strings on purpose.
 */
const ROLE_CHECK_PATTERNS: RegExp[] = [
  /\b[\w.]*[Rr]ole[sS]?\b\s*(?:===|!==|==|!=)\s*'([^']+)'/g,
  /'([^']+)'\s*(?:===|!==|==|!=)\s*[\w.]*[Rr]ole[sS]?\b/g,
  /\[([^[\]]*)\]\s*\.includes\(\s*[\w.]*[Rr]ole[sS]?\b/g,
  /\b(?:allowedRoles|requiredRoles|allowed_roles|allowedRole)\s*[:=]\s*\[([^\]]*)\]/g,
  /\b(?:hasAnyAllowedRole|hasAnyRole)\(\s*[^,()]+,\s*\[([^\]]*)\]/g,
  /\b(?:canManageRole|canAccessRole|hasPermission|hasAnyPermission|hasAllPermissions|getRolePermissions|getEffectivePermissions)\(\s*'([^']+)'/g,
];

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      listSourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

// Patterns 2..4 capture a bracketed list; only its quoted items are role literals.
// Bare identifiers in a list are variables and are not checked.
const LIST_PATTERN_INDEXES = new Set([2, 3, 4]);

function roleLiteralsIn(text: string): string[] {
  const literals: string[] = [];
  ROLE_CHECK_PATTERNS.forEach((pattern, index) => {
    for (const match of text.matchAll(pattern)) {
      const captured = match[1];
      if (LIST_PATTERN_INDEXES.has(index)) {
        literals.push(...[...captured.matchAll(/'([^']+)'/g)].map((m) => m[1]));
      } else {
        literals.push(captured);
      }
    }
  });
  return literals;
}

describe('no role strings outside the canonical list in src/ checks', () => {
  it('scans every non-test source file', () => {
    expect(listSourceFiles(SRC_DIR).length).toBeGreaterThan(100);
  });

  it('flags only canonical role literals', () => {
    const offenders: string[] = [];
    for (const file of listSourceFiles(SRC_DIR)) {
      const relativePath = relative(SRC_DIR, file);
      // Test fixtures assert negative cases with non-canonical strings on purpose.
      if (relativePath.startsWith(`test${sep}`) || relativePath.startsWith(`modules${sep}rbac${sep}tests${sep}`)) {
        continue;
      }
      const text = readFileSync(file, 'utf8');
      for (const literal of roleLiteralsIn(text)) {
        if (!isCanonicalRole(literal)) {
          offenders.push(`${relativePath}: '${literal}'`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
