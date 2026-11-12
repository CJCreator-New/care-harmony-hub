import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/auth';

/**
 * The acting clinician, derived in one place from AuthContext (CLIN-27).
 *
 * - `role` is a role the user actually holds (`roles` / `primaryRole`).
 *   Supabase's `user.role` is the Postgres role ('authenticated') and
 *   `profile.role` does not exist, so neither is ever used.
 * - `hospitalId` is the user's own tenant (`profile.hospital_id`). There is no
 *   default tenant: a missing value stays `null`.
 */
export interface ClinicalActorResolution<R extends string = UserRole> {
  readonly userId: string | null;
  readonly hospitalId: string | null;
  readonly role: R | null;
  /** Set only when user, tenant and role are all known; `null` means fail closed. */
  readonly actor: { readonly id: string; readonly hospitalId: string; readonly role: R } | null;
  /** Why `actor` is null, for display. */
  readonly error: string | null;
}

export interface ResolveClinicalActorInput<R extends string> {
  readonly userId?: string | null;
  readonly hospitalId?: string | null;
  readonly roles?: readonly string[] | null;
  readonly primaryRole?: string | null;
  /** Role the screen acts in. Used only when the user holds it. */
  readonly actingRole?: R;
  /** Restrict the candidate roles (for example, clinical roles only). */
  readonly allowedRoles?: readonly R[];
}

export function resolveClinicalActor<R extends string = UserRole>(
  input: ResolveClinicalActorInput<R>
): ClinicalActorResolution<R> {
  const { userId, hospitalId, roles, primaryRole, actingRole, allowedRoles } = input;
  const held = (roles ?? []).filter(
    (r): r is R => !allowedRoles || (allowedRoles as readonly string[]).includes(r)
  );

  let role: R | null = null;
  if (actingRole && held.includes(actingRole)) role = actingRole;
  else if (primaryRole && (held as readonly string[]).includes(primaryRole)) role = primaryRole as R;
  else role = held[0] ?? null;

  const uid = userId || null;
  const hid = hospitalId || null;

  let error: string | null = null;
  if (!uid) error = 'You are not signed in.';
  else if (!hid) error = 'Your account is not linked to a hospital.';
  else if (!role) error = 'Your account has no role that can perform this action.';

  return {
    userId: uid,
    hospitalId: hid,
    role,
    actor: uid && hid && role ? { id: uid, hospitalId: hid, role } : null,
    error,
  };
}

export function useClinicalActor<R extends string = UserRole>(
  options: { actingRole?: R; allowedRoles?: readonly R[] } = {}
): ClinicalActorResolution<R> {
  const { user, profile, roles, primaryRole } = useAuth();
  const { actingRole, allowedRoles } = options;
  return useMemo(
    () =>
      resolveClinicalActor<R>({
        userId: user?.id,
        hospitalId: profile?.hospital_id,
        roles,
        primaryRole,
        actingRole,
        allowedRoles,
      }),
    [user?.id, profile?.hospital_id, roles, primaryRole, actingRole, allowedRoles]
  );
}
