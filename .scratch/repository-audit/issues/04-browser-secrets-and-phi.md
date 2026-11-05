# 04: S0-09 Remove secrets and PHI persistence from the browser

Status: ready-for-human
Type: task
Roadmap: S0-09 (docs/repository-audit/IMPLEMENTATION_ROADMAP.md)
Issues: SECF-03, SECF-04, SECF-05, SECF-06, FUNC-33

## Done (2026-11-05; branch `ccr-2602d823-jeymkf`, not merged)

- [x] SECF-03: browser OpenAI/Anthropic/Twilio/Lovable/API-key code deleted. The 7 generative AI engine screens now show "AI-assisted analysis is currently unavailable" (no equivalent edge function exists). `scripts/security/check-client-secrets.mjs` (source scan + `--bundle` canary scan) runs in CI. A canary build leaked keys before; none after.
- [x] SECF-04: no Workbox caching of Supabase (NetworkOnly routes); legacy `supabase-*` caches deleted on app start and SW controller change.
- [x] SECF-05: `purgeClientState()` (React Query, localStorage except `caresync-theme`/`sidebar-collapsed`, all sessionStorage, app IndexedDB, non-precache Cache Storage, nurse offline store) on logout, idle logoff and SIGNED_OUT; `signOut({scope:'local'})` fallback. Playwright `tests/e2e/logout-purge.spec.ts` passes locally with mock auth.
- [x] SECF-06: `src/modules/offline-store`: AES-GCM-256, non-extractable per-user key, IndexedDB `caresync-offline`, migrates and deletes legacy plaintext keys, wiped on logout. Plaintext JSON export/import removed (two places).
- [x] FUNC-33: invoice adjustment modal and hardcoded PIN removed; action disabled until S1-01.
- [x] Verification: full vitest failing set identical to baseline (48), tsc no new errors, boundaries clean, canary bundle scan clean.

## Remaining

- [ ] Rotate every OpenAI/Anthropic/Twilio/Lovable/`VITE_API_KEY` value ever set in the Lovable or hosting build env, then delete those vars. Any build made with them set shipped them publicly.
- [ ] Live checks: upgrade from an old SW build leaves no `supabase-*` cache; offline logout + reload shows the login page.
- [ ] Behaviour changes to communicate: AI engine screens unavailable; invoice waivers/refunds disabled; unsynced nurse offline writes are lost on logout; the SMS preference checkbox in patient billing never sent anything (still doesn't).
- [ ] Follow-ups: offline replay is still a stub (never wrote to Supabase; table names inconsistent `vitals`/`vital_signs`); `useSampleTracking` keeps lab-sample PHI in localStorage (`lab-samples-fallback`) until logout; unused hooks `useMobileWorkflow`, `useStorageOptimization` write PHI to localStorage if ever used (delete); hooks using `VITE_SUPABASE_ANON_KEY` send `Bearer undefined` when only the publishable key is set; `openai` and `@anthropic-ai/sdk` packages are now unused.
