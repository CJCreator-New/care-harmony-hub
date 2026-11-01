# Performance & Reliability Audit

> CareSync HIMS repository audit, 2026-11-01. Commit `43ab8f7`.
> Rule applied: **no performance problem is reported as confirmed without a measurement.** The only measurements available were the production build output and static counts. There was no backend, so query latency, real-user metrics and load could not be measured. Runtime performance items are therefore reported as *risks with evidence* (LIKELY or SUSPECTED) and paired with a measurement plan.

## 1. Measured: production build (lead-executed)

Command: `VITE_SUPABASE_URL=https://stub.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=stub-anon-key npx vite build`. Exit code 0 in 39 s (Vite 7, SWC, terser). 171 assets.

| Metric | Value | Comment |
|---|---|---|
| Total JS (raw) | 4.00 MB | Across 171 assets, route-split (69 lazy pages) |
| **Initial load (gzip)** | **≈308 KB** | `index` 114 KB, `ui` 79 KB, `supabase` 40 KB, `index.css` 27 KB, `icons` 13 KB, `tanstack` 10 KB, `router` 7 KB, `dates` 7 KB, `utils` 6 KB |
| Largest chunks (raw) | `charts` 490 KB (122 KB gz), `index` 385 KB, `ui` 255 KB, `useAI` 177 KB, `supabase` 165 KB, `VoiceClinicalNotesPage` 152 KB, `motion` 121 KB, `ConsultationWorkflowPage` 106 KB | `useAI` bundles the OpenAI and Anthropic SDKs into the browser (see SECF-03) |
| PWA precache | 184 entries / 4.33 MB | Every client downloads all route chunks on first install, including ones its role never uses |
| Sourcemaps | disabled | `build.sourcemap: false`. This also means production errors in Sentry are not symbolicated. |
| `console.*` | removed by terser (`drop_console`) | Production log transport relies on `/api/logs`, which does not exist (PERF-12) |

**Assessment.** The initial payload of about 308 KB gzip is acceptable for an authenticated line-of-business SPA. Route-level code splitting works. The README's claim of a "96% bundle reduction" could not be reproduced, because no baseline exists. The main measurable improvements are:
- Remove the AI SDKs from the client (−177 KB raw on AI routes; required for security anyway).
- Lazy-load `recharts` only where charts render.
- Scope the PWA precache to the shell and common routes.
- Upload hidden sourcemaps to Sentry.

## 2. Static evidence (counts)

| Signal | Count | Source |
|---|---|---|
| Unbounded `select()` in live code (no `.range`/`.limit`) | 201 | PERF-07 (scripted scan) |
| Dashboards aggregating client-side under PostgREST's 1,000-row cap | several (see PERF-07, FUNC-28) | silently truncated statistics |
| Realtime channel call sites | 45 | PERF-09 (channels re-created on navigation) |
| `refetchInterval` / `setInterval` polling in live code | see PERF-10 | root-mounted admin metrics hook polls for every role |
| `react-hooks/exhaustive-deps` warnings | 175 total (71 in live code) | ESLint run |
| Live files over 600 lines | 34 | ARCH-09 |
| Edge-function calls per row (decrypt / patient fetch) | N+1 patterns on list pages | PERF-08 |

## 3. Reliability themes

1. **Non-atomic multi-step client sagas.** Consultation completion, check-in, dispensing and payments all chain several writes without a transaction, so a mid-way failure leaves inconsistent state (CLIN-07, CLIN-04, FUNC-06, FUNC-16). Move these into RPCs or edge functions with a single transaction.
2. **Silent failure modes.** Errors are swallowed, which hides outages and data loss: `.catch` → pass, failed reads shown as zero (UX-01), and audit inserts that fail silently (ARCH-05).
3. **A cross-cutting fetch interceptor** probably breaks every edge-function call through CORS (PERF-01). This is a single point of failure introduced by observability code.
4. **Overlapping observability stacks.** Sentry is initialized up to 3 times, alongside a separate OTel and logger stack (PERF-12, SECF-12).
5. **Cache and session coupling.** The React Query cache is not cleared on logout (SECF-05/PERF-03), and the PWA caches API responses (SECF-04).

## 4. Measurement plan (to turn risks into confirmed metrics)

| Metric | Tool | Target | When |
|---|---|---|---|
| LCP / INP / CLS per role dashboard | `web-vitals` (already wired) → RUM endpoint, plus Lighthouse CI on 5 routes | LCP < 2.5 s, INP < 200 ms, CLS < 0.1 on a mid-tier laptop | Sprint 3 |
| Query latency p95 per table/RPC | Supabase `pg_stat_statements` + PostgREST logs | p95 < 300 ms for list queries | Sprint 0 (baseline), Sprint 3 |
| RLS overhead | `EXPLAIN ANALYZE` with `SET request.jwt.claims` for 10 hottest queries | No seq scans on `hospital_id`/`patient_id` | Sprint 2 |
| Bundle budget | `rollup-plugin-visualizer` (installed) + size-limit in CI | Initial ≤ 300 KB gz; no route chunk > 150 KB gz | Sprint 3 |
| Realtime connections per user | Supabase Realtime inspector | ≤ 5 channels per session, stable across navigation | Sprint 3 |
| Load | k6 script exists (`tests/performance/load-test.js`), but k6 is not installed and there is no staging target | 72 concurrent users (documented peak) at p95 < 1 s | Sprint 5 |

## 5. Detailed performance and reliability findings (PERF-xx)

### PERF-01: Global `fetch` monkey-patch adds `x-correlation-id` to every request, but Edge Function CORS does not allow it — likely breaks all browser `functions.invoke` calls
- Severity: P1
- Category: Performance
- Status: LIKELY
- Module: Observability bootstrap / Edge Functions
- Location: src/App.tsx:52; src/bootstrap/correlation-id.ts:9-11; src/utils/correlationId.ts:169-204; src/integrations/supabase/client.ts:27; supabase/functions/_shared/cors.ts:16-19
- Evidence:
  ```
  correlationId.ts:177   headers.set('x-correlation-id', correlationId);
  correlationId.ts:202   const originalFetch = window.fetch;
  correlationId.ts:203   window.fetch = injectCorrelationIdIntoFetch(originalFetch);
  _shared/cors.ts:17-18  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  ```
- Actual behavior / Expected behavior: `bootstrap()` (App `useEffect`) replaces `window.fetch`. The Supabase client's `safeFetch` calls the global `fetch` at call time, so every REST/Auth/Functions/Storage call now carries the non-safelisted `x-correlation-id` (and `x-trace-context` when set). Browsers preflight such requests; the 42 functions using `_shared/cors.ts` answer `OPTIONS` with an allow-list that omits these headers → the browser blocks the call. Affected live calls include `drug-interaction-check`, `phi-crypto` (PHI decrypt), `store-2fa-secret`/`verify-totp`, `critical-lab-check`. Additional defects: when `fetch(Request)` is called without `init`, the wrapper builds headers from `init` only and drops the Request's headers; `registerFetchInterceptor` is not idempotent (re-wraps on every `bootstrap()` call, e.g. HMR). Expected: correlation IDs only on same-origin/explicitly allowed hosts, and CORS allow-lists that include them.
- Reproduction: In a deployed build, open DevTools → Network, trigger a prescription DDI check; inspect the `OPTIONS /functions/v1/drug-interaction-check` response `Access-Control-Allow-Headers` and the console CORS error. (Not executed in this audit.)
- Root cause: Cross-cutting concern implemented by mutating a global instead of via the Supabase client's `global.headers`/fetch option; edge CORS list not updated.
- Impact: If confirmed: fail-closed CDS degrades to "manual review" on every order, PHI fields render `[Encrypted]`, 2FA enrolment/verification fails — i.e. multiple clinical and security workflows broken in production.
- Recommendation: Remove the global monkey-patch; pass `global: { headers: { 'x-correlation-id': … } }` (or wrap in `safeFetch` only for `SUPABASE_URL`); add `x-correlation-id, x-trace-context` to `_shared/cors.ts`; make registration idempotent; add a Playwright smoke that calls one edge function from the browser.
- Effort: S
- Acceptance criteria: Browser smoke test invoking `drug-interaction-check` succeeds in staging; `window.fetch` is not reassigned anywhere in `src`.


### PERF-02: PWA runtime cache stores Supabase API responses (PHI) for 24 h, keyed only by URL; survives logout; storage rule is shadowed
> **Consolidation note:** this finding duplicates **SECF-04** and is kept for its evidence. The register counts it once, under SECF-04.

- Severity: P1
- Category: Security
- Status: LIKELY
- Module: PWA / Workbox config
- Location: vite.config.ts:40-67; src/main.tsx:132-147
- Evidence:
  ```
  44  urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
  45  handler: 'NetworkFirst',
  47    cacheName: 'supabase-api',
  50    maxAgeSeconds: 60 * 60 * 24 // 24 hours
  55  urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,   // never matched: first route wins
  ```
- Actual behavior / Expected behavior: Every successful GET to PostgREST/Auth (`/rest/v1/patients…`, `/auth/v1/user`) is written to Cache Storage `supabase-api` for 24 h. Workbox matches cached responses by URL; the `Authorization` header is not part of the key, so on network failure a different user on the same browser profile can be served the previous user's response. Logout clears session storage only, not Cache Storage. The `storage/` CacheFirst rule is unreachable because the first regex already matches storage URLs. Expected: no caching of authenticated API responses (or user-partitioned, encrypted, cleared on logout).
- Reproduction: Production build → log in as user A, open a patient list → DevTools → Application → Cache Storage → `supabase-api` shows JSON with PHI; log out, log in as B, go offline, reload the same route.
- Root cause: Generic PWA template applied to a PHI application.
- Impact: PHI at rest on shared hospital workstations beyond session lifetime; potential cross-user disclosure while offline/flaky network (HIPAA).
- Recommendation: Remove the `supabase-api` runtime route (use `NetworkOnly`), keep storage rule only for public assets if needed; on logout call `caches.delete('supabase-api')`; for real offline needs use the existing offline vitals store with explicit encryption.
- Effort: S
- Acceptance criteria: After a session, Cache Storage contains no `*.supabase.co/rest|auth` entries; logout deletes any app caches.


### PERF-03: React Query cache is never cleared on logout/user switch (5-min staleTime, hospital-scoped keys)
> **Consolidation note:** this finding duplicates **SECF-05** and is kept for its evidence. The register counts it once, under SECF-05.

- Severity: P2
- Category: Security
- Status: LIKELY
- Module: App shell / Auth
- Location: src/App.tsx:22-30; src/contexts/AuthContext.tsx:296-348
- Evidence:
  ```
  App.tsx:25    staleTime: 5 * 60 * 1000,
  AuthContext.tsx:329   await supabase.auth.signOut();
  $ grep -rn "queryClient.clear\|removeQueries\|resetQueries" src → (none)
  ```
- Actual behavior / Expected behavior: Logout resets context state but leaves all cached queries. Most keys are scoped by `hospital?.id` (166 live `useQuery` definitions; only 6 lack any scope token) but not by user/role, so a second user of the same hospital on the same tab (shared nursing stations, kiosk) is served the first user's cached results (fetched under the first user's RLS — e.g. admin-fetched invoices) until refetch. Auto-logout via `useSessionTimeout` follows the same path. Expected: cache cleared on `SIGNED_OUT` and on role switch.
- Reproduction: Log in as admin, open billing/patients; log out; log in as nurse of same hospital; navigate to a page sharing a key (e.g. `['patients', hospitalId, 1, 25]`) — data renders before network response.
- Root cause: QueryClient created in `App.tsx` with no auth coupling.
- Impact: Cross-user PHI/financial data exposure on shared devices; violates ADR-0002 billing boundary at the cache layer.
- Recommendation: In `AuthProvider` (inside `QueryClientProvider`) call `queryClient.clear()` on logout and on `onAuthStateChange('SIGNED_OUT')`, and `queryClient.removeQueries()` on `switchRole`; include `user.id` in keys of user-sensitive queries.
- Effort: S
- Acceptance criteria: Unit test: after `logout()` `queryClient.getQueryCache().getAll().length === 0`.


### PERF-04: AuthContext re-renders the whole tree and refetches profile/hospital/roles redundantly
- Severity: P3
- Category: Performance
- Status: LIKELY
- Module: Auth
- Location: src/contexts/AuthContext.tsx:353-418,451-485,930
- Evidence:
  ```
  461            fetchUserData(currentSession.user.id);   // onAuthStateChange (INITIAL_SESSION, TOKEN_REFRESHED, …)
  480          fetchUserData(currentSession.user.id);     // getSession() on mount — second fetch
  930      value={{
  ```
- Actual behavior / Expected behavior: On startup `fetchUserData` (3 sequential queries: profiles `select('*')`, hospitals `select('*')`, user_roles) runs twice; it reruns on every `TOKEN_REFRESHED`/`USER_UPDATED`, replacing `profile`/`hospital` objects and `user` identity, which re-triggers effects keyed on objects (e.g. `NotificationsSystem` channel effect deps `[user, queryClient]` resubscribes). The provider `value` is a fresh object each render (not memoised), so every `useAuth()` consumer re-renders on any AuthProvider state change. No stale-response guard if users switch mid-fetch. Expected: one fetch per user id, memoised value, profile data in React Query.
- Reproduction: React DevTools Profiler on token refresh; network tab shows duplicate `profiles?user_id=eq.` requests on load.
- Root cause: Imperative state management in a 968-line context.
- Impact: Extra startup latency (6 requests instead of 3), avoidable global re-renders, realtime channel churn.
- Recommendation: Move profile/hospital/roles into `useQuery(['auth-profile', userId])`; drive fetch only from `onAuthStateChange` events `INITIAL_SESSION`/`SIGNED_IN`; `useMemo` the provider value; split session vs profile contexts.
- Effort: M
- Acceptance criteria: Cold load issues each of the 3 profile queries once; profiler shows no full-tree render on token refresh.


### PERF-05: Consultation autosave race can overwrite in-progress clinical documentation
> **Consolidation note:** this finding duplicates **CLIN-06** and is kept for its evidence. The register counts it once, under CLIN-06.

- Severity: P1
- Category: Functional
- Status: LIKELY
- Module: Consultations
- Location: src/pages/consultations/ConsultationWorkflowPage.tsx:176-203,314-345; src/hooks/useConsultations.ts:559-562
- Evidence:
  ```
  176  useEffect(() => {
  177    if (consultation) {
  179      setFormData({ chief_complaint: consultation.chief_complaint || '', …   // deps: [consultation]
  337        setIsDirty(false);                                                  // after autosave resolves
  useConsultations.ts:562  queryClient.invalidateQueries({ queryKey: ['consultation', data.id] });
  ```
- Actual behavior / Expected behavior: Autosave sends snapshot S1 after 1.5 s; the mutation invalidates `['consultation', id]`, React Query refetches and returns S1 as a new object; the `[consultation]` effect then replaces the whole `formData` (and `activeStep`) with S1, discarding anything typed after S1 was captured (S2). Additionally `setIsDirty(false)` after the save marks S2 as saved, so it is not re-autosaved. Realtime/30 s polling on consultations (useConsultations.ts:702-729,759) can trigger the same overwrite. Expected: server data seeds the form once (or merges only when not dirty); in-flight edits are preserved.
- Reproduction: Type continuously in "History of present illness" for > 3 s on a throttled network (Fast 3G); observe characters reverting after the "Saved" indicator.
- Root cause: State duplicated between React Query and local state with an unconditional sync effect.
- Impact: Silent loss of clinical notes (patient safety + medico-legal record integrity).
- Recommendation: Seed form only when `consultation.id` changes (`useEffect(…, [consultation?.id])`) or when `!isDirty`; use `setQueryData` from the mutation result instead of invalidating the detail key; track a save version/sequence so only the latest save clears dirty; consider `react-hook-form` `reset` with `keepDirtyValues`.
- Effort: S
- Acceptance criteria: Component test with fake timers: type, autosave resolves, type more, refetch resolves → latest text remains and is saved on next debounce.


### PERF-06: Dispensing performs non-atomic client-side read-modify-write of stock in a loop; errors ignored
> **Consolidation note:** this finding duplicates **CLIN-04** and is kept for its evidence. The register counts it once, under CLIN-04.

- Severity: P1
- Category: Database
- Status: LIKELY
- Module: Pharmacy dispensing
- Location: src/lib/hooks/pharmacy/usePrescriptions.ts:484-489,531-539,561-577
- Evidence:
  ```
  485  const { data: medRows } = await supabase.from('medications').select('*')
  487    .eq('hospital_id', hospital.id).eq('is_active', true);          // whole formulary, every dispense
  531  // Apply atomic stock deductions (A1)
  532  for (const deduction of stockDeductions) {
  533    await supabase.from('medications').update({ current_stock: deduction.newStock, … }).eq('id', deduction.id);
  ```
- Actual behavior / Expected behavior: Each dispense downloads the hospital's full active formulary (`select('*')`, capped at 1,000 rows by PostgREST), computes `newStock = current_stock − qty` in the browser and writes absolute values one row at a time, ignoring `{error}`; then updates the prescription, items (another per-item loop), queue, and finally the workflow engine (ARCH-04). Two pharmacists dispensing the same drug concurrently lose an update; a failure after stock writes leaves stock deducted without a dispensed prescription. The comment says "atomic"; it is not. Expected: a single `dispense_prescription(...)` RPC doing `UPDATE medications SET current_stock = current_stock - $qty WHERE id=$id AND current_stock >= $qty` inside one transaction with the status change and audit row.
- Reproduction: Two browser sessions dispense the same medication simultaneously; final `current_stock` reflects only one deduction.
- Root cause: Business transaction implemented in a React mutation.
- Impact: Inventory drift (controlled substances included — witness data is recorded in the same flow), partial state on failures, 1 k-row download per dispense.
- Recommendation: Move into an RPC owned by the `prescription-dispensing` module adapter; client calls one function; return the updated rows.
- Effort: M
- Acceptance criteria: Concurrency test (two parallel RPC calls) yields correct stock; injected failure leaves no partial writes.


### PERF-07: 201 unbounded live selects; dashboards aggregate client-side and are silently truncated at PostgREST's 1,000-row cap
- Severity: P2
- Category: Performance
- Status: CONFIRMED (pattern) / LIKELY (wrong numbers at scale)
- Module: Dashboards / stats hooks
- Location: src/hooks/usePharmacyLabStats.ts:25-50,126-170; src/hooks/useBilling.ts:202-205; src/hooks/useActivityLogsPaginated.ts:205-226; src/hooks/useStaffPerformance.ts:80-108; src/hooks/useAI.ts:323; src/hooks/useForensicQueries.ts:189; src/hooks/useICD10Codes.ts:10; src/hooks/useSecureMessaging.ts:53,292; src/components/workflow/RoleHandoffStatusPanel.tsx:44-65
- Evidence:
  ```
  usePharmacyLabStats.ts:25  const { data: pending } = await supabase.from('prescriptions').select('id')
                               .eq('hospital_id', hospital.id).is('dispensed_at', null);   … pending: pending?.length || 0
  useBilling.ts:202          .from('invoices').select('status, total, paid_amount').eq('hospital_id', hospital.id);   // all-time invoices
  useActivityLogsPaginated.ts:205  .from('activity_logs').select('action_type').eq('hospital_id', hospital.id)   // "distinct" via full scan
  {"liveSelectStatements":370,"unboundedLive":201,"unboundedLiveStar":73}
  ```
- Actual behavior / Expected behavior: Counts and sums are computed by downloading rows: `usePharmacyLabStats` runs 13 sequential awaits across its two hooks (`select('id')` then `.length`) and ignores `error`; `invoice-stats` sums all-time invoices in JS; filter-option lists scan `activity_logs`; `useStaffPerformance` pulls 4× `select('*')` for a month; `useAI` pulls the hospital's entire `activity_logs` ascending. `supabase/config.toml` sets no `[api] max_rows`, so the default 1,000 applies → for an 18 k-patient hospital these numbers silently plateau at 1,000 and filter lists miss values. Most-hit tables among unbounded live selects: lab_orders 17, appointments 15, prescriptions 12, user_roles 11, profiles 11, invoices 9, patient_queue 7. Expected: `count: 'exact', head: true`, SQL aggregates/RPCs or materialised views, explicit `.range()`.
- Reproduction: static analysis (`scratchpad/unbounded.mjs`); runtime: seed > 1,000 pending prescriptions and observe the KPI.
- Root cause: No query conventions; client-side aggregation.
- Impact: Incorrect operational KPIs (pending meds, outstanding revenue), heavy payloads on dashboards, DB load.
- Recommendation: Replace count-by-length with `select('id', { count: 'exact', head: true })` (51 call sites already do this); add `get_pharmacy_stats(hospital_id)` / `get_invoice_stats` RPCs; parallelise remaining independent queries with `Promise.all`; add an ESLint rule (custom or grep CI check) flagging `.select(` without `limit/range/single/head` in hooks.
- Effort: M
- Acceptance criteria: Stats hooks issue ≤ 2 requests each; KPIs correct with 5,000 seeded rows.


### PERF-08: N+1 request patterns — per-row patient fetch + per-field PHI decrypt edge calls; sequential mutation loops
- Severity: P2
- Category: Performance
- Status: LIKELY
- Module: Laboratory, Patients, Consultations, Workflow
- Location: src/pages/laboratory/LaboratoryPage.tsx:130-133,741; src/lib/hooks/patients/usePatients.ts:79-100,115-140; src/hooks/useDataProtection.ts:114-127; src/utils/dataProtection.ts:37; src/pages/consultations/ConsultationWorkflowPage.tsx:743-760; src/hooks/useWorkflowOrchestrator.ts:135-155; src/lib/hooks/pharmacy/usePrescriptions.ts:561-572
- Evidence:
  ```
  LaboratoryPage.tsx:130  function PatientName({ patientId }: { patientId: string }) {
  LaboratoryPage.tsx:131    const { data: patient } = usePatient(patientId);      // rendered per table row (line 741)
  usePatients.ts:79       const decryptedPatients = await Promise.all((data || []).map(async (patient: any) => {
  useDataProtection.ts:122        decryptedData[field] = await decryptField(encrypted);   // → supabase.functions.invoke('phi-crypto') per field
  ```
- Actual behavior / Expected behavior: The lab list query already joins `patient:patients(id, first_name, last_name, mrn)` (line 210), yet each row renders `<PatientName>` which issues its own `patients select('*')` and, when `encryption_metadata` is present, one sequential `phi-crypto` edge invocation per encrypted field. `usePatients` decrypts each of 25 rows field-by-field (up to ~6 edge calls per patient → ~150 calls per page). Consultation completion creates lab orders one awaited mutation at a time; workflow orchestrator updates `workflow_rules.last_triggered` per rule; dispensing updates items per row. Expected: use joined data; batch decrypt (one call with many fields/rows); bulk inserts/updates.
- Reproduction: Network tab on `/laboratory` with 25 orders → count `patients?id=eq.` and `functions/v1/phi-crypto` requests.
- Root cause: Component-level data fetching; decrypt API designed per field.
- Impact: Page-load latency proportional to rows × fields × edge cold-start; edge-function quota/cost; 10 s `safeFetch` timeouts under load.
- Recommendation: Remove `PatientName` and use `order.patient`; add `phi-crypto` batch endpoint `{ items: [{resourceType, resourceId, fields}] }` and decrypt only fields displayed; `insert([...])` lab orders in one call; update rules with `.in('id', ids)`.
- Effort: M
- Acceptance criteria: `/laboratory` with 25 rows issues ≤ 3 Supabase requests + ≤ 1 `phi-crypto` call.


### PERF-09: App shell and realtime subscriptions are torn down and rebuilt on every navigation; shared static channel topics
- Severity: P2
- Category: Performance
- Status: LIKELY
- Module: Layout / Realtime
- Location: src/components/layout/DashboardLayout.tsx:74-96,321; src/App.tsx:111-114; src/routes/routeDefinitions.tsx:6,109,126; src/hooks/useQueue.ts:268-294; src/hooks/useConsultations.ts:702-729; node_modules/@supabase/realtime-js/dist/main/RealtimeClient.js:275-286
- Evidence:
  ```
  App.tsx:113         return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
  53 of 79 page files render <DashboardLayout> themselves (no layout route / <Outlet/>)
  useQueue.ts:276     .channel('queue-changes')      … return () => { channel.unsubscribe(); };
  RealtimeClient.js:277  const exists = this.getChannels().find((c) => c.topic === realtimeTopic);  // same topic → same channel object
  ```
- Actual behavior / Expected behavior: Because each page renders its own `DashboardLayout` and the error boundary is keyed by pathname, every route change unmounts/remounts the sidebar, `NotificationsSystem` (realtime channel), `useCriticalLabAlerts` (realtime + fetch), `ConnectionStatusBanner`, global search — resubscribing websockets and refetching on every click. Static, unscoped topic names (`'queue-changes'`, `'consultations-changes'`, `'prescriptions-changes'`, `'billing-realtime'`, `'medications-changes'` …) are shared by concurrent hook instances (realtime-js 2.89 returns the existing channel for a topic): `useQueueRealtime` is mounted by both `PatientQueue` and `QueueManagementPage`; when one unmounts it unsubscribes the shared channel and the other silently stops receiving updates; `.on()` after `subscribe()` on the reused channel adds bindings the server never joins. Expected: persistent layout route; unique topic per subscriber or a single subscription service.
- Reproduction: Navigate between two dashboard pages with DevTools → WS frames: `phx_leave`/`phx_join` on each navigation.
- Root cause: Layout composed inside pages; ad-hoc realtime usage.
- Impact: Missed realtime updates (queue, critical labs) in specific mount orders; extra load on Realtime; janky navigation.
- Recommendation: Introduce a `<Route element={<ProtectedShell/>}>` layout with `<Outlet/>` and remove `DashboardLayout` from pages; key the error boundary on route id inside the outlet only; centralise realtime in a `RealtimeProvider` (one channel per table per hospital, fan-out to React Query invalidation); use `supabase.removeChannel` and topic names including hospital id + a per-instance suffix where needed.
- Effort: M
- Acceptance criteria: Navigating between dashboard pages produces no `phx_leave/phx_join`; both queue views receive updates after either unmounts.


### PERF-10: Background polling for every user — root-mounted admin metrics hook, no-op 5 s intervals, polling on top of realtime
- Severity: P2
- Category: Performance
- Status: CONFIRMED
- Module: App shell / hooks
- Location: src/App.tsx:117; src/hooks/usePerformanceMonitoring.ts:36-93; src/hooks/useAmendmentAlerts.ts:135-150; src/hooks/useConsultations.ts:759; src/lib/hooks/observability/useHealthCheck.tsx:175
- Evidence:
  ```
  App.tsx:117                     usePerformanceMonitoring();          // every route, every role, result unused
  usePerformanceMonitoring.ts:44  .from('performance_metrics').select('*') … .limit(100);   refetchInterval: 30000
  usePerformanceMonitoring.ts:82  // Mock system health check …       refetchInterval: 60000
  useAmendmentAlerts.ts:149       const interval = setInterval(checkNewAmendments, 5000);   // body is a placeholder
  ```
- Actual behavior / Expected behavior: Every authenticated client (including patients) polls `performance_metrics` (100 rows) every 30 s and runs a mocked 60 s "system health" query, plus an `error_tracking` query — the data is discarded by `AppContent`. 28 live `refetchInterval` sites (2×5 s, 4×10 s, 2×15 s, 11×30 s…), several on tables that already have realtime invalidation (consultations: realtime + 30 s). `useAmendmentAlerts` (live on LaboratoryPage) ticks an empty function every 5 s. React Query pauses `refetchInterval` in background tabs by default, but the hand-rolled `setInterval` pollers (e.g. `useHealthCheck` 30 s, `useAmendmentAlerts` 5 s) do not. Expected: admin telemetry only on admin pages; realtime OR polling, not both.
- Reproduction: Log in as patient, idle on portal, observe `performance_metrics` requests every 30 s.
- Root cause: Monitoring hook placed at root for convenience; placeholder code shipped.
- Impact: Constant DB/API load proportional to logged-in users (~3 req/min/user from this hook alone), battery/network cost on mobile/tablets.
- Recommendation: Remove `usePerformanceMonitoring()` from `AppContent` (use it in SystemHealthDashboard only); delete `useAmendmentAlerts` stub interval; drop `refetchInterval` where a realtime subscription exists; standardise intervals (≥ 30 s except queue displays).
- Effort: S
- Acceptance criteria: Idle patient session issues no periodic requests except realtime heartbeats.


### PERF-11: Bundle/chunk strategy risks (needs the lead's build stats to confirm)
- Severity: P2
- Category: Performance
- Status: SUSPECTED
- Module: Build config
- Location: vite.config.ts:41,84-143; vite.config.production.ts:22-52; src/lib/ai/providers/OpenAIProvider.ts:2,21; src/lib/ai/providers/ClaudeProvider.ts:2; src/lib/ai/orchestrator.ts:542-553
- Evidence:
  ```
  vite.config.ts:111   tanstack: ['@tanstack/react-query', '@tanstack/react-query-devtools'],
  vite.config.ts:123   icons: ['lucide-react'],
  vite.config.ts:138   drop_console: true,
  vite.config.ts:41    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  OpenAIProvider.ts:21 dangerouslyAllowBrowser: false, // Server-side only
  ```
- Actual behavior / Expected behavior: Good: 69 lazy routes; the static entry closure is 157 files and contains only `@sentry/react`, `qrcode` (via the auth barrel, ARCH-11), `date-fns`, `web-vitals` among heavy libs; recharts/jspdf/framer-motion/AI SDKs are not in the entry graph. Risks: (1) object-form `manualChunks` for `lucide-react`, Radix, `date-fns`, forms puts *every* icon/date fn/Radix part used anywhere into one vendor chunk that the entry imports → defeats route splitting for those libs; (2) PWA `globPatterns` precaches every chunk (incl. `openai`/`@anthropic-ai/sdk` chunks behind `/ai-demo` and AI engine pages) on first visit; (3) `openai`/`@anthropic-ai/sdk` are bundled for the browser where `dangerouslyAllowBrowser: false` makes construction throw, and `VITE_OPENAI_API_KEY`/`VITE_ANTHROPIC_API_KEY` would be inlined into the bundle if ever set; (4) `drop_console: true` strips `console.error` too (the logger's only prod sink besides a non-existent endpoint, PERF-12); (5) `sourcemap: false` with no upload → unsymbolicated Sentry traces; (6) `vite.config.production.ts` (`build:prod`/`analyze`) drifts: no PWA plugin, `target: 'es2015'`, different chunks — so the analyzed bundle is not the shipped one; (7) `chunkSizeWarningLimit: 1000` hides large chunks.
- Reproduction: `npm run build` with `rollup-plugin-visualizer` added to `vite.config.ts` (lead to run); compare entry + `icons`/`ui`/`dates` chunk sizes, PWA precache manifest size.
- Root cause: Template config not tuned; two diverging configs.
- Impact: Slower first load on hospital networks/tablets; wasted precache bandwidth; poorer error diagnostics.
- Recommendation: Replace object `manualChunks` with a function that only splits `react`/`react-dom`/`@supabase` (let Rollup split the rest per route); exclude AI/admin chunks from precache (`globIgnores`) or precache only shell; move AI SDK usage to the `ai-clinical-support` edge function and drop the deps; keep `console.error/warn` (`pure_funcs: ['console.log','console.debug','console.info']` only); emit hidden sourcemaps + Sentry upload; delete `vite.config.production.ts` and add visualizer behind an env flag to the main config; lower `chunkSizeWarningLimit` to 500.
- Effort: S
- Acceptance criteria: Entry JS (gzip) and precache size recorded in CI with a budget (e.g. entry ≤ 250 kB gzip); no `openai`/`@anthropic-ai` modules in `dist`.


### PERF-12: Overlapping observability stacks — Sentry initialised up to 3× with divergent configs; prod logs go to a non-existent `/api/logs`; telemetry is a stub
- Severity: P2
- Category: Architecture
- Status: CONFIRMED
- Module: src/bootstrap, src/lib/monitoring, src/utils/{logger,errorTracking,sentry-integration,telemetry,correlationId}
- Location: src/main.tsx:6,73,101-121; src/lib/monitoring/sentry.ts:3-5; src/App.tsx:44-83; src/bootstrap/error-tracking.ts:15-22; src/utils/errorTracking.ts:61,81; src/utils/sentry-integration.ts:29,44; src/utils/logger.ts:318-362; src/utils/correlationId.ts:310; src/utils/telemetry.ts:1-12; nginx.conf:36-41
- Evidence:
  ```
  main.tsx:73                initSentry();                       // Sentry.init #1 (lib/monitoring/sentry.ts:5)
  bootstrap/error-tracking   initErrorTracking({...});           // Sentry.init #2 (utils/errorTracking.ts:81)
                             initializeSentry(config.dsn, …);     // Sentry.init #3 (utils/sentry-integration.ts:44)
  logger.ts:355              await fetch('/api/logs', { method: 'POST', … }).catch(() => {});
  telemetry.ts:9-10          * Note: Full OpenTelemetry distributed tracing will be implemented in a future phase
  ```
- Actual behavior / Expected behavior: Wired at startup: `main.tsx` → `initSentry` + `initWebVitals`; `App` effect → `bootstrap()` → `utils/logger.createLogger`, `utils/telemetry.initializeTelemetry` (in-memory span map, `@ts-nocheck`), `initErrorTracking` + `initializeSentry` (two more `Sentry.init` with different sample rates and `beforeSend` scrubbers; last one wins, so the PHI scrubbing in effect depends on call order), `services/metrics.initializeMetrics`, `registerFetchInterceptor` (PERF-01). Production logger batches to `/api/logs`, which nginx serves via SPA fallback (`try_files … /index.html`) — logs are dropped; `correlationId.ts:310` does the same. `drop_console` removes console output. 698 direct `console.*` calls vs 6 importers of the logger. `window.Sentry` checks in `main.tsx` handlers are always false with the npm SDK. Bootstrap runs after the first render (errors in first render are only caught by `RootErrorBoundary`'s `console.error`, which is stripped). OpenTelemetry deps are unused. `lib/monitoring/analytics.ts`, `utils/analytics.ts`, `services/metrics.ts`, `lib/hooks/observability/*` add further overlapping APIs. Expected: one init path, one logger with a real sink, one error-tracking facade.
- Reproduction: static analysis; runtime: set `VITE_SENTRY_DSN`, observe three `Sentry.init` debug logs.
- Root cause: Successive observability "phases" layered without removal.
- Impact: Unreliable PHI scrubbing in error events, lost production logs, misleading "distributed tracing" claims in docs, extra startup work.
- Recommendation: Single `src/bootstrap/observability.ts` called synchronously before `createRoot`: one `Sentry.init` (the strictest `beforeSend`), logger sink = Sentry breadcrumbs or a Supabase `client_logs` edge function, correlation ID via Supabase client headers; delete `utils/errorTracking.ts`, `utils/sentry-integration.ts` duplicates, `utils/logging.ts`, the telemetry stub and OTEL deps (or implement OTEL properly with an allowed collector origin).
- Effort: M
- Acceptance criteria: Exactly one `Sentry.init` call in `src`; a `logger.error` in prod is visible in the chosen sink; no `fetch('/api/logs')`.


### PERF-13: Async hygiene — no request cancellation, 71 live exhaustive-deps warnings, no list virtualisation
- Severity: P3
- Category: Performance
- Status: CONFIRMED (counts) / SUSPECTED (user-visible impact)
- Module: Hooks / components
- Location: src/pages/consultations/ConsultationWorkflowPage.tsx:206-229; src/components/nurse/PatientPrepStation.tsx:68; src/components/billing/EnhancedPaymentModal.tsx:77; src/components/consultations/AIConsultationAssistant.tsx:39; package.json:160
- Evidence:
  ```
  AbortSignal/`signal` usages in data fetching: 3 ; queryFns accepting { signal }: 0
  eslint: react-hooks/exhaustive-deps 175 warnings (71 in live non-test files)
  ConsultationWorkflowPage.tsx:229  }, [canEditConsultation, formData, id]);   // handler closes over activeStep/handleNextStep
  @tanstack/react-virtual: installed, 0 imports
  ```
- Actual behavior / Expected behavior: Query functions ignore React Query's `signal`, so superseded searches/filters keep running and can resolve out of order in components that copy results into state (24 files combine `useEffect` with direct Supabase queries; only 1 file in `src` — AuthContext — uses an `isMounted/cancelled` guard). The consultation keyboard shortcut effect omits `activeStep`/handlers → Ctrl+Enter can act on a stale step when only the step changed. Lists are paginated in only 4 pages (`usePaginatedQuery`), 6 `.range()` calls total, and no virtualisation; long lists (e.g. 100-row metrics, message threads, unbounded queues) render fully. Timers/listeners/channels: heuristic scan found no live hook with unbalanced `setInterval`/`addEventListener`/`channel` cleanup except module-level listeners in `main.tsx`, `errorTracking.ts`, `auditLogQueue.ts` (acceptable singletons) and the critical-lab broadcast adapter (`SupabaseLabEscalationAdapter.ts:165`, channel never removed; reused by topic, low impact).
- Reproduction: static analysis (eslint JSON, grep).
- Root cause: Manual fetching patterns pre-dating React Query adoption; lint warnings not enforced.
- Impact: Occasional stale UI / wrong-result flashes, wasted requests, poor scroll performance on large lists on low-end clinical tablets.
- Recommendation: Pass `signal` through (`.abortSignal(signal)` in supabase-js); convert the 24 `useEffect` fetchers to `useQuery`; make `exhaustive-deps` an error for new code (lint-staged); use `@tanstack/react-virtual` for queue/log/inventory tables > 100 rows or remove the dependency.
- Effort: M
- Acceptance criteria: exhaustive-deps warnings in live code = 0; search inputs cancel prior requests (network tab shows `(canceled)`).

---
