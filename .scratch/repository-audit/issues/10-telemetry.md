# 10: S2-05 Consolidate observability with PHI-safe telemetry

Status: partly done (client path consolidated and redacted; server-side sinks remain)
Type: task
Roadmap: S2-05 (docs/repository-audit/IMPLEMENTATION_ROADMAP.md)
Issues: PERF-12, SECF-12, EDGE-21, EDGE-17
Depends on: S0-02 (fetch interceptor; its fetch behaviour is not changed here)

## Per-issue status

### PERF-12 Overlapping observability stacks: partly
- [x] One `Sentry.init` in `src` (`src/lib/monitoring/sentry.ts`, called from `main.tsx`). Removed the two other inits (`src/utils/errorTracking.ts`, `src/utils/sentry-integration.ts`, `src/bootstrap/error-tracking.ts`).
- [x] One client logger (`src/utils/logger.ts`). Production logs go to Sentry breadcrumbs. The `fetch('/api/logs')` batch in the logger is removed. `src/utils/logging.ts` is a thin alias.
- [x] Telemetry stub (`src/utils/telemetry.ts`, 293 lines, `@ts-nocheck`) replaced by a 100-line facade over the logger. Callers unchanged.
- [x] Duplicate analytics module `src/lib/monitoring/analytics.ts` (unused, sent events to `/api/analytics/events`) deleted. `src/utils/analytics.ts` redacts properties and logs through the logger.
- [x] `bootstrap()` no longer initialises error tracking. `App.tsx` no longer passes `errorTracking`.
- [x] `main.tsx` global handlers log through the logger. The `window.Sentry` bridge (never set with the npm SDK) is removed. Sentry's global handlers capture the errors.
- [ ] Remaining: `src/utils/correlationId.ts` `logClinicalEvent` still does `fetch('/api/logs')`. The fetch belongs to S0-02 and was left unchanged. Its body is now redacted. `src/lib/performance/web-vitals.ts` still posts to `/api/analytics/performance` (no PHI: metric name and value only). Endpoint does not exist server-side.
- [ ] Remaining: 230 files in `src` still call `console.*` directly (about 640 calls). Only calls whose arguments carry PHI-shaped fields are guarded. Routing the rest is mechanical and was left for the owning areas (several are in off-limits paths).
- [ ] Remaining: no log sink for `logger.error` other than a Sentry breadcrumb. Sentry attaches breadcrumbs to the next event. A `captureException` call is needed where an error must be an event.
- [ ] Remaining: OpenTelemetry deps in `package.json` are unused (not removed: no dependency changes in this task).
- [ ] Remaining: `vite.config.ts` `drop_console` still strips the dev console output. Out of scope (build config).

### SECF-12 Sentry scrubbing: done (client), verified by test
- [x] `sendDefaultPii: false`. `setUser` sends id, role and hospital only. `AuthContext` no longer passes e-mail.
- [x] `beforeBreadcrumb`: console crumbs dropped. For fetch, xhr and http crumbs, query strings and bodies are removed. The PostgREST `or=(first_name.ilike...)` case is covered by a test.
- [x] `beforeSend`: `user` reduced to id/role/hospital_id. `extra`, `contexts` and messages run through the shared redactor. `request.query_string` removed. The `console.error` debug call that printed the user object is removed.
- [x] Replay integration has no effect (not registered). Session replay rates are set to 0.
- [ ] Remaining: a BAA with the Sentry/GlitchTip vendor and the CSP host decision (organisational / deployment).

### EDGE-21 Error responses and logs: partly (shared helper done; handlers remain)
- [x] One edge helper: `supabase/functions/_shared/sanitizeLog.ts`. Exports `logEdge`, `redactLogValue`, `sanitizeObjectForLog`, `sanitizeLogMessage`, `REDACTED_KEY_WORDS`. Keys match the client list (parity test).
- [x] `_shared/errorHandler.ts` and `_shared/tracing.ts` log through `logEdge`. Errors are logged as name and scrubbed message only.
- [ ] Remaining (handlers, not in scope): `error.message` and `details` in response bodies in `critical-lab-check`, `lab-result-notify`, `prescription-approval`, `pediatric-dosing`, `phase5/mark-no-show`, `fhir-integration`, `send-email`. `console.error(alertError)` in `critical-lab-check` logs Postgres row values. Those handlers must switch to `logEdge` / `createErrorResponse`.
- [ ] Remaining: free-text person names inside arbitrary error strings cannot be detected by pattern. Handlers must not put record bodies into error messages.

### EDGE-17 lab-result-notify: partly (logging only)
- [ ] Remaining (handler, not in scope): the function still writes phone numbers, e-mail and lab values with `console.log` (`lab-result-notify/index.ts:222`), reports fake delivery, and fails open on criticality. Fix in the function: remove or implement real dispatch, fail closed, and use `logEdge`. The shared helper is ready for it.

## Guards and tests

- `src/utils/consoleGuard.test.ts`: fails if a `console.*` call in `src/` names PHI-shaped fields in its arguments (string literals are ignored). Only `src/utils/logger.ts` may call console directly. Known debt is a ratchet (currently empty).
- `src/utils/loggerRedaction.test.ts`: key redaction, string scrubbing, no PHI printed by the logger, Sentry breadcrumb/event scrubbing (SECF-12 acceptance example), telemetry facade redaction.
- `src/utils/logger.test.ts`: existing tests, unchanged.
- `tests/telemetry/edgeSanitizeLog.test.ts`: edge helper redaction, `logEdge` sink, `errorHandler` output, parity of the key list with the client.

## Known limitations

- Redaction is key-based and pattern-based. A person's name inside a free-text string (no key) is not detected.
- Keys are matched by word. `hospital_name` is redacted because it contains `name` (over-redaction is accepted in logs).
