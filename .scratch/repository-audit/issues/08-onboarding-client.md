# 08: S1-03 onboarding repairs, client side

Status: ready-for-human

Client code commit: `d5465a4` (branch `worktree-agent-ac599edafa0b5df87`).
Nothing under `supabase/` was edited; server work stays in the pending migration
`20261105000003_lock_tenant_key.sql` and its README.

## Per issue

| Issue | Status | Commit | Test (file :: name) |
|---|---|---|---|
| FUNC-03 hospital signup stale closure | done client-side | `d5465a4` | `src/test/onboarding/signup-hospital.test.tsx` :: "creates the hospital with the userId returned by signup, not the stale auth state"; `src/test/onboarding/signup-hospital.test.tsx` :: "shows the server reason when hospital creation is refused, and sends the user to account setup"; `src/test/integration/signup-flow.test.tsx` :: "completes signup and navigates to role setup" (now expects the userId) |
| FUNC-03 PublicRoute redirect race | done client-side | `d5465a4` | `src/test/onboarding/edgeFunctionError.test.ts` :: "tracks whether a hospital sign-up submit is running" (flag; the route wiring has no direct test) |
| EDGE-24 create-hospital-admin dead end | server done (pending migration + function, S0-03); client surfaces the 409/4xx reason | `d5465a4` | `src/test/onboarding/edgeFunctionError.test.ts` :: "returns the server error text from a 409 body instead of the generic message" |
| FUNC-01 patient self-registration | client done in S0-03 (`PatientRegisterPage` calls only `register-patient`); server in pending migration | n/a (S0-03) | n/a |
| DB-15 onboarding RPCs | needs server (pending migration: `register_patient`, `accept_staff_invitation`, `ON CONFLICT`, uuid token). No client call to `assign_patient_role` remains | n/a | n/a |
| FUNC-04 staff list empty (`is_staff` never set) | client done (list derived from non-patient `user_roles`); server still needs to set `is_staff` and backfill | `d5465a4` | `src/test/onboarding/staff-directory.test.tsx` :: "lists staff derived from non-patient roles in the hospital, not from profiles.is_staff"; "shows an empty list without querying profiles when no staff roles exist" |
| FUNC-21 invitations | partly done client-side: acceptInvitation contract, !PROD E2E gate, wizard `invited_by`, one-role guard, honest copy. Needs server: email via `send-email`, partial unique index `WHERE status = 'pending'`, existing-user accept path | `d5465a4` | `src/test/onboarding/useStaffInvitations.test.tsx` :: "sends the body accept-invitation-signup expects"; "records invited_by as the inviter profile id"; "ignores the E2E mock bypass in production builds"; "keeps the E2E mock bypass outside production builds" |
| FUNC-21 JoinPage acceptance error text | done client-side | `d5465a4` | `src/test/onboarding/join-error.test.tsx` :: "shows the server reason when accept-invitation-signup responds with an error status" |
| EDGE-23 validate-invitation-token 500 on bad tokens | needs server (`supabase/functions/validate-invitation-token`) | n/a | n/a |

## Open items for a human

- With email confirmation on, a new hospital account has no session after `signup()`. Hospital creation then shows "Confirm your email address and sign in to finish creating your hospital." and the user is sent to account setup. Product decision needed.
- The wizard keeps its toast wording ("Invitation created") but the e2e spec `tests/e2e/comprehensive-workflow-7-roles.spec.ts` still looks for "Invitation sent" in a different UI; not touched.
