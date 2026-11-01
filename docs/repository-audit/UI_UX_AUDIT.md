# UI/UX & Accessibility Audit

> CareSync HIMS repository audit, 2026-11-01. Commit `43ab8f7`. **The real interface was rendered.** The Vite dev server ran with a stub (unreachable) Supabase backend. Authenticated views used the DEV-only E2E mock-auth mode for all 7 roles. Pages were checked at 1440×900, 820×1180 (public pages) and 390×844 viewports with axe-core 4.11 (WCAG 2.0/2.1 A and AA), keyboard traversal, label/name checks, overflow checks and a dark-mode pass. 112 screenshots and the raw axe JSON were kept in the audit scratch area. They are not committed, because they come from a mock environment.
> Limits: no real data (every Supabase call fails, which doubles as a realistic "backend down" test), no screen-reader run, and authenticated pages were not checked at tablet width. Items that depend on data are marked LIKELY.

## 1. Summary

| Dimension | Assessment |
|---|---|
| Visual consistency / design system | shadcn/Radix primitives are used, but there are 3,677 hard-coded palette classes and three conflicting `--primary` definitions (UX-08). Every sidebar item renders as an "active" pill (UX-04; lead-verified in the nurse dashboard screenshot). |
| Color contrast | **Fails WCAG AA broadly.** The brand teal is 2.67:1 with white text. The clinical status colors are 2.1 to 3.8:1 (A11Y-01, A11Y-02). That is 375 of 454 failing axe nodes. |
| Error / empty / loading states | **Safety-relevant defect.** When the backend fails, dashboards show `0`, "No patients in queue", "Stock levels OK" and "All records up to date" (UX-01; lead-verified). Only the Laboratory page shows an error with Retry. |
| Forms | 131 of 146 input-bearing files use ad-hoc state rather than react-hook-form + zod. Required marking is inconsistent. The login labels are mis-wired (A11Y-03; lead-verified: `FormLabel htmlFor={formItemId}` while the `Input` overrides `id="email"`, and the password `FormControl` wraps a `<div>`). |
| Confirmation for irreversible actions | Missing for appointment cancel and discharge actions, among others. Only 5 feature files use a confirm dialog (UX-02). |
| Keyboard / screen reader | The hidden mobile sidebar stays tabbable (A11Y-04). Each sidebar link takes two tab stops (A11Y-05). 57 click handlers sit on non-interactive elements (A11Y-08). Critical lab and NEWS2 alerts are not announced (A11Y-06). |
| Responsive | Horizontal overflow at 390 px on the admin dashboard and other key pages (UX-07). Tables overflow inside scroll regions that cannot be focused (A11Y-14). |
| Notifications | Two toast systems run side by side (UX-09). The session-timeout warning is a 10-second toast, and unsaved work is not protected (UX-11). |
| i18n | Not ready. Strings are hardcoded and the app mixes date locales and the ₹/$ currency symbols (UX-12, FUNC-29). |
| Onboarding | First-run guidance exists only for admin (UX-14). |
| Existing a11y tests | They test hand-written fixtures, not the app (A11Y-16 → TEST-07). |

## 2. Prioritized UX improvements (summary)

1. **Make failure visible.** Use a shared `<QueryState>` wrapper that renders error, empty and loading states distinctly, and never show "0" or "all clear" when a query fails (UX-01, UX-13).
2. **Fix contrast at the token level.** Darken `--primary` and the status tokens until AA passes, and use a single source of color truth (A11Y-01, A11Y-02, UX-08).
3. **Make clinical alerts accessible.** Critical lab and NEWS2 alerts go in a persistent alert region with `role="alert"` that requires acknowledgment, and they respect reduced-motion settings (A11Y-06, A11Y-15).
4. **Confirm irreversible actions.** Use a standard `ConfirmDestructiveAction` dialog with a required reason for cancel, discharge, dispense and delete (UX-02).
5. **Fix form semantics and navigation.** Repair `FormControl` usage, the mobile drawer focus management and the active-state styling (A11Y-03, A11Y-04, A11Y-05, UX-04).
6. **Replace the fixture-based a11y tests.** Add an axe Playwright smoke test over real routes with a zero-critical gate (A11Y-16, TEST-07).

## 3. Detailed rendered results and findings (UX-xx, A11Y-xx)

Auditor scope: rendered audit of public and authenticated views, plus a source review of the design system, forms, states, a11y semantics and i18n. Read-only. No repo files were created or changed (`git status` is clean). Servers have been stopped.

Status legend for this file: **CONFIRMED** = rendered/executed in Chromium (Playwright) or computed in-browser; **LIKELY** = strong source evidence, not exercised at runtime; **SUSPECTED** = needs runtime verification.

### How the app was rendered

- Two Vite dev servers ran from the repo, with env passed inline and no `.env` file written:
  - `:8124`: `VITE_SUPABASE_URL=https://stub.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=stub-anon-key npx vite --host 127.0.0.1 --port 8124 --strictPort` (public pages, stub-backend behaviour).
  - `:8123`: the same, plus `VITE_E2E_MOCK_AUTH=true VITE_E2E_MOCK_PASSWORD=<mock password from .env.test>` (authenticated role views). The scripts read the password from `.env.test` at runtime and never print it.
  - `vite.config.ts` binds `host: "::"`, port 8080, `hmr.port: 8080`. IPv6 `::` fails in this container (`EAFNOSUPPORT`), so `--host 127.0.0.1` was used. The HMR socket conflicts on 8080 when two instances run, which is harmless for auditing. The dev CSP allows `ws://localhost:*` but not `ws://127.0.0.1:*`, so the console logs HMR CSP violations.
- Every network call to `stub.supabase.co` fails (the proxy refuses the tunnel). This is a realistic "backend down" condition.
- Mock auth worked for all 7 roles: admin, doctor, nurse, receptionist, pharmacist, lab_technician and patient.
- Viewports: public pages at 1440x900, 820x1180 and 390x844; authenticated pages at 1440x900 and 390x844. A dark-mode pass was also run on 4 pages.
- axe: `@axe-core/playwright` 4.11 with tags `wcag2a, wcag2aa, wcag21a, wcag21aa`.
- Scripts are in `<audit-scratchpad>/ui-scripts/`:
  - Page audits: `public-audit.js`, `roles-audit.js`.
  - Login checks: `login-keyboard.js`, `login-names.js`.
  - Layout, navigation and theme: `mobile-detail.js`, `nav-count.js`, `dark-mode.js`, `misc-checks.js`.
  - Contrast and source scans: `contrast.js`, `icon-buttons.py`, `noninteractive-onclick.py`.
  - Raw results: `public-results.json`, `roles-results.json`, `axe-tables.md`.
- Screenshots (112 PNG files) are in `<audit-scratchpad>/screens/`. The public-page and login screenshots were taken from the non-mock server, and the mock-credential panel is masked in `dark-login-desktop.png`, so no screenshot shows the mock password.

#### axe results summary
Totals: 70 page/viewport scans, 129 rule violations, 454 failing nodes (49 critical, 405 serious).

| Rule | Failing nodes |
|---|---|
| color-contrast | 375 |
| button-name | 40 |
| aria-hidden-focus | 23 |
| label | 4 |
| scrollable-region-focusable | 4 |
| aria-valid-attr-value | 3 |
| link-in-text-block | 3 |
| select-name | 2 |

Note: axe does **not** flag the broken login labels (A11Y-03), because it accepts the placeholder as an accessible name. It also misses the invisible hero text (A11Y-11), because the background is a gradient that axe reports as "incomplete". The real defect count is therefore higher than axe reports.

Public pages (c = critical, s = serious, number = failing nodes):

| Page | 1440 | 820 | 390 | Overflow @390 |
|---|---|---|---|---|
| landing (`/` → `/hospital`) | aria-valid-attr-value(c)1, contrast(s)14 | aria-valid-attr-value(c)1, contrast(s)14 | aria-valid-attr-value(c)1, button-name(c)5, contrast(s)9 | no |
| login (`/hospital/login`) | contrast(s)2 | contrast(s)3 | contrast(s)3 | no |
| signup (`/hospital/signup`) | contrast(s)1 | contrast(s)2 | contrast(s)2 | no |
| forgot password | contrast(s)1, link-in-text-block(s)1 | same | same | no |
| patient register (`/patient-register`) | button-name(c)2 | button-name(c)2 | button-name(c)2 | no |
| patient login (`/patient-login`) | button-name(c)1, contrast(s)4 | button-name(c)1, contrast(s)5 | button-name(c)1, contrast(s)5 | no |
| quick-access | contrast(s)1 | contrast(s)1 | contrast(s)1 | no |
| 404 | contrast(s)1 | contrast(s)1 | contrast(s)1 | no |

Authenticated pages (mock auth). Every mobile scan also reports `aria-hidden-focus(s)1`, which is the off-canvas sidebar (A11Y-04).

| Role / page | 1440 | 390 | Overflow @390 |
|---|---|---|---|
| admin /dashboard | contrast 17 | contrast 16 | **YES 411px** |
| admin /settings/staff | contrast 4 | contrast 3 | no |
| admin /patients | button-name(c)1, contrast 3 | button-name 1, contrast 2 | no |
| admin /billing | button-name 1, contrast 11 | button-name 1, contrast 7, scrollable-region-focusable 1 | **YES 467px** |
| doctor /dashboard | button-name(c)4, contrast 17 | button-name 4, contrast 16 | **YES 411px** |
| doctor /consultations | button-name 1, contrast 10 | button-name 1, contrast 7, scrollable-region 1 | no |
| doctor /patients | button-name 1, contrast 3 | button-name 1, contrast 2 | no |
| doctor /appointments | label(c)1, contrast 10 | label 1, contrast 6 | no |
| nurse /dashboard | button-name 3, contrast 6 | button-name 3, contrast 5 | no |
| nurse /queue | contrast 3 | contrast 2 | no |
| nurse /hospital/nurse/medications | select-name(c)1, contrast 2 | select-name 1, contrast 1 | no |
| receptionist /dashboard | contrast 12 | contrast 11 | no |
| receptionist /appointments | label 1, contrast 10 | label 1, contrast 6 | no |
| receptionist /queue | contrast 3 | contrast 2 | no |
| pharmacist /dashboard | contrast 7 | contrast 6 | no |
| pharmacist /pharmacy | contrast 14 | contrast 9, scrollable-region 1 | no |
| pharmacist /inventory | button-name 1, contrast 12 | button-name 1, contrast 5, scrollable-region 1 | no |
| lab_technician /dashboard | contrast 9 | contrast 8 | no |
| lab_technician /laboratory | button-name 1, contrast 4 | button-name 1, contrast 3 | no |
| patient /dashboard | contrast 7 | contrast 6 | no |
| patient /patient/portal | contrast 3 | contrast 2 | **YES 462px** |
| patient /patient/lab-results | contrast 3 | contrast 2 | no |
| patient /patient/prescriptions | contrast 3 | contrast 2 | no |

Dark mode (`caresync-theme=dark`):

| Page | Violations |
|---|---|
| admin /dashboard | contrast 10 |
| admin /billing | button-name 1, contrast 10 |
| nurse /dashboard | button-name 3, contrast 2 |
| lab /laboratory | button-name 1, contrast 3 |

Dark mode is mostly token-driven and renders coherently. White on dark-mode primary is still 2.53:1.

---

### A11Y-01: Brand primary teal fails WCAG contrast everywhere it is used for text or as a text background
- Severity: P1
- Category: Accessibility
- Status: CONFIRMED (axe on all 70 scans, computed in-browser)
- Module: Design system / theming
- Location: src/index.css:29-31, src/index.css:107 (`--sidebar-primary`), src/components/ui/button.tsx:13 (default variant), src/components/ui/badge.tsx:10
- Evidence:
  ```
  --primary: 173 65% 42%;           /* = #25b1a0 */
  --primary-foreground: 0 0% 100%;
  axe: "insufficient color contrast of 2.66 (foreground #ffffff, background #25b1a0, 14px)"
  axe: "a[href$="forgot-password"] contrast of 2.55 (#25b1a0 on #fafafa)"
  ```
- Actual behavior / Expected behavior: Several elements put white text on `--primary`: every default/hero Button, active Tabs, default Badges, avatar initials and all sidebar items. The measured contrast is 2.67:1. Primary-coloured links ("Forgot password?", "Register your hospital", breadcrumbs, "View All") measure 2.55:1 on the page background. This accounts for most of the 375 color-contrast nodes. Expected: at least 4.5:1 for normal text and at least 3:1 for large text and UI components.
- Reproduction: Run `roles-audit.js` or `public-audit.js`. Any page with a primary button fails color-contrast.
- Root cause: The brand token was tuned for vividness, not contrast. A contrast-correct override exists in `src/styles/contrast-fixes.css`, but nothing imports it, so it is dead code.
- Impact: Low-vision clinicians and patients cannot reliably read primary CTAs such as "Sign In", "Record Vitals", "Start Consultation" and "Create Invoice", or navigation labels. This fails WCAG 1.4.3 across the entire product, which is a procurement and legal risk (ADA, Section 508, EN 301 549).
- Recommendation: Darken `--primary` to about `173 70% 28%` (≈#167a6e, ≈5.3:1 with white) or use dark text on primary. Add a `--primary-text` token for links. Update `--ring` and `--sidebar-primary` to match. Delete or merge `contrast-fixes.css` and `accessibility.css` so there is one source of truth.
- Effort: S
- Acceptance criteria: axe `color-contrast` reports 0 nodes involving `--primary` on login, dashboard and billing in light and dark themes. A unit test asserts token pairs ≥4.5:1.

### A11Y-02: Clinical status and severity colours fail contrast (warning 2.1:1, info 2.9:1, success 3.3:1, critical 3.8:1)
- Severity: P1
- Category: Accessibility
- Status: CONFIRMED (computed with `contrast.js`, axe hits on landing and dashboards)
- Module: Status badges / clinical severity
- Location: src/index.css:76-83, src/components/ui/badge.tsx:15-23, src/components/dashboard/LabTechDashboard.tsx:81-94, src/pages/consultations/ConsultationsPage.tsx:112, src/components/consultations/StartConsultationModal.tsx:130, src/components/pharmacy/InteractionChecker.tsx:58
- Evidence:
  ```
  2.13  white on --warning (bg-warning text-warning-foreground)   | 2.86 white on --info
  3.33  white on --success   | 3.78 white on --critical/--destructive
  2.95  Badge "warning" amber-600 on amber-500/10 | 3.21 Badge "urgent" | 3.02 Badge "success"
  2.28  <Badge className="bg-green-500 text-white">Completed</Badge>  (LabTechDashboard.tsx:83)
  ```
- Actual behavior / Expected behavior: Every semantic status token pair (`*-foreground` on `*`) and most custom `Badge` variants are below 4.5:1 at 12px. The only exceptions are emergency (4.23, still failing) and the AllergyRecords palette, which passes at 6.4–6.8. Text such as "High", "In Progress", "Waiting", "Up to date" and "Stock levels OK" is unreadable for low-vision users. On the landing page, `.bg-warning.text-white` measured 2.13:1. Expected: severity labels at least 4.5:1, with the colour backed by an icon or text.
- Reproduction: `node ui-scripts/contrast.js`; axe on `/hospital` and on the doctor and pharmacist dashboards.
- Root cause: The status palette uses -500 hues with white foregrounds. Badge variants use -600 text on 10% tints.
- Impact: Severity carries clinical meaning (urgent, critical, interaction warnings). Misreading it delays escalation. This fails WCAG 1.4.3.
- Recommendation: Introduce AA-safe tokens, for example `--warning: 32 95% 30%` with white, or keep the bright fill and use `--warning-foreground: 222 47% 11%` (dark text). Move badge variants to `-800` text on `-100` fills, as `AllergyRecords.tsx:27-29` already does. Ban `bg-*-500 text-white` for status with an ESLint rule (`no-restricted-syntax` on className literals).
- Effort: M
- Acceptance criteria: All `Badge` variants and all `bg-{success,warning,info,critical}` + `*-foreground` pairs are ≥4.5:1, verified by a token contrast test. axe shows 0 contrast nodes on status badges.

### A11Y-03: Hospital login and forgot-password fields have no programmatic labels; password errors are not associated
- Severity: P1
- Category: Accessibility
- Status: CONFIRMED (rendered, DOM inspected)
- Module: Auth / LoginPage, ForgotPasswordPage
- Location: src/pages/hospital/LoginPage.tsx:229-236, src/pages/hospital/LoginPage.tsx:260-276, src/pages/hospital/ForgotPasswordPage.tsx:149-150, src/components/ui/form.tsx:79-94
- Evidence:
  ```
  Email Address -> for=:r0:-form-item -> NOTHING        (Input id="email" overrides FormControl's id)
  Password      -> for=:r1:-form-item -> div#:r1:-form-item   (FormControl wraps <div className="relative">)
  input password => accessible name = PLACEHOLDER-ONLY:"â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
  empty submit: password ariaInvalid=null, describedBy=[]   (error "Password is required" not linked)
  ```
- Actual behavior / Expected behavior: On the primary staff login, the "Email Address" label points to a non-existent id. The "Password" label points to a `<div>`. A screen reader therefore announces the email field by its placeholder ("admin@hospital.com") and the password field as mojibake (see UX-06). After an empty submit, the email field gets `aria-invalid` and `aria-describedby`, but the password input gets neither, because those props land on the wrapper div. Forgot-password has the same wrapper-div problem. `aria-describedby` also always references a non-existent `-form-item-description` id. Expected: each label's `for` matches its input id, and the error is linked to the input through `aria-invalid` and `aria-describedby`.
- Reproduction: Run `ui-scripts/login-names.js`, or in DevTools check `document.querySelector('label[for]').htmlFor` against the input ids.
- Root cause: shadcn `FormControl` uses Radix `Slot`, which forwards `id` and `aria-*` to its direct child. Here that child is a `<div>`, or an `<Input>` with a hard-coded `id` that overrides `formItemId`.
- Impact: Blind and low-vision staff cannot reliably log in. This fails WCAG 1.3.1, 3.3.2 and 4.1.2. Patient-login and signup are labelled correctly, so the defect is specific to these pages.
- Recommendation: Put `<FormControl>` directly around `<Input>` and position the eye toggle as a sibling, as `JoinPage.tsx:283-287` does. Remove the hard-coded `id="email"` and `id="password"`, or pass the same id to `FormLabel htmlFor`. Only include `formDescriptionId` in `aria-describedby` when a `FormDescription` is rendered.
- Effort: S
- Acceptance criteria: `getByLabelText('Email Address')` and `getByLabelText('Password')` resolve to the inputs. After an empty submit, both inputs have `aria-invalid="true"` and an `aria-describedby` that points to the visible error text. A Playwright test asserts this.

### A11Y-04: The hidden mobile sidebar stays in the tab order; the open drawer gets no focus management
- Severity: P1
- Category: Accessibility
- Status: CONFIRMED (keyboard test at 390px; axe `aria-hidden-focus` on all 23 mobile authenticated scans)
- Module: Layout / DashboardLayout
- Location: src/components/layout/DashboardLayout.tsx:209-220, src/components/layout/DashboardLayout.tsx:339
- Evidence:
  ```
  aria-hidden={ !sidebarOpen && window.innerWidth < 1024 ? 'true' : undefined }
  TAB 2: a "AROCORDHIMS" x=-244 inViewport=false inAriaHidden=true
  TAB 3: button "Close navigation menu" x=-32 inViewport=false inAriaHidden=true
  TAB 5..8: a "Dashboard" / button "Dashboard" / a "Patients" / button "Patients" (all off-screen)
  drawer opened: {"role":null,"ariaModal":null,"focusInside":false}
  ```
- Actual behavior / Expected behavior: At phone and tablet widths, the closed sidebar is moved off-screen and marked `aria-hidden`, but its links stay focusable. After "Skip to main content", a keyboard user tabs through about 30 invisible stops, and screen readers announce nothing for them. Opening the drawer does not move focus into it, the drawer has no `role="dialog"` or `aria-modal`, and focus is not trapped. Escape does close it, which works correctly. Expected: the closed drawer is `inert`, and the open drawer moves focus to its first item and contains focus.
- Reproduction: At 390x844, log in, focus the page body and press Tab repeatedly (`ui-scripts/mobile-detail.js`).
- Root cause: `aria-hidden` is used without `inert` or `visibility:hidden`, and the drawer is a hand-rolled `<aside>` instead of the Radix Sheet in `components/ui`.
- Impact: Tablets and phones are common on wards. Keyboard and switch users lose track of focus on every page. This fails WCAG 2.4.3, 2.4.7 and 4.1.2.
- Recommendation: Use the shadcn `Sheet` (Radix Dialog) for the mobile nav, or add `inert` and `visibility: hidden` when closed, and focus the first link on open.
- Effort: S
- Acceptance criteria: At 390px, the first Tab after the skip link reaches a visible header control. axe reports 0 `aria-hidden-focus`. When the drawer opens, focus moves into it and stays there until it is closed.

### A11Y-05: Sidebar nav nests a `<button>` inside each `<a>`, doubling tab stops
- Severity: P2
- Category: Accessibility
- Status: CONFIRMED (DOM: `a button` count = item count for every role; Tab sequence shows `a "Dashboard"` then `button "Dashboard"`)
- Module: Layout / GroupedSidebar
- Location: src/components/layout/GroupedSidebar.tsx:222-240, src/components/layout/GroupedSidebar.tsx:127-136
- Evidence:
  ```
  <Link key={item.href} to={item.href}>
    <Button className={cn("w-full justify-start ...", isActive(item.href) && "...")} size="sm" title={item.label}>
  nestedInteractive: admin 23, doctor 9, nurse 9, receptionist 7, pharmacist 5, lab 5, patient 6
  ```
- Actual behavior / Expected behavior: Every nav item is an interactive element inside another interactive element, which is invalid HTML. Keyboard users must press Tab twice per item, and screen readers announce "link, Dashboard, button, Dashboard". `aria-current="page"` is set only in the collapsed rail variant, not in the expanded list. Expected: one focusable `<a>` per item, styled with `buttonVariants`, carrying `aria-current="page"`.
- Reproduction: Run `ui-scripts/nav-count.js` and the Tab sequence in `mobile-detail.js`.
- Root cause: The Button is used for styling instead of `<Button asChild><Link/></Button>`.
- Impact: The extra tab stops add keyboard fatigue in the main navigation. This fails WCAG 4.1.2 and 1.3.1, and the current page is not identified.
- Recommendation: Change to `<Button asChild variant="ghost"><Link aria-current={active ? 'page' : undefined} …/></Button>`.
- Effort: S
- Acceptance criteria: Each nav item is a single tab stop, and the active item exposes `aria-current="page"`.

### A11Y-06: Critical lab values and NEWS2 escalations are not announced and do not persist
- Severity: P1
- Category: Accessibility
- Status: LIKELY (source; no backend to trigger realtime alerts)
- Module: Lab critical alerts, NEWS2, nurse predictive alerts
- Location: src/components/lab/CriticalLabAlertBanner.tsx:73-85, src/components/lab/CriticalValueAlert.tsx:25-31, src/components/consultations/PatientSidebar.tsx:143-170, src/components/nurse/PredictiveAlerts.tsx:158-163
- Evidence:
  ```
  <div className={`rounded-lg border-2 p-4 ... animate-pulse`}>   // CriticalLabAlertBanner: no role="alert"/aria-live
  toast.error(`🚨 CRITICAL VALUE: ${alert.test_name} = ${alert.critical_value}`, { duration: 10000 })
  {vitalEval.news2.totalScore >= 5 && (<div className="p-2 rounded bg-red-50 ...">  // no live region
  grep: only 5 aria-live usages in app code (none on lab/NEWS2 alerts)
  ```
- Actual behavior / Expected behavior:
  - The critical lab banner is a plain `div` that pulses and bounces. Screen readers do not announce it when it appears.
  - The realtime critical-value alert is a Sonner toast that disappears after 10 seconds. It does not name the patient and has no acknowledge step.
  - The NEWS2 ≥5 "Response" box and the nurse PredictiveAlerts have no live region.

  Expected: critical alerts use `role="alert"` or `aria-live="assertive"`, stay visible until someone acknowledges them, name the patient, and do not depend on colour or motion alone.
- Reproduction: Static analysis. To confirm, insert a row into `critical_value_alerts` and observe with NVDA or VoiceOver.
- Root cause: No shared "clinical alert" primitive exists. Each component invents its own UI.
- Impact: A screen-reader-using clinician, or anyone whose eyes are elsewhere, can miss a critical potassium value or a NEWS2 escalation. This is a patient-safety gap and fails WCAG 4.1.3 Status Messages.
- Recommendation: Create one `<ClinicalAlert severity>` component with `role="alert"` (assertive for critical), persistent display until acknowledged (reuse `CriticalAlertAcknowledgmentModal`), the patient identifier in the text, and reduced motion. Replace toast-only delivery for critical values.
- Effort: M
- Acceptance criteria: In a jsdom test, rendering `CriticalLabAlertBanner` or the NEWS2 ≥5 box produces an element with `role="alert"`. A critical-value event creates a persistent banner or modal that requires acknowledgement, in addition to any toast.

### A11Y-07: Icon-only buttons and tabs without accessible names (29 in source; 40 failing nodes in axe)
- Severity: P2
- Category: Accessibility
- Status: CONFIRMED (axe `button-name` on 14 scans) + LIKELY (source scan)
- Module: Cross-cutting (telemedicine, nurse handover, documents, admin, landing, patient portal)
- Location: src/components/telemedicine/VideoCallModal.tsx:631,731,740; src/components/telemedicine/PatientVideoCallModal.tsx:238,309,317,325; src/components/nurse/ShiftHandoverModal.tsx:317,360; src/pages/patient/PatientLoginPage.tsx:195; src/pages/documents/DocumentsPage.tsx:211,218; src/components/admin/DepartmentManagement.tsx:255,258; src/components/receptionist/AppointmentCalendarView.tsx:251,257; src/pages/appointments/AppointmentsPage.tsx:544-546; src/components/landing/WorkflowTabs.tsx:114-121 (full list in `ui-scripts/icon-buttons.txt`)
- Evidence:
  ```
  <Button variant="ghost" size="icon" onClick={() => setCriticalPatients(criticalPatients.filter(...))}><X className="h-4 w-4" /></Button>
  <Button variant={isAudioEnabled ? "outline" : "destructive"} size="icon" className="h-12 w-12 rounded-full" onClick={toggleAudio}>
  <span className="text-xs font-medium hidden sm:block">{workflow.label}</span>   // landing tabs unnamed at 390px
  icon Buttons: 67  without aria-label/title/sr-only: 29
  ```
- Actual behavior / Expected behavior: Screen readers announce many controls as just "button":
  - telemedicine mute, camera and end-call controls
  - removing a critical patient from a shift handover
  - edit and delete department
  - calendar previous and next
  - the patient-login password toggle
  - the patient-registration stepper
  - the mobile "more" menu on appointment rows

  At 390px, the landing tabs show icons only, with no name. The landing tabs also reference `aria-controls` ids that do not exist (`aria-valid-attr-value`), because the content is not rendered in `TabsContent`. Expected: every icon-only control has an accessible name that matches its action.
- Reproduction: Run axe through `roles-audit.js`, or `python3 ui-scripts/icon-buttons.py`.
- Root cause: `Button` adds `title` as a fallback name only when `title` is passed, and there is no lint rule requiring a label.
- Impact: Fails WCAG 4.1.2 and 2.5.3. Telemedicine controls are unusable with a screen reader.
- Recommendation: Add `aria-label` to all 29 call sites. Make `size="icon"` a TypeScript-required `aria-label` (discriminated props). Add `jsx-a11y/control-has-associated-label` to ESLint. In WorkflowTabs, use `sr-only` instead of `hidden` and render the panel in `<TabsContent>`.
- Effort: S
- Acceptance criteria: axe `button-name` and `aria-valid-attr-value` report 0 on all scanned pages. The source scan finds 0 unlabeled `size="icon"` buttons.

### A11Y-08: 57 click handlers on non-interactive elements, including the medication "5 Rights" checklist and patient pickers
- Severity: P2
- Category: Accessibility
- Status: LIKELY (source scan `noninteractive-onclick.py`; billing cards observed in render)
- Module: Nurse MAR, lab and imaging ordering, scheduling, billing, receptionist
- Location: src/components/nurse/MedicationAdministrationModal.tsx:354,368 (and the following Rights); src/components/lab/CreateLabOrderModal.tsx:246; src/components/appointments/ScheduleAppointmentModal.tsx:276; src/pages/billing/BillingPage.tsx:178,194,210; src/components/receptionist/WalkInRegistrationModal.tsx:226; src/components/receptionist/PatientCheckOutModal.tsx:116; src/components/nurse/TriageChecklist.tsx:154
- Evidence:
  ```
  <div onClick={() => handleToggleRight('rightPatient')} className="... cursor-pointer ...">
    <Checkbox checked={fiveRights.rightPatient} />   // checkbox has no label/handler of its own
  <TableRow key={patient.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handlePatientSelect(patient)}>
  non-interactive elements with onClick: 57  (div 35, Card 13, Badge 6, TableRow 3) — none have role+tabIndex+key handler
  ```
- Actual behavior / Expected behavior: Patient selection rows in the lab-order and scheduling modals, billing filter cards ("Click to filter"), walk-in cards and triage items cannot be reached or activated with the keyboard. In the 5-Rights checklist, the nested Checkbox is focusable but unlabeled ("checkbox, not checked"), and the label text sits on the clickable div. Expected: native `button` and `label` elements, or `role` plus `tabIndex` plus an Enter/Space handler.
- Reproduction: Static analysis. Open Lab → New Lab Order and try to choose a patient with only the keyboard.
- Root cause: Clickable cards and rows were styled ad hoc.
- Impact: Keyboard-only staff cannot complete core clinical tasks (ordering labs, booking, medication administration checks). This fails WCAG 2.1.1 and 4.1.2.
- Recommendation: Use `<label htmlFor>` with `Checkbox onCheckedChange` for the 5 Rights. Use a `button` for row selection, or a `RadioGroup`/listbox for patient pickers. Enable `jsx-a11y/click-events-have-key-events` and `no-static-element-interactions`.
- Effort: M
- Acceptance criteria: The ESLint jsx-a11y rules pass. A Playwright test completes lab-order patient selection and the 5-Rights confirmation using only the keyboard.

### A11Y-09: Custom modals without dialog semantics or focus trap; 56 Dialog files lack descriptions
- Severity: P2
- Category: Accessibility
- Status: LIKELY (source)
- Module: Nurse patient prep (NEWS2), appointment recurrence, workflow orchestration
- Location: src/components/nurse/PatientPrepModal.tsx:240-254, src/components/features/appointment-recurrence/AppointmentRecurrenceModal.tsx:64, src/components/admin/WorkflowOrchestrationPanel.tsx:252
- Evidence:
  ```
  if (!open) return null;
  return (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"> ...
            <Button variant="ghost" onClick={onClose}>×</Button>
  files with DialogContent: 124; without DialogDescription/aria-describedby: 56
  ```
- Actual behavior / Expected behavior: PatientPrepModal, which captures vitals and NEWS2, is a `div` overlay. It has no `role="dialog"`, `aria-modal` or label, it does not trap focus, it does not close on Escape, focus is not returned on close, and its close button is announced as "times". Radix dialogs without `DialogDescription` log warnings and give screen-reader users no context. Expected: all modals use the Radix `Dialog` primitive with a title and description.
- Reproduction: Static analysis.
- Root cause: The modals were hand-built instead of using `components/ui/dialog`.
- Impact: Fails WCAG 2.4.3 and 4.1.2. Keyboard users can tab behind the modal while recording vitals.
- Recommendation: Migrate the three custom overlays to `Dialog`. Add `DialogDescription`, or `aria-describedby={undefined}` where none is appropriate.
- Effort: S
- Acceptance criteria: No `fixed inset-0` modal markup remains outside `components/ui`. The Radix "Missing Description" console warning is absent.

### A11Y-10: Unlabelled selects and comboboxes (appointments filter, nurse MAR, patient registration)
- Severity: P2
- Category: Accessibility
- Status: CONFIRMED (axe `label`/`select-name`; DOM label → target check)
- Module: Appointments, Nurse medications, Patient self-registration
- Location: src/pages/appointments/AppointmentsPage.tsx (status/date filter `.sm:w-[180px]`), src/pages/nurse (NurseMedicationsPage native `<select>`), src/pages/patient/PatientRegisterPage (Gender, Security Question)
- Evidence:
  ```
  axe: label(critical) ".sm\:w-\[180px\]" — Element does not have an implicit (wrapped) <label>
  axe: select-name(critical) "select" on /hospital/nurse/medications
  Gender * -> for=gender -> NOTHING ;  Security Question -> for=securityQuestion -> NOTHING
  ```
- Actual behavior / Expected behavior: Screen readers announce filter and select controls without a name. On patient registration, the Radix `SelectTrigger` has no `id` matching the label's `for`, so the required "Gender" field is unnamed. Expected: each select is named by its visible label.
- Reproduction: Run `roles-audit.js` and `login-names.js`.
- Root cause: The `id` is missing on `SelectTrigger`, and filter inputs have no `aria-label`.
- Impact: Fails WCAG 1.3.1, 3.3.2 and 4.1.2 on the patient-facing registration form.
- Recommendation: Add `id` to `SelectTrigger` to match `Label htmlFor`, and add `aria-label` to filter controls.
- Effort: S
- Acceptance criteria: axe `label` and `select-name` report 0. `getByLabelText('Gender')` resolves.

### A11Y-11: Login and Signup hero panels render white text on a near-white background
- Severity: P2
- Category: Accessibility
- Status: CONFIRMED (screenshots `public-login-desktop-viewport.png`, `public-signup-desktop-viewport.png`, `public-login-hero-desktop-clip.png`; computed style)
- Module: Auth pages (desktop ≥1024px, light theme)
- Location: src/index.css:190-192 vs src/index.css:220-223; src/pages/hospital/LoginPage.tsx:159; src/pages/hospital/SignupPage.tsx:242
- Evidence:
  ```
  .gradient-hero   { background: var(--gradient-hero); }          /* dark mesh gradient */
  .hero-panel-grid { background-image: radial-gradient(circle, hsl(0 0% 100% / 0.07) 1px, transparent 1px); }
  computed: backgroundImage "radial-gradient(circle, rgba(255,255,255,0.07) 1px, ...)", backgroundColor "rgba(0,0,0,0)", p color rgba(255,255,255,0.75)
  ```
- Actual behavior / Expected behavior: `.hero-panel-grid` is declared after `.gradient-hero` in the same layer, and its `background-image` replaces the dark gradient. The left panel becomes transparent over the `#fafafa` page. The intro copy, "HIPAA Compliant" card, signup stepper ("Hospital Information / Administrator Account / Assign Staff Roles") and footer are effectively invisible (about 1.1:1). It only looks right in dark mode. axe misses this because it marks gradient backgrounds as "incomplete".
- Reproduction: Open `/hospital/login` or `/hospital/signup` at 1440px in light theme.
- Root cause: A CSS shorthand and longhand collide (`background` vs `background-image`).
- Impact: First impression for every hospital user and buyer. The signup progress indicator cannot be read, and it fails WCAG 1.4.3.
- Recommendation: Put the dot grid in a pseudo-element, or combine layers: `.gradient-hero.hero-panel-grid { background-image: radial-gradient(...), var(--gradient-hero); }`.
- Effort: S
- Acceptance criteria: The computed `background-image` of `.gradient-hero` includes the dark linear-gradient, and the hero paragraph contrast is ≥4.5:1 (manual or pixel check).

### A11Y-12: Public pages lack landmarks and a skip link, with heading and title gaps
- Severity: P3
- Category: Accessibility
- Status: CONFIRMED (DOM metrics in `public-results.json`)
- Module: Public pages / layout
- Location: src/pages/hospital/LandingPage.tsx, LoginPage.tsx, SignupPage.tsx, ForgotPasswordPage.tsx, src/pages/patient/PatientLoginPage.tsx, PatientRegisterPage.tsx, src/pages/NotFound.tsx, src/components/layout/DashboardLayout.tsx:236
- Evidence:
  ```
  landing/login/signup/forgot/patient-login/404: hasMain=false, skipLink=[]
  patient-register: h1=[]   |  login @390px: only <h1> is inside "hidden lg:flex" panel
  forgot/patient-login/patient-register/404 <title> = "AROCORD-HIMS | Modern Hospital Management System" (generic)
  authenticated pages: two h1s — sidebar "AROCORD" + page title
  ```
- Actual behavior / Expected behavior: Authenticated pages have a skip link and `<main>`, which is correct. Public pages have neither. Patient registration has no `h1`, and the mobile login page has no visible `h1`. Several pages share a generic title. The sidebar logo is an `h1`, and the global `h1 { margin-bottom: 1.5rem }` clips "AROCORD" at the top of the sidebar (visible in every authenticated screenshot). Expected: one `<main>`, a skip link, one `h1` per page and a page-specific `<title>`.
- Reproduction: Run `public-audit.js`.
- Root cause: Public pages do not use a shared layout, and global heading styles apply to UI chrome.
- Impact: Fails WCAG 2.4.1, 2.4.2, 1.3.1 and 2.4.6 (minor).
- Recommendation: Add a `PublicLayout` with a skip link and `<main>`. Change the sidebar logo to `<span>`/`<p>`. Add Helmet titles to the remaining pages.
- Effort: S
- Acceptance criteria: Each public route has exactly one visible `h1`, a `<main>` and a unique `<title>`, and axe best-practice `region`/`landmark-one-main` pass.

### A11Y-13: Text-input focus indicator is faint (15% alpha ring plus a 2.5:1 teal border)
- Severity: P3
- Category: Accessibility
- Status: CONFIRMED (computed style after the transition; screenshot `kbd-login-focus-email-settled-desktop.png`)
- Module: Design system / inputs
- Location: src/index.css:274-281
- Evidence:
  ```
  focus: {"outline":"none 3px","boxShadow":"rgba(37,177,160,0.15) 0 0 0 3px, ...","border":"rgb(37,177,160)"}
  ```
- Actual behavior / Expected behavior: Focused inputs show only a pale tint and a teal border at 2.55:1 against the background. Buttons and links have clear 2px rings and are fine. Expected: the focus indicator has at least 3:1 contrast against adjacent colours.
- Reproduction: Tab to the Email field on `/hospital/login`.
- Root cause: A global `!important` focus style is tuned for aesthetics.
- Impact: Fails WCAG 1.4.11, and is marginal for 2.4.7. Keyboard users struggle to track focus in long clinical forms.
- Recommendation: Use a `2px solid hsl(var(--ring))` outline with offset, after darkening the ring per A11Y-01.
- Effort: S
- Acceptance criteria: Focus ring contrast is ≥3:1 against both the field background and the page background.

### A11Y-14: Data tables overflow on mobile in scroll regions that are not keyboard-focusable
- Severity: P3
- Category: Accessibility
- Status: CONFIRMED (axe `scrollable-region-focusable` on billing, pharmacy, inventory and consultations at 390px; billing table measured 627px wide)
- Module: Tables (Billing, Pharmacy, Inventory, Consultations)
- Location: src/components/ui/table.tsx:5-10; 34 files use `<Table>` and 13 use a raw `<table>`. Only 1 file has a mobile card alternative (AppointmentsPage `sm:hidden`).
- Evidence:
  ```
  <div className="relative w-full overflow-auto"><table ... /></div>
  table [w-full caption-bottom text-sm] right=627 (viewport 390)
  ```
- Actual behavior / Expected behavior: Wide tables scroll horizontally inside a non-focusable div. Keyboard users cannot scroll to the Status and Actions columns when a row has no focusable cells. Expected: a focusable scroll region with a label, or a stacked card layout below `sm`.
- Reproduction: `/billing` at 390px as admin.
- Root cause: The shared `Table` wrapper lacks `tabIndex={0}`, `role="region"` and `aria-label`.
- Impact: Fails WCAG 2.1.1. On mobile, the Actions column (dispense, pay) is off-screen.
- Recommendation: Give the `Table` wrapper `tabIndex={0} role="region" aria-label={caption}`, and add a responsive card view for queues.
- Effort: M
- Acceptance criteria: axe `scrollable-region-focusable` reports 0. Pharmacy and billing queues are fully usable at 390px.

### A11Y-15: Infinite pulse and bounce animations on critical UI with no reduced-motion handling
- Severity: P3
- Category: Accessibility
- Status: LIKELY (source)
- Module: Alerts / badges
- Location: src/components/ui/badge.tsx:18 (`emergency: ... animate-pulse`), src/components/lab/CriticalLabAlertBanner.tsx:76,84 (`animate-pulse`, `animate-bounce`), src/components/consultations/PatientSidebar.tsx:153
- Evidence:
  ```
  emergency: "border-transparent bg-red-500/10 text-red-600 ... animate-pulse",
  <div className="p-2 rounded-full bg-red-600 text-white ... animate-bounce">
  grep prefers-reduced-motion|motion-reduce in app CSS/TSX: only framer-motion useReducedMotion in 4 doctor components
  ```
- Actual behavior / Expected behavior: Emergency badges and critical banners animate indefinitely, and users cannot pause them. Expected: `motion-reduce:animate-none` and a static high-contrast treatment.
- Reproduction: Static analysis.
- Root cause: No global reduced-motion policy exists. The unused `styles/accessibility.css` may have contained one, but nothing imports it.
- Impact: Fails WCAG 2.2.2 for content that moves for more than 5 seconds, and causes vestibular discomfort. Constant motion also contributes to alarm fatigue.
- Recommendation: Add a global `@media (prefers-reduced-motion: reduce) { .animate-pulse, .animate-bounce { animation: none } }` and use `motion-reduce:` variants.
- Effort: S
- Acceptance criteria: With `prefers-reduced-motion: reduce` emulated, no element has a running infinite animation.

### A11Y-16: Existing accessibility tests give false assurance
> **Consolidation note:** this finding duplicates **TEST-07** and is kept for its evidence. The register counts it once, under TEST-07.

- Severity: P2
- Category: Testing
- Status: CONFIRMED (read tests; route check; rendered axe counts contradict assertions)
- Module: tests/accessibility, tests/e2e
- Location: tests/accessibility/wcag-compliance.test.tsx:19-36, tests/accessibility/aria-labels.test.tsx, tests/accessibility/keyboard-navigation.test.tsx, tests/e2e/accessibility.spec.ts:10-41, tests/e2e/accessibility-wcag-audit.spec.ts:88-430
- Evidence:
  ```
  const LoginPage = () => (<div><h1>Login</h1><form><label htmlFor="email">Email</label>...   // inline fixture, not the real page
  /nurse/queue defined=0  /lab/results defined=0  /admin/staff defined=0  /receptionist/check-in defined=0  /doctor/new-prescription defined=0
  expect(accessibilityScanResults.violations).toEqual([]);   // landing has 15, login 2-3 violations
  expect(criticalViolations.length).toBeLessThan(5); // Allow some minor issues
  ```
- Actual behavior / Expected behavior:
  - `tests/accessibility/*` (246 lines, run by `npm run test:accessibility` in the release gate) renders hand-written JSX fixtures. It never imports an app component, so it always passes.
  - `accessibility-wcag-audit.spec.ts` navigates to 5 routes that do not exist, so it audits the 404 page.
  - Its contrast test is a stub ("would use a contrast library in real implementation").
  - `accessibility.spec.ts` would fail today on landing and login with `toEqual([])`, and tolerates fewer than 5 critical violations on dashboards.

  Expected: axe tests run against the real pages and fail on any serious or critical violation.
- Reproduction: Read the specs; compare with `ui-scripts/public-results.json`.
- Root cause: The tests were written to the checklist, not to the product.
- Impact: Release gates report accessibility as compliant while 454 failing nodes exist.
- Recommendation: Replace the fixture tests with jest-axe on real components (LoginPage, DashboardLayout, Badge variants, PatientPrepModal). Point the e2e axe specs at real routes via mock auth for all 7 roles at 2 viewports, using the matrix in this report. Assert 0 serious or critical violations, with an explicit allowlist that has owners.
- Effort: M
- Acceptance criteria: The e2e axe suite covers the 31 page/role combinations above, runs in CI and fails on regressions.

---

### UX-01: Backend failures display as valid zero or "all clear" clinical data
- Severity: P1
- Category: UI/UX
- Status: CONFIRMED (all Supabase calls failed; screenshots `role-*-dashboard-desktop.png`, `role-pharmacist-pharmacy-desktop.png`, `role-patient-dashboard-desktop.png`)
- Module: Dashboards (admin, doctor, nurse, receptionist, pharmacist, patient), patient and staff lists
- Location: src/components/pharmacist/PharmacistDashboard.tsx:44,60,84; src/components/dashboard/PatientDashboard.tsx:166-169; src/components/admin/AdminAnalytics.tsx:253; nurse queue "No patients in queue"; `/patients` "No patients found"; `/settings/staff` "No staff members found"
- Evidence:
  ```
  console: "[supabase][fetch] network error: Failed to fetch"   (every page)
  Pharmacy: "Pending Prescriptions 0 — Up to date", "Inventory Alerts 0 — Stock levels OK"
  Patient: "Health Status ● Active — All records up to date"
  value: stats?.pending || 0,   trend: inventoryAlertCount > 0 ? ... : 'Stock levels OK'
  grep: 48 files call useQuery, ~8-11 render isError/error state
  ```
- Actual behavior / Expected behavior: With the backend unreachable, these views show what looks like real data rather than an error:
  - Admin: 0 patients and ₹0.00.
  - Nurse: "No patients in queue".
  - Pharmacist: "Up to date" and "Stock levels OK".
  - Patient: "All records up to date".

  The Laboratory page is the exception. It correctly shows "Failed to load lab orders… Retry", but its stat cards next to that message still show 0. No offline or degraded banner appears. Expected: failed queries show an explicit error state with Retry and a "data unavailable" marker (for example "—", not "0"), and a global connectivity banner appears.
- Reproduction: Start the dev server with a stub Supabase URL and mock auth, log in as nurse or pharmacist and open the dashboard.
- Root cause: Data hooks default to `|| 0` or `[]`. Components check `isLoading` but not `isError`. The `QueryClient` has no global `onError`.
- Impact: Clinical safety. During an outage, a nurse may believe the triage queue is empty, a pharmacist may believe nothing is pending and stock is fine, and a patient may be told their records are current. Wrong operational decisions follow.
- Recommendation: Add a shared `<QueryState query>` wrapper (loading skeleton / error with retry / empty) and use it everywhere. Never coerce errors to 0. Add a global `QueryCache({ onError })` that shows a persistent "Live data unavailable" banner. Remove hard-coded reassurance strings, or compute them only from successful data.
- Effort: M
- Acceptance criteria: With Supabase unreachable, every dashboard card shows an error or "unavailable" state (no "0" and no "OK"). A Playwright test that blocks `*.supabase.co` asserts the error UI on all 7 role dashboards.

### UX-02: Destructive and irreversible clinical actions run with one click, without confirmation, reason or undo
- Severity: P1
- Category: UI/UX
- Status: LIKELY (source; no backend to execute mutations)
- Module: Appointments, Discharge workflow, Receptionist requests, Staff invitations, Admin
- Location: src/pages/appointments/AppointmentsPage.tsx:155-157,513-518,555-557; src/components/discharge/DischargeWorkflowCard.tsx:224-238; src/components/dashboard/ReceptionistDashboard.tsx:89-96,302; src/pages/settings/StaffManagementPage.tsx:190,478; src/components/admin/UserManagement.tsx:53; src/components/admin/DepartmentManagement.tsx:262
- Evidence:
  ```
  const handleCancel = (appointmentId) => { updateAppointment.mutate({ id: appointmentId, status: "cancelled" }); };
  <Button size="sm" variant="outline" onClick={() => onCancel(appointment.id)}>Cancel</Button>   // next to "Check In"
  <Button variant="outline" onClick={() => onCancel('User cancelled discharge process')}>Cancel</Button>
  if (window.confirm('Are you sure you want to delete this user?')) {
  AlertDialog used in only 5 feature files
  ```
- Actual behavior / Expected behavior:
  - Cancelling an appointment is one click on a button styled like, and placed next to, "Check In" (and in the mobile menu). It asks for no reason and offers no undo.
  - Cancelling a discharge workflow is one click with a hard-coded reason.
  - "Complete Checkout" and "Finalize Discharge" have no review step.
  - Rejecting a patient request is one click.
  - User and department deletion use the native `window.confirm`, which cannot be styled, is not consistent and does not explain consequences.

  Expected: an AlertDialog naming the patient, the action and its consequences, a destructive button style, a required reason for clinical cancellations, and an undo toast where reversible.
- Reproduction: Static analysis.
- Root cause: There is no shared `ConfirmDestructiveAction` pattern.
- Impact: A mis-tap on a tablet cancels a patient's appointment or discharge with no audit reason. The patient may miss care, and staff must redo the workflow.
- Recommendation: Create `<ConfirmActionDialog>` (Radix AlertDialog) with patient context, a `reason` field (required for cancellations and rejections), and a `variant="destructive"` confirm button. Apply it to every call site listed here and to other `status: 'cancelled'`/`'rejected'` mutations.
- Effort: M
- Acceptance criteria: Every cancel, reject, delete or finalize action opens a confirmation that names the patient or record. Cancellations persist a user-entered reason. No `window.confirm` remains in `src/`.

### UX-03: Calendar "Reschedule", "Cancel" and "Edit" buttons do nothing
- Severity: P2
- Category: Functional
- Status: LIKELY (source)
- Module: Receptionist / AppointmentCalendarView
- Location: src/components/receptionist/AppointmentCalendarView.tsx:43-70, 321-323
- Evidence:
  ```
  // TODO: Implement reschedule functionality
  devLog('Reschedule appointment:', selectedAppointment.id);
  // TODO: Implement cancel functionality
  <Button variant="outline" onClick={handleCancelAppointment}>Cancel</Button>
  ```
- Actual behavior / Expected behavior: These are visible primary actions on the calendar detail panel, but they only log in dev, and the user gets no feedback. Expected: the actions are wired up, or hidden or disabled with a tooltip.
- Reproduction: Static analysis.
- Root cause: The feature is unfinished but shipped in the UI.
- Impact: Receptionists believe they rescheduled or cancelled an appointment when nothing changed, leading to double bookings and no-shows.
- Recommendation: Reuse the AppointmentsPage mutations together with the confirmation dialog from UX-02, or remove the buttons until they are implemented.
- Effort: S
- Acceptance criteria: Each button either performs its mutation (with a success or error message) or is not rendered.

### UX-04: Sidebar renders every item as an identical bright teal pill; the active page is indistinguishable
- Severity: P2
- Category: UI/UX
- Status: CONFIRMED (computed style; screenshots `role-*-dashboard-desktop.png`, `role-admin-sidebar-expanded-desktop.png`, `role-admin-mobile-nav-open.png`)
- Module: Layout / GroupedSidebar + Button
- Location: src/components/layout/GroupedSidebar.tsx:207-208, 224-228; src/components/ui/button.tsx:13
- Evidence:
  ```
  default: "bg-gradient-to-b from-[hsl(var(--primary-vivid))] to-[hsl(var(--primary))] ..."
  className="... bg-transparent ..."  /  isActive && "bg-sidebar-accent ..."
  active:   {"bgImage":"linear-gradient(rgb(31,214,193), rgb(37,177,160))","bgColor":"rgb(23,32,48)"}
  inactive: {"bgImage":"linear-gradient(rgb(31,214,193), rgb(37,177,160))","bgColor":"rgba(0,0,0,0)"}
  ```
- Actual behavior / Expected behavior: Every group header and nav item in the dark sidebar is a bright teal gradient pill. The intended `bg-transparent` and active `bg-sidebar-accent` are background colours painted underneath the gradient image, so active and inactive items look the same. Group labels ("CORE OPERATIONS") are 50%-opacity light text on teal and almost unreadable. The heavy visual weight competes with page content. Expected: a subtle dark sidebar with one clearly highlighted active item.
- Reproduction: Log in as any role and look at the sidebar.
- Root cause: The default Button variant uses `background-image`, and overriding classes set only `background-color`.
- Impact: Users lose orientation (where am I?), the design looks broken, and it adds to the contrast failures in A11Y-01.
- Recommendation: Use `variant="ghost"` (or `bg-none`) for sidebar buttons, together with the A11Y-05 restructure.
- Effort: S
- Acceptance criteria: Inactive items have no gradient. The active item has a distinct background or border and `aria-current`. A visual regression snapshot is updated.

### UX-05: Auth errors show raw technical text twice; forgot-password failure is a disappearing toast only
- Severity: P2
- Category: UI/UX
- Status: CONFIRMED (screenshots `kbd-login-stub-submit-*.png`, `forgot-stub-submit-*.png`)
- Module: Auth
- Location: src/pages/hospital/LoginPage.tsx:79-86,126-130; src/pages/hospital/ForgotPasswordPage.tsx:63-69
- Evidence:
  ```
  inline Alert: "NetworkError: Failed to fetch"   + toast "Login Failed — NetworkError: Failed to fetch"
  forgot-password after 6 s: body = "Forgot Password? Enter your email ... Send Reset Link" (no error visible)
  ```
- Actual behavior / Expected behavior: When the backend is unreachable, login fails fast (about 770 ms, with no stuck spinner, which is correct). It then shows the raw browser error in both an inline alert and a toast. Forgot-password shows only a 5-second toast ("Failed to send reset link") and then looks as if nothing happened. Expected: one plain-language inline message, such as "We can't reach the server. Check your connection and try again.", plus a retry, with different wording for invalid credentials and network failure.
- Reproduction: Submit login or forgot-password on `:8124` with the stub backend.
- Root cause: The code passes `error.message` straight through and mixes toasts and inline errors.
- Impact: Users are confused and contact the helpdesk, and the messages leak implementation details.
- Recommendation: Map Supabase and network errors to user copy in one helper. Use inline `role="alert"` for form errors and reserve toasts for confirmations.
- Effort: S
- Acceptance criteria: A network failure shows a single human-readable inline error on both forms, and the error stays until the user edits or retries.

### UX-06: Mojibake in the login password placeholder ("â€¢â€¢â€¢…")
- Severity: P2
- Category: UI/UX
- Status: CONFIRMED (rendered; it is also the field's accessible name, see A11Y-03)
- Module: Auth / LoginPage
- Location: src/pages/hospital/LoginPage.tsx:265 (also lines 22, 33, 36, 61: corrupted box-drawing and dash characters in comments and the toast text "Dev role override cleared â€” …")
- Evidence:
  ```
  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
  ```
- Actual behavior / Expected behavior: The staff login shows garbage characters in the password field. The file also starts with a UTF-8 BOM. Expected: `placeholder="••••••••"` or no placeholder.
- Reproduction: Open `/hospital/login`.
- Root cause: The file was double-encoded (UTF-8 bytes read as Windows-1252 and re-saved).
- Impact: The product looks low quality on the most-visited screen, and screen readers read the garbage text.
- Recommendation: Re-save the file as UTF-8 without BOM and fix the strings. Add an `.editorconfig` `charset = utf-8` and a CI grep for `â€`.
- Effort: S
- Acceptance criteria: `grep -r "â€" src` returns nothing.

### UX-07: Horizontal overflow at 390px on key dashboards and portal
- Severity: P2
- Category: UI/UX
- Status: CONFIRMED (`mobile-detail.js`)
- Module: Admin/Doctor dashboards, Billing, Patient portal
- Location: admin and doctor dashboard grids (`lg:col-span-2 space-y-6` siblings), src/pages/billing/BillingPage.tsx TabsList, patient portal action row `div.flex.gap-2` ("Record Vital Signs / Log Health Metric")
- Evidence:
  ```
  admin /dashboard sw=411 vw=390 : div [lg:col-span-2 space-y-6] right=411
  admin /billing   sw=467        : TabsList "Invoices & Billing | Insurance Claims | Payment Plans" right=467
  patient /patient/portal sw=462 : div [flex gap-2] "Record Vital Signs  Log Health Metric" right=462
  ```
- Actual behavior / Expected behavior: The whole page scrolls sideways on phones, and the right side of tabs and buttons is cut off. No public page overflows, which is correct. Expected: no page-level horizontal scroll at 390px.
- Reproduction: Log in at 390x844 and open these routes.
- Root cause: Flex rows lack `flex-wrap`, TabsList is not scrollable, and grid children have no `min-w-0`.
- Impact: Patients on phones, and staff on ward handhelds, mis-tap or miss actions.
- Recommendation: Add `flex-wrap` and `min-w-0`, make TabsList scrollable (`overflow-x-auto`), and add a Playwright overflow check per route.
- Effort: S
- Acceptance criteria: `scrollWidth <= innerWidth` for all 31 role/page combinations at 390px.

### UX-08: Design-system drift: 3,677 hard-coded palette classes, three conflicting primary definitions, and global heading styles leaking into components
- Severity: P2
- Category: Technical debt
- Status: CONFIRMED (static counts; serif CardTitles visible in screenshots)
- Module: Design system
- Location: src/index.css:29; src/styles/colors.css:15-25; src/styles/contrast-fixes.css:5 (not imported); src/styles/accessibility.css (not imported); src/styles/typography.css:26-58; src/components/ui/badge.tsx:15-25; top offenders: receptionist/EnhancedPatientRegistrationForm.tsx (113), laboratory/EnhancedLabOrderForm.tsx (83), prescription/DrugInteractionWarning.tsx (60), audit/AuditTimeline.tsx (55), discharge/DischargeWorkflowCard.tsx (45)
- Evidence:
  ```
  raw palette classes (text|bg|border-<color>-NNN): 3677 in 252 files ; semantic token classes: 1099 ; dark: variants: 256
  index.css  --primary: 173 65% 42%   | colors.css "matches --primary: hsl(173, 58%, 39%)" | contrast-fixes.css --primary: 221.2 83.2% 53.3% (blue)
  h1,h2,h3 { font-family: var(--font-display); margin-bottom: ... }  → CardTitle (h3) renders in DM Serif with extra margin
  ```
- Actual behavior / Expected behavior: Colours bypass tokens, so dark mode and re-theming only partly work. For example, DischargeWorkflowCard uses `bg-amber-50 text-gray-600` with no dark variant. Typography is inconsistent: card titles, "Create Task" and "0 pending" badges render in the serif display face at mixed sizes next to sans text (doctor dashboard), and the sidebar logo is clipped. Dark mode itself renders coherently for token-based pages, which is correct (`dark-*.png`). Expected: semantic tokens only, one primary definition, and component-scoped typography.
- Reproduction: Run the grep counts in this report and compare screenshots.
- Root cause: Several restyling passes left parallel systems in place, and element-level heading rules sit in `@layer base`.
- Impact: Inconsistent visual language, contrast regressions (A11Y-01 and A11Y-02) and costly theming.
- Recommendation: Delete or merge `contrast-fixes.css`, `accessibility.css` and `colors.css` into `index.css` tokens. Add status, severity and role tokens to `tailwind.config.ts`. Add the ESLint `tailwindcss/no-arbitrary-value` rule and a custom rule banning raw palette classes outside `components/ui`. Scope display serif styling to `.font-display` and page titles only.
- Effort: L
- Acceptance criteria: The raw palette class count trends to 0 outside `components/ui`, there is a single `--primary` definition, and `CardTitle` uses the sans face unless opted in.

### UX-09: Two parallel toast systems, with errors delivered mainly by toasts
- Severity: P3
- Category: UI/UX
- Status: CONFIRMED (both toasters mounted in App.tsx:91-92; login shows inline and toast duplicates)
- Module: Feedback / notifications
- Location: src/App.tsx:91-92; src/hooks/use-toast.ts:5-6; 187 files import `sonner`, 66 import `use-toast`
- Evidence:
  ```
  <Toaster />  <Sonner position="top-right" />
  const TOAST_LIMIT = 1;  const TOAST_REMOVE_DELAY = 1000000;
  ```
- Actual behavior / Expected behavior: The two systems differ in position, styling, duration and stacking. The Radix toaster shows only 1 toast at a time, so a second error silently replaces the first. Many form failures are reported only by toast, which is transient, not tied to the field, and easy to miss. Expected: one toast system for non-critical confirmations, and inline errors for form and validation failures.
- Reproduction: Static analysis plus the login stub submit.
- Root cause: Both shadcn toasters were adopted over time.
- Impact: Missed errors and an inconsistent experience.
- Recommendation: Standardise on Sonner, remove the Radix toaster, and document when to use toast versus inline versus banner.
- Effort: M
- Acceptance criteria: One toaster is mounted, there are no `use-toast` imports, and form errors render inline.

### UX-10: Forms are inconsistent: 131 of 146 input-bearing files use ad-hoc state; required marking is inconsistent
- Severity: P2
- Category: UI/UX
- Status: LIKELY (static counts)
- Module: Forms across clinical modules
- Location: src/components/** and src/pages/** (21 files use `useForm`/`zodResolver`; 17 use `FormMessage`); required markers: 120 labels with "*", `aria-required` in 3 places, native `required` once
- Evidence:
  ```
  files with <Input: 146 ; files with useForm: 21 ; files with <Input but no useForm: 131
  label with ' *': 120 ; aria-required: 3 ; native required: 1
  ```
- Actual behavior / Expected behavior: Most clinical forms (vitals, prescriptions, lab orders, registration) validate ad hoc, often on submit and by toast. The "*" required marker is announced as "star" and is not mirrored in `aria-required`. The login form marks nothing as required. `OfflineVitalsCaptureModal` is a good counter-example: it has inline `role="alert"` errors. Expected: react-hook-form plus zod with `FormField`/`FormMessage` everywhere, `aria-required`, and a legend explaining "*".
- Reproduction: Static analysis.
- Root cause: No form standard is enforced.
- Impact: Validation behaves inconsistently across modules, accessibility gaps repeat, and invalid clinical data may be submitted.
- Recommendation: Migrate high-risk forms first (prescription, lab order, vitals, registration) to a `StandardForm` built on `components/ui/form`, fixing the Slot issue from A11Y-03. Add a lint check against `useState`-driven form submits.
- Effort: L
- Acceptance criteria: All clinical forms use zod schemas. Required fields expose `aria-required`, and errors link to fields through `aria-describedby`.

### UX-11: Session-timeout warning is a 10-second toast; expiry logs the user out without protecting unsaved work
- Severity: P2
- Category: UI/UX
- Status: LIKELY (source)
- Module: Auth / session
- Location: src/lib/hooks/auth/useSessionTimeout.ts:29-43 (duplicated in src/hooks/useSessionTimeout.ts); src/contexts/AuthContext.tsx:351
- Evidence:
  ```
  toast.warning('Session will expire in 5 minutes due to inactivity', { duration: 10000, action: { label: 'Stay Active', ... } });
  timeoutRef.current = setTimeout(() => { toast.error('Session expired due to inactivity'); logout?.(); }, SESSION_TIMEOUT);
  ```
- Actual behavior / Expected behavior: The warning disappears after 10 seconds, shows no countdown and is not a modal. A clinician away from the screen during those 10 seconds gets no warning. At 30 minutes the app logs out immediately, and in-progress consultation notes or vitals are lost. Expected: a persistent modal (`role="alertdialog"`) with a live countdown and "Stay signed in", drafts autosaved before logout, and a "you were signed out" explanation on the login screen.
- Reproduction: Static analysis. To confirm, set `SESSION_TIMEOUT` low in a dev build.
- Root cause: The minimal implementation is duplicated across two hooks.
- Impact: Lost clinical documentation and frustration. Meets the letter of WCAG 2.2.1 (activity resets the timer) but not its spirit.
- Recommendation: Use one hook and an AlertDialog with a countdown, persist drafts to IndexedDB or the server, and redirect with a reason.
- Effort: M
- Acceptance criteria: The warning dialog stays until dismissed and shows the remaining time. After timeout, reopening a draft-enabled form restores its contents.

### UX-12: Not internationalisation-ready; mixed date locales and currency symbols
- Severity: P3
- Category: UI/UX
- Status: CONFIRMED (₹ value beside a DollarSign icon on the admin dashboard; `$` in patient billing source) + LIKELY
- Module: i18n / formatting
- Location: package.json (no i18n library); src/lib/currency.ts:8-23 (₹/en-IN standard); src/components/patient/PatientBillingAccess.tsx:117,128,220,234 (`$`); src/components/features/billing/InsuranceClaimUI.tsx:314-315; src/components/features/billing/BillingDashboard.tsx:523,640; src/components/admin/AdminAnalytics.tsx:83 (Monthly Revenue card with $ icon)
- Evidence:
  ```
  toast.success(`Payment of $${amount.toFixed(2)} processed successfully!`);   // app standard is ₹ (formatCurrency)
  toLocaleString( x52 | toLocaleDateString() x33 (browser locale) | 'en-US' x7 | 'en-IN' x1 | date-fns format()
  ```
- Actual behavior / Expected behavior: All UI strings are hard-coded English. Dates depend on browser locale in some places and are fixed to en-US in others, which is ambiguous (03/04 could be 3 April or 4 March) and clinically risky. Patients see `$` on payments while the rest of the app uses ₹. Expected: a single locale and currency configuration per hospital, ISO or unambiguous clinical date formats, and strings ready to be extracted.
- Reproduction: Admin dashboard screenshot (₹0.00 with `$` icon); static analysis.
- Root cause: No i18n layer exists, and `formatCurrency` is adopted in only 20 files.
- Impact: Wrong currency on patient payments, ambiguous dates on clinical records, and a blocker for non-English markets. The receptionist "MultilingualSupport" component implies otherwise.
- Recommendation: Adopt `react-i18next`, add `formatDate` and `formatCurrency` helpers driven by hospital settings, replace the `$` literals and the `DollarSign` icon, and use the `dd MMM yyyy` format for clinical dates.
- Effort: L
- Acceptance criteria: `grep '\$\${' src` finds no currency literals, all dates go through one helper, and strings live in locale files.

### UX-13: Empty, loading and error states are inconsistent across modules
- Severity: P3
- Category: UI/UX
- Status: CONFIRMED (screenshots)
- Module: Pharmacy queue, Billing, Laboratory, Dashboards
- Location: src/components/pharmacist/PrescriptionQueue.tsx (header-only table), src/pages/billing/BillingPage.tsx (header-only table), src/pages/laboratory/LaboratoryPage.tsx (good error state), src/App.tsx:121 (`<Suspense fallback={<div ...>Loading...</div>}>`)
- Evidence:
  ```
  Pharmacy "Prescription Queue": column headers only, no rows, no empty message
  Laboratory: "Failed to load lab orders — There was a problem contacting the server. Retry"
  Nurse: icon + "No patients in queue / Patients will appear here after check-in"
  ```
- Actual behavior / Expected behavior: Some lists show a header-only table with no message, some show an icon plus text, and the Lab page shows a proper error with Retry. The route-level Suspense fallback is plain "Loading..." text without `role="status"`. Only 30 files use `Skeleton`, while 100 use `Loader2` spinners. No infinite spinners were observed; all spinners cleared within 4 seconds when requests failed. Expected: one EmptyState/ErrorState/Skeleton set, used consistently.
- Reproduction: Compare `role-pharmacist-pharmacy-desktop.png`, `role-lab_technician-laboratory-desktop.png` and `role-nurse-dashboard-desktop.png`.
- Root cause: No shared state components exist.
- Impact: Users cannot tell "nothing to do" from "broken".
- Recommendation: Create `EmptyState`, `ErrorState` and `TableSkeleton` in `components/ui` and use them in all lists (pairs with UX-01).
- Effort: M
- Acceptance criteria: Every list or table renders an explicit empty message and error state, and the Suspense fallback has `role="status"`.

### UX-14: Navigation load is reasonable; first-run guidance exists only for admin
- Severity: P4
- Category: Product enhancement
- Status: CONFIRMED (all groups expanded and counted per role)
- Module: Navigation / onboarding
- Location: src/config/routeManifest.ts; src/components/layout/GroupedSidebar.tsx; src/components/dashboard/AdminDashboard.tsx:57-67 (StaffOnboardingWizard)
- Evidence:
  ```
  admin 6 groups / 23 items ; doctor 3/9 ; nurse 3/9 ; receptionist 2/7 ; pharmacist 3/5 ; lab 3/5 ; patient 2/6
  routeDefinitions.tsx: ~110 paths (many reachable only by URL or dashboard buttons)
  ```
- Actual behavior / Expected behavior: Per-role nav size is fine (5–9 items for clinical roles). The admin has 23 items in collapsed groups. Clinical roles land on all-zero dashboards with no first-run guidance ("No tasks found", "No patients in queue"). A DEV "Test Mode" pill floats over content at the bottom right and covers card content on mobile (screenshots). Expected: role-specific first-run tips or a checklist, and favourites or recents for admins.
- Reproduction: Run `nav-count.js`.
- Root cause: N/A (enhancement).
- Impact: Slower onboarding for new clinical staff.
- Recommendation: Add a dismissible per-role "Getting started" card. Keep the Test Mode pill out of the content flow, for example inside the header.
- Effort: M
- Acceptance criteria: First login for each role shows the 3 most relevant actions, and this can be dismissed.

### UX-15: Login renders the dev mock-auth password from a hard-coded literal (cross-reference for the security auditor)
> **Consolidation note:** this finding duplicates **SECF-22** and is kept for its evidence. The register counts it once, under SECF-22.

- Severity: P4
- Category: Security
- Status: CONFIRMED (rendered on the mock-auth server; source)
- Module: Auth / LoginPage
- Location: src/pages/hospital/LoginPage.tsx:337-360 (literal at :341 and :358); compare src/contexts/AuthContext.tsx:97-100
- Evidence:
  ```
  {import.meta.env.VITE_E2E_MOCK_AUTH === 'true' && ( ... All accounts share password: <code>…<REDACTED>…</code>
  form.setValue('password', '<REDACTED>');
  // AuthContext.tsx:97 "SECURITY: no credential literal in source. The mock-auth password is sourced from VITE_E2E_MOCK_PASSWORD"
  ```
- Actual behavior / Expected behavior: The AuthContext comment promises that no credential literal is in source, but LoginPage hard-codes the same `<mock password from .env.test>` and displays it. Risk is low: AuthProvider throws if mock auth is set in a PROD build, and the branch is dead code otherwise. Still, it contradicts the stated control, and the literal can drift from `.env.test`. Expected: read `import.meta.env.VITE_E2E_MOCK_PASSWORD` and gate on `import.meta.env.DEV`.
- Reproduction: Start with `VITE_E2E_MOCK_AUTH=true` and open `/hospital/login`.
- Root cause: The dev-convenience panel was added after the credential cleanup.
- Impact: Only in dev and test, but secret-scanning noise and inconsistency.
- Recommendation: Use the env var and wrap the panel in `import.meta.env.DEV &&`.
- Effort: S
- Acceptance criteria: No mock password literal remains in `src/`, and the panel is absent from production bundles (`grep` on `dist/`).

---

### What could NOT be verified
- Real data states (populated tables, pagination, long names, critical-alert realtime events, 2FA modal, dispensing modal with actual prescriptions). The backend was stubbed and all Supabase calls failed, so A11Y-06, A11Y-09, UX-02, UX-03 and UX-11 rest on source evidence only.
- Screen-reader output (NVDA, VoiceOver) was not run. Accessible names were computed from the DOM.
- 820px tablet was run for public pages only. Authenticated pages ran at 1440 and 390.
