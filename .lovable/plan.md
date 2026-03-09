# MediCare Hospital Management System — Enhancement Plan

> **Created:** 2026-03-09  
> **Status:** Active  
> **Build Status:** ✅ Compiling (45 files use @ts-nocheck suppressions to be resolved incrementally)

---

## Phase 0 — Technical Debt Cleanup (Priority: Critical)

### 0.1 Remove @ts-nocheck Suppressions
- 45 files currently suppressed; fix underlying type issues in batches:
  - **Batch A** — Hooks (useAI, useCrossRoleCommunication, useOptimisticMutation, etc.)
  - **Batch B** — Pages (BillingPage, messaging pages, ConsultationWorkflowPage, etc.)
  - **Batch C** — Utils/Services (abacManager, reportingEngine, aiTriageService, etc.)
  - **Batch D** — Test files (admin-rbac-verify, setup, integration tests)

### 0.2 Fix Supabase Join Types
- ~40 localized type mismatches on Supabase `.select()` join results
- Create typed query helpers with explicit return types per table join pattern

### 0.3 Remove Dead Code
- Delete unused AI provider files (ClaudeProvider, OpenAIProvider) — use Lovable AI gateway instead
- Clean up orphaned service files (reportingEngine imports from non-existent `@/lib/supabase`)

---

## Phase 1 — UI/UX Redesign (Priority: High)

### 1.1 Landing Page Overhaul
- **Current:** Basic hospital landing with sign-up/login buttons
- **Target:** Bold, editorial healthcare design with:
  - Animated hero section (framer-motion) using `--gradient-hero`
  - Feature showcase with role-based previews (Doctor, Nurse, Pharmacy, etc.)
  - Trust indicators (HIPAA badge, encryption icons, uptime stats)
  - Testimonials / hospital count counter

### 1.2 Dashboard Redesign (Per Role)
- **Doctor Dashboard:** Patient timeline view, AI-assisted clinical cards, quick-consult launcher
- **Nurse Dashboard:** Task priority board (Kanban), vitals alert stream, prep checklist widget
- **Receptionist Dashboard:** Queue management hero view, appointment heatmap, walk-in express flow
- **Admin Dashboard:** Financial overview charts (recharts), staff utilization gauges, compliance scorecard
- **Patient Portal:** Health timeline, upcoming appointments card, medication tracker, secure messaging

### 1.3 Design System Refinements
- Expand shadcn component variants (e.g., `variant="clinical"`, `variant="status"`)
- Add micro-interaction library (hover states, page transitions, loading skeletons)
- Dark mode polish — ensure all 60+ role/status colors have dark counterparts
- Mobile-first responsive overhaul for all dashboard layouts

### 1.4 Navigation & Information Architecture
- Collapsible sidebar with role-based section grouping
- Global command palette (⌘K) with smart search across patients, appointments, records
- Breadcrumb navigation for deep pages
- Notification bell with categorized dropdown (urgent/info/action-required)

---

## Phase 2 — Feature Additions (Priority: High)

### 2.1 Authentication & Security
- [ ] **Two-Factor Authentication (2FA):** TOTP-based with QR code setup, backup codes, stored in Supabase Vault
- [ ] **Email Verification:** Enforce email confirmation before login
- [ ] **Session Timeout:** Auto-logout after configurable inactivity period
- [ ] **Password Expiry Policy:** Force password change every 90 days with policy enforcement
- [ ] **Login Audit Trail:** Log all auth events with IP, device, timestamp

### 2.2 Patient Management
- [ ] **Patient Portal Self-Registration:** Patients sign up, link to hospital, request appointments
- [ ] **Health Timeline:** Visual chronological view of all encounters, labs, prescriptions
- [ ] **Document Upload:** Patients upload insurance cards, referrals, prior records via storage bucket
- [ ] **Appointment Self-Scheduling:** Calendar view with doctor availability, time slot picker

### 2.3 Clinical Workflow
- [ ] **AI Clinical Assistant:** Powered by Lovable AI (Gemini/GPT models) — differential diagnosis, drug interaction checks, clinical note summarization
- [ ] **Consultation Templates:** Pre-built templates by specialty (Cardiology, Pediatrics, etc.)
- [ ] **E-Prescribing:** Full prescription workflow with pharmacy notification and dispensing tracking
- [ ] **Lab Order Workflow:** Order → Collection → Processing → Results with realtime status updates

### 2.4 Communication
- [ ] **Realtime Secure Messaging:** Supabase Realtime channels for staff-to-staff and staff-to-patient
- [ ] **Notification Center:** In-app + email notifications for appointments, lab results, prescriptions
- [ ] **Shift Handoff Notes:** Structured handoff form with acknowledgment tracking

### 2.5 Billing & Insurance
- [ ] **Invoice Generation:** Auto-generate from consultation with CPT/ICD-10 codes
- [ ] **Payment Processing:** Record payments, partial payments, payment plans
- [ ] **Insurance Claims:** Submit, track, and manage claim lifecycle
- [ ] **Financial Reports:** Revenue dashboards, aging reports, collection rates

### 2.6 Reporting & Analytics
- [ ] **Operational Reports:** Patient volume, wait times, appointment utilization
- [ ] **Clinical Reports:** Diagnosis distribution, treatment outcomes, readmission rates
- [ ] **Export:** PDF and CSV export for all report types
- [ ] **Scheduled Reports:** Auto-generate and email weekly/monthly summaries

### 2.7 Telemedicine
- [ ] **Video Consultation:** WebRTC-based video calls with waiting room
- [ ] **Screen Sharing:** Share lab results, imaging during consultation
- [ ] **Telemedicine Consent:** Digital consent collection before session start

---

## Phase 3 — Performance Optimization (Priority: Medium)

### 3.1 Bundle Size Reduction
- Audit current bundle with `vite-bundle-visualizer`
- Aggressive code splitting — each role dashboard as separate lazy chunk
- Tree-shake unused shadcn components and utility functions
- Remove unused dependencies (@anthropic-ai/sdk, openai — use Lovable AI gateway)

### 3.2 Data Loading
- Implement pagination for all list views (patients, appointments, lab orders) — respect Supabase 1000-row limit
- Add `useDebouncedValue` to all search inputs
- Prefetch adjacent routes on hover/focus
- React Query stale time optimization per data type (static vs realtime)

### 3.3 Caching Strategy
- Service Worker for offline-capable static assets (vite-plugin-pwa)
- IndexedDB for offline patient queue and form drafts
- Supabase Realtime for live data instead of polling

### 3.4 Rendering Performance
- Virtualized lists for large datasets (patients, medications, lab results)
- `React.memo` and `useMemo` audit on heavy components
- Image optimization (lazy loading, WebP, proper sizing)

---

## Phase 4 — Infrastructure & DevOps (Priority: Medium)

### 4.1 Testing
- Unit tests for all hooks (vitest)
- Integration tests for critical flows (signup → dashboard → consultation)
- E2E smoke tests for each role's primary workflow

### 4.2 Monitoring
- Error tracking with Sentry (already partially configured)
- Performance monitoring (Core Web Vitals)
- Database query performance monitoring

### 4.3 Security Hardening
- RLS policy audit for all 30+ tables
- Input sanitization audit
- CSRF protection verification
- Rate limiting on auth endpoints (edge function)

---

## Implementation Priority Order

| Order | Item | Effort | Impact |
|-------|------|--------|--------|
| 1 | Phase 0.1-0.3 — Tech debt cleanup | 2-3 sessions | Unblocks everything |
| 2 | Phase 1.1 — Landing page redesign | 1 session | First impression |
| 3 | Phase 2.1 — Auth hardening (2FA, email verify) | 2 sessions | Security critical |
| 4 | Phase 1.2 — Dashboard redesign (start with Admin) | 2-3 sessions | Daily UX |
| 5 | Phase 2.3 — AI Clinical Assistant | 1-2 sessions | Key differentiator |
| 6 | Phase 3.1-3.2 — Bundle + data loading | 1 session | Performance |
| 7 | Phase 2.2 — Patient portal features | 2 sessions | Patient experience |
| 8 | Phase 2.4 — Realtime messaging | 1-2 sessions | Communication |
| 9 | Phase 2.5 — Billing workflow | 2 sessions | Revenue |
| 10 | Phase 1.3-1.4 — Design system + navigation | 1-2 sessions | Polish |

---

## Notes
- All AI features should use **Lovable AI gateway** (Gemini/GPT models) — no external API keys needed
- All new tables need **RLS policies** before deployment
- Realtime features need `ALTER PUBLICATION supabase_realtime ADD TABLE` for each table
- The `mobile-app/` directory contains an Expo/React Native scaffold — mobile enhancements are out of scope for this plan
