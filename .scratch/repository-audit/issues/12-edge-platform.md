# 12: S2-07 Edge-function platform hygiene

Status: in-progress (shared-layer work done; per-function items open)
Type: task
Roadmap: S2-07 (docs/repository-audit/IMPLEMENTATION_ROADMAP.md)
Issues: EDGE-11, EDGE-15, EDGE-18, EDGE-26, EDGE-27, EDGE-29, EDGE-10, EDGE-17
Depends on: S0-06 (not blocking; authorize.ts and tenantScope.ts are owned by another agent and were read, not changed)

## Scope of this change

Limited to `supabase/functions/_shared/*` (except `authorize.ts` and `tenantScope.ts`), `supabase/config.toml`, and the helper call sites that had to change. Handler bodies were not rewritten. Excluded by instruction: `critical-lab-check`, `phi-crypto`, the 2FA functions, `backup-manager`, `fhir-integration`, `create-hospital-admin`, `accept-invitation-signup`, `register-patient`, `verify-backup-code`, `generate-backup-codes`.

## Done

- [x] EDGE-11: `_shared/rateLimitKey.ts` (pure) derives the key. A verified user id wins. Otherwise the key is the first `x-forwarded-for` hop (best effort). `_shared/rateLimit.ts` checks the bearer token against `GET {SUPABASE_URL}/auth/v1/user` with the existing env names. The anon key and failed checks fall back to IP. Nothing throws out of the check.
- [x] EDGE-11: `withRateLimit` returns a Response on every path (429, handler result, and a JSON 500 on handler error or non-Response). It copies the handler response before adding `X-RateLimit-Remaining`, because fetch responses have immutable headers.
- [x] EDGE-11: the `{limit}` typo is honoured as a deprecated alias of `maxRequests`, so existing call sites are enforced. Affects `accept-invitation-signup` (8 per 10 min), `validate-invitation-token` (10 per 5 min) and `ai-clinical-support` (10 per min), which were unlimited before.
- [x] EDGE-11: `ai-clinical-support` inline `rateLimit(req, {limit, window})` call removed. It passed the request as the bucket key and returned a plain object. The serve-level `withRateLimit` applies the same limit.
- [x] EDGE-11 tests: `tests/edge-platform/rateLimitKey.test.ts` (key derivation, config resolution, enforcement, independence of users, window reset, Retry-After, store sweep).
- [x] EDGE-26: CORS origin policy is `_shared/corsPolicy.ts` (pure). `CORS_ALLOWED_ORIGINS` is still the allow-list. The localhost default applies only when `ENVIRONMENT` is not `production`. In production with the allow-list unset, all browser origins are rejected and an error is logged. Server-to-server requests (no Origin) are unaffected. `ENVIRONMENT` is the existing signal (see errorHandler.ts and docs/repository-audit/REPOSITORY_ARCHITECTURE.md). No new env var.
- [x] EDGE-26: `tests/edge-platform/corsPolicy.test.ts`.
- [x] EDGE-26: `_shared/response.ts` adds `jsonResponse(req, status, body, headers)` (per-request CORS) and `withResponseHeader`.
- [x] EDGE-26: `validationErrorResponse(error, req?)` now returns CORS headers. Call sites passing `req`: `billing-reconciliation`, `census-reports`, `discharge-workflow`.
- [x] EDGE-26: `corsHeaders` export is `Object.freeze`d and marked `@deprecated` (see Open).
- [x] EDGE-26: `config.toml` has entries for the 28 missing functions (see decisions below).
- [x] EDGE-15, EDGE-18, EDGE-10, EDGE-17, EDGE-29: nothing outside the limit fix above was in scope (see Open).

## Open

- [ ] EDGE-11: rate-limit store is still per isolate (in-memory, resets on cold start). Durable store (Postgres `rate_limits` or Redis) needs a migration or new service. Not done here: `supabase/migrations` is out of scope.
- [ ] EDGE-11: six deployable functions still have no limiter: `phi-crypto`, `critical-lab-check`, `drug-interaction-check`, `lab-result-notify`, `pediatric-dosing`, `prescription-approval`. Per-function change, and some are excluded by instruction.
- [ ] EDGE-11: per-account lockout for TOTP and backup codes. Owned by the 2FA and backup-code tickets.
- [ ] EDGE-11 side effect: `getIdentifier(req)` is now IP-keyed unless a verified user id is passed. `fhir-integration` calls `rateLimit(getIdentifier(req))` in its own limiter, so its per-caller bucket is now per IP. `fhir-integration` is on the do-not-change list; flagged for the owner of that ticket.
- [ ] EDGE-11 cost: `withRateLimit` makes one GoTrue `/auth/v1/user` call per request that carries a non-anon bearer token. Caching was not added.
- [ ] EDGE-18: `ai-clinical-support` still fails at module load. `validateAIClinicalRequest` is imported from `_shared/validation.ts` but is not exported (confirmed with `tsc`). Fix is `aiClinicalSupportSchema` in the handler. Handler change, not done here.
- [ ] EDGE-18: `ai-clinical-support` helpers still reference the module-level `corsHeaders` import (this file is in S0-06 scope). Needs `req` threaded into the helpers.
- [ ] EDGE-18: `predict-deterioration` `hospital_id` ReferenceError at line 116 and the `risk_assessment` tenant pin. Handler change, not done here.
- [ ] EDGE-26: module-level headers still in use. `monitoring`, `workflow-automation`, `insurance-integration` and `analytics-engine` spread the module-level `defaultCorsHeaders` alias inside helper functions that have no `req`. `fhir-integration` (do-not-change) spreads module-level `corsHeaders` in `fhirResponse`. Freezing the value stops mutation but not the fixed origin. Those helpers need the request threaded through.
- [ ] EDGE-26: `errorHandler.createErrorResponse` / `createSuccessResponse` still omit CORS headers (no `req` parameter). Adding an optional `req` is a follow-up.
- [ ] EDGE-26: `authorize.ts` already returns CORS headers on 401, 403 and 500 at this commit (checked). The ticket's item 2 for that file is stale. Not changed (owned by the other agent).
- [ ] EDGE-26: no CI check that every function directory has a `config.toml` entry. The 28 entries are in place. `phase5/` contains three nested functions with no top-level `index.ts`, so it is not a deployable function and has no entry.
- [ ] EDGE-27: not addressed. The only remote imports in `_shared` are in `authorize.ts` (owned by the other agent). The function imports, `supabase/functions/deno.json` and `deno.lock` are outside this ticket's file ownership. The new `_shared` files add no remote imports.
- [ ] EDGE-29: not addressed. Per-function (`drug-interaction-check` handler: RxNav endpoint, `encodeURIComponent`, replacement provider). Not a `_shared` concern.
- [ ] EDGE-15: not addressed. Per-function (`appointment-reminders`, `monitoring`, `system-monitoring`, `health-check`, `phase5/*`): platform jobs callable by tenant users, hard-coded metrics, service-role `listUsers` in `health-check`.
- [ ] EDGE-10: not addressed. Per-function (`insurance-integration` fabricated adjudication and payments). The `insurance-integration` helper call sites still use the module-level alias (see EDGE-26 above).
- [ ] EDGE-17: not addressed. Per-function (`lab-result-notify` fake delivery, fail-open criticality, PHI in logs). Handler change; `lab-result-notify` is not on the do-not-change list but is a clinical handler.

## config.toml decisions

Every missing function has `verify_jwt = true`. Declaring `true` matches the Supabase CLI default, so the gateway behaviour is unchanged. None of the 28 is a cron or webhook entry point that needs `verify_jwt = false` with an in-code secret. No function that does its own user check was set to `false`.

| Function | Own auth check (from grep and code) | verify_jwt | Note |
|---|---|---|---|
| accept-invitation-signup | Invitation token (service role). No user JWT check | true | Review: a public flow. Gateway still needs the anon key |
| ai-clinical-support | `getAuthorizedActor` (doctor, admin) | true | Does not boot (EDGE-18) |
| analytics-engine | `getUser` + `authorize` (admin, doctor) | true | |
| audit-logger | `getAuthorizedActor` | true | |
| backup-manager | Retired, 410 (`retiredFunctionResponse`) | true | Behaviour unchanged |
| billing-reconciliation | `getAuthorizedActor` (admin) | true | |
| census-reports | `getAuthorizedActor` | true | |
| clinical-pharmacy | `getAuthorizedActor` | true | |
| create-hospital-admin | Requires Authorization, `getUser` | true | |
| discharge-workflow | `authorize` + `getAuthorizedActor` | true | |
| fhir-integration | Per-action `getUser`; 401 without Authorization | true | |
| health-check | No auth check found in the GET path | true | Review: public probe? Setting `false` would open it. Not changed |
| insurance-integration | `getAuthorizedActor` (admin, receptionist) | true | EDGE-10 |
| lab-automation | `getAuthorizedActor` | true | |
| lab-result-notify | `getAuthorizedActor` | true | EDGE-17 |
| monitoring | `authorize` (admin) | true | EDGE-15 |
| optimize-queue | `getAuthorizedActor` | true | |
| pediatric-dosing | `getAuthorizedActor` | true | |
| predict-deterioration | `getAuthorizedActor` | true | EDGE-18 |
| register-patient | No user-JWT check found by grep (not read in full) | true | Review: public self-registration. Not changed |
| store-2fa-secret | Retired, 410 | true | Behaviour unchanged |
| symptom-analysis | `getAuthorizedActor` | true | |
| system-monitoring | `authorize` (admin) | true | EDGE-15 |
| telemedicine | `getAuthorizedActor` | true | |
| test-execution | `authorize` (admin); 501 after the check | true | |
| validate-invitation-token | Invitation token (service role). No user JWT check | true | Review: as accept-invitation-signup |
| verify-2fa | Retired, 410 | true | Behaviour unchanged |
| workflow-automation | `getAuthorizedActor` | true | |

Decision for the owner: `accept-invitation-signup`, `validate-invitation-token`, `register-patient` and `health-check` are unauthenticated flows. Setting them to `verify_jwt = false` would be a behaviour change (they would accept calls with no key). If that is wanted, it needs an in-code check or a deliberate exposure review first.

## Verification

- Vitest, new suites: `npx vitest run tests/edge-platform --exclude '.claude/**'` gives 23 passed, 0 failed.
- Vitest, full suite: `npx vitest run --exclude '.claude/**'` gives 39 failed tests in 20 failed files, and 4082 passed. The baseline in this worktree was not re-run, so the 48 pre-existing entries could not be compared line by line. Failures were attributed by file. The ones in files that reference the changed modules are all in `tests/security/discharge-workflow-scoping.test.ts` (5 source-string assertions on lines not changed here) and `tests/api/edge-functions.test.ts` (a live network fetch). All other failures are in files with no link to this change.
- `npm run type-check`: exit 0.
- `npm run lint:boundaries`: exit 0 (229 modules, 813 dependencies, no violations).
- `npx tsc --noEmit --strict --target ES2022 --lib ES2022,DOM,DOM.Iterable` on `_shared/rateLimitKey.ts` and `_shared/corsPolicy.ts`: no errors in these files. The parent `node_modules` `@types` produce unrelated resolution noise under the default module setting; `--moduleResolution node --skipLibCheck` clears it.
- Deno-side files (`rateLimit.ts`, `cors.ts`, `response.ts`, `validation.ts`) could not be type-checked or run here, because Deno URL imports and `Deno.env` do not resolve. Syntax-level check only, with Deno resolution errors filtered: no syntax errors. Remaining errors are the two above (`tenantScope.ts`, and the EDGE-18 missing export), neither introduced here.
- Not executed: `deno test`, `deno check`, and a `supabase functions serve` boot. None was run in this environment.
