
# Enhancement Opportunities — CareSync HIMS

Based on a scan of the codebase, production readiness report, memory files, and current architecture, here are the enhancements I see — grouped by impact tier. This is **research/advisory** — pick which ones you want to act on.

---

## Tier 1 — Production-Blocking (close out before go-live)

From `docs/PRODUCTION_READINESS_REPORT.md`:
1. **Enable leaked-password protection** in Supabase Auth (P2 linter warning, 1-click fix)
2. **Review the 1 permissive `USING(true)` RLS policy** flagged by the linter
3. **Run 24hr staging soak** with the new `critical-path.spec.ts` Playwright suite
4. **Wire `scripts/validate-rls.ts` as a blocking CI gate** (currently only created, not enforced)

---

## Tier 2 — Code Quality & Type Safety

5. **Eliminate the 18 `@ts-nocheck` files** — incrementally type them, starting with `RoleProtectedRoute.tsx` and `orchestrator.ts` (security-critical paths)
6. **Re-enable TS strict mode** in isolated zones (`src/lib/**`, `src/utils/**`) per the original plan
7. **Replace `(supabase as any)` casts** in `useFeatureFlags.ts` and similar — use the `query-helper.ts` pattern consistently
8. **Split `App.tsx` initialization** — telemetry/Sentry/metrics setup is doing 5 things in one `useEffect`; extract to `src/bootstrap/`

---

## Tier 3 — Observability & Operations

9. **Add a real `/api/health` endpoint** that checks DB + Edge Function reachability (currently referenced but minimal)
10. **Surface AI Gateway usage/cost metrics** in `ComprehensiveSystemDashboard` — Lovable AI calls have rate limits worth monitoring
11. **Audit log viewer UI** for admins — `activity_logs` is being written but there's no in-app browsing surface
12. **Realtime connection status indicator** — show users when Supabase Realtime drops (clinical workflows depend on it)

---

## Tier 4 — Clinical Workflow Polish

13. **Workflow state machines** — formalize discharge, lab-result-notify, and prescription-approval as DB-backed workflows (templates exist in the workflow-creator skill)
14. **Optimistic locking on prescriptions** — prevent the concurrent-edit race already noted in the E2E plan
15. **Critical lab value alerts** — `FEATURES.md` mentions them but no edge function exists; auto-page the ordering doctor
16. **Consent gate for telemedicine** — required by HIPAA skill checklist, not yet enforced
17. **Drug interaction check** in prescription flow — `FEATURES.md` lists it, no implementation found

---

## Tier 5 — UX / Patient-Facing

18. **PWA offline mode** for nurses doing rounds (vitals capture without connectivity)
19. **Patient portal v2 rollout** — flag exists (`patient_portal_v2`) but components need finishing
20. **Mobile app parity** — `mobile-app/` exists but is a thin shell; align with web feature flags
21. **Accessibility audit** — ARIA labels, keyboard nav, screen-reader testing (per `project-knowledge` future enhancements)

---

## Tier 6 — Strategic / Longer Horizon

22. **FHIR interoperability** — `fhirInteroperability.ts` is a stub; build out for real exchange with external EHRs
23. **AI clinical decision support** rollout — flag `ai_clinical_tools` exists; ship the diagnosis suggestion + treatment optimization UIs
24. **Multi-hospital tenancy console** — for healthcare networks managing multiple `hospital_id`s
25. **Insurance claim automation** — billing exists, claim submission/adjudication tracking does not

---

## My Recommendation (sequenced)

```text
Sprint 1 (this week)  → Tier 1 (#1-4)  — unblock production
Sprint 2              → Tier 2 (#5-8)  — pay down type-safety debt
Sprint 3              → Tier 3 (#9-12) — observability before scale
Sprint 4+             → Tier 4-6 based on clinical priority
```

Tell me which tier (or specific items) you want to tackle and I'll write a focused implementation plan for it.
