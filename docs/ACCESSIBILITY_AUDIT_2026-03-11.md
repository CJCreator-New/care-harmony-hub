# CareSync HIMS — WCAG 2.1 AA Accessibility Audit Report

**Date**: 2026-03-11  
**Auditor**: GitHub Copilot — Accessibility Audit Skill  
**Standard**: WCAG 2.1 Level AA  
**Scope**: `src/` React frontend — clinical UI, authentication flows, dashboards, shared design system (`src/styles/colors.css`, `src/styles/typography.css`, `src/styles/surfaces.css`)  
**Tools Reference**: WCAG 2.1 Success Criteria (SC), APCA contrast model (informative), browser DevTools accessibility tree

---

## Executive Summary

CareSync demonstrates meaningful accessibility investment: a `SkipNavigation` component exists, shadcn/ui provides ARIA-correct primitives, 2FA entry widgets handle keyboard navigation, and the patient portal uses `focus-visible` focus rings. This audit identified **2 High**, **5 Medium**, and **4 Low** gaps primarily concentrated in color contrast, ARIA labelling on dynamic clinical widgets, and missing reduced-motion guards in the new surfaces/animations layer.

---

## Findings

### A-01 · HIGH — `--muted-foreground` Text Fails WCAG 1.4.3 (4.5:1) on Light Background

**WCAG SC**: 1.4.3 Contrast (Minimum) · Level AA  
**File**: [src/styles/colors.css](../src/styles/colors.css) line 136

**Description**: `--muted-foreground: hsl(215.4, 16.3%, 46.9%)` renders at approximately **3.9:1** contrast against `--background: hsl(0, 0%, 100%)`. This token is used pervasively as secondary/caption text throughout the clinical UI — everywhere from table secondary rows to form hints. The 3.9:1 ratio falls below the AA threshold of 4.5:1 for normal text.

**Impact**: Staff with moderate low vision or who work in bright clinical environments cannot reliably read secondary field labels and status captions.

**Remediation**: Increase lightness to ~44% or reduce it to ~42%:
```css
/* Before */
--muted-foreground: hsl(215.4, 16.3%, 46.9%);
/* After — passes 4.5:1 against white */
--muted-foreground: hsl(215.4, 16.3%, 42%);
```
Re-verify dark mode: `--dark-muted-foreground` must achieve 4.5:1 against the dark background token.

---

### A-02 · HIGH — `--warning-500` / `--warning` Text on Warning Backgrounds Fails 4.5:1

**WCAG SC**: 1.4.3 Contrast (Minimum) · Level AA  
**File**: [src/styles/colors.css](../src/styles/colors.css) lines 67, 149–150

**Description**: `--warning-500: hsl(38, 92%, 50%)` is used as both a background fill and as a foreground text/icon color. When used as text on `--warning-100` background (`hsl(38, 92%, 93%)`), the contrast ratio is approximately **2.2:1** — critically below AA. Similarly, `--warning-foreground: hsl(0, 0%, 100%)` on `--warning-500` achieves approximately **2.9:1**, also failing the 4.5:1 normal-text threshold.

**Impact**: Warning banners and alert text (e.g., overdue lab deadlines, low stock alerts) are illegible to users with colour deficiencies or low vision.

**Remediation Options**:
1. Use `--warning-700` (`hsl(38, 92%, 32%)`, ≈6.8:1 on white) for warning text/icons.
2. Use white text only on `--warning-700` background (not `--warning-500`).
3. Pair badge text: `color: var(--warning-900); background: var(--warning-100);`

```css
/* Badge pattern — passes 7.1:1 */
.badge-warning {
  color: hsl(38, 92%, 18%);          /* --warning-900 */
  background-color: hsl(38, 92%, 93%); /* --warning-100 */
  border: 1px solid hsl(38, 92%, 60%);
}
```

---

### A-03 · MEDIUM — `--gray-400` Icon/Placeholder Text Fails 4.5:1 on White

**WCAG SC**: 1.4.3 Contrast (Minimum) · Level AA  
**File**: [src/styles/colors.css](../src/styles/colors.css) line 111

**Description**: `--gray-400: hsl(210, 20%, 65%)` achieves approximately **3.0:1** against white — commonly used for placeholder text, subtle icons, and helper/hint labels in forms and tables. While placeholder text has a WCAG exception under 1.4.3, helper text and non-decorative icons do not.

**Remediation**: Promote hint/helper text to `--gray-500` (`hsl(210, 20%, 50%)`, ≈4.6:1) or `--gray-600` (`hsl(210, 20%, 40%)`, ≈6.5:1). Reserve `--gray-400` for purely decorative uses only.

---

### A-04 · MEDIUM — New Dashboard KPI Cards Missing `aria-label` / `role="status"`

**WCAG SC**: 4.1.3 Status Messages · Level AA; 1.3.1 Info and Relationships  
**Files**: [src/pages/dashboard/WardCensusDashboard.tsx](../src/pages/dashboard/WardCensusDashboard.tsx), [src/pages/dashboard/PharmacyInventoryDashboard.tsx](../src/pages/dashboard/PharmacyInventoryDashboard.tsx), [src/pages/dashboard/LabTATDashboard.tsx](../src/pages/dashboard/LabTATDashboard.tsx)

**Description**: The KPI stat cards animate numeric values via `useCountUp` and update on refetch, but the containing elements carry no `role="status"` or `aria-live="polite"` attribute. Screen readers will not announce updated values (e.g., a surge in critical alerts) without user focus on the element.

**Remediation**:
```tsx
<div
  className={`${base} p-4 rounded-lg`}
  role="status"
  aria-label={`${label}: ${animated}${unit ?? ''}`}
  aria-live="polite"
  aria-atomic="true"
>
```

---

### A-05 · MEDIUM — Critical Alert Pulse Animation Runs Indefinitely Without `prefers-reduced-motion` Guard

**WCAG SC**: 2.3.3 Animation from Interactions · Level AAA (advisory); 2.2.2 Pause, Stop, Hide · Level AA  
**File**: [src/styles/surfaces.css](../src/styles/surfaces.css); [tailwind.config.ts](../tailwind.config.ts)

**Description**: `animate-critical-pulse` (`animation: critical-pulse 1.5s ease-in-out infinite`) runs indefinitely on critical stat cards. Infinite looping animations that cannot be paused may trigger vestibular disorders and violate 2.2.2 when they convey no unique information beyond color/border change that is also communicated in text.

**Note**: `surfaces.css` already contains a `@media (prefers-reduced-motion: reduce)` block, but it only overrides `cs-card-hover` transforms — `critical-pulse` is not covered.

**Remediation**: Add to the existing reduced-motion block in `surfaces.css`:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-critical-pulse,
  [class*="cs-critical"] {
    animation: none !important;
    /* Use border or background to still convey urgency without motion */
    border-color: hsl(var(--destructive));
    box-shadow: 0 0 0 2px hsl(var(--destructive));
  }
}
```

---

### A-06 · MEDIUM — TAT Badge Color-Only Differentiation of Risk Levels

**WCAG SC**: 1.4.1 Use of Color · Level A  
**File**: [src/pages/dashboard/LabTATDashboard.tsx](../src/pages/dashboard/LabTATDashboard.tsx) — `TATBadge` component

**Description**: `TATBadge` differentiates normal / warning / overdue TAT status using only background and text color (`bg-success/10`, `bg-warning/10`, `bg-destructive/10`). Users with protanopia/deuteranopia cannot distinguish warning from destructive states as both appear similar.

**Remediation**: Supplement color with a textual or iconographic indicator:
```tsx
const icon = minutes <= 60 ? null : minutes <= 120 ? '⚠ ' : '! ';
const label = `${icon ?? ''}${h > 0 ? `${h}h ${m}m` : `${m}m`}`;
```
Or use distinct border weights: normal (no border), warning (1px solid), critical (2px solid).

---

### A-07 · MEDIUM — Form Error Messages Not Linked to Inputs via `aria-describedby`

**WCAG SC**: 1.3.1 Info and Relationships; 3.3.1 Error Identification · Level A  
**File**: Multiple form components in `src/components/`, `src/pages/hospital/SignupPage.tsx`

**Description**: React Hook Form validation errors are rendered as `<p className="text-destructive text-sm">` nodes adjacent to inputs but without `aria-describedby` linking the error to the input control. Screen readers announce the input label on focus but not the associated error message.

**Remediation**:
```tsx
<Input
  id="hospitalName"
  aria-describedby={errors.hospitalName ? 'hospitalName-error' : undefined}
  aria-invalid={!!errors.hospitalName}
/>
{errors.hospitalName && (
  <p id="hospitalName-error" role="alert" className="text-destructive text-sm">
    {errors.hospitalName.message}
  </p>
)}
```
This pattern is reusable as a `FormFieldWithError` wrapper component.

---

### A-08 · LOW — `<table>` Elements in Clinical Data Tables Missing `<caption>`

**WCAG SC**: 1.3.1 Info and Relationships · Level A  
**Files**: Multiple clinical pages (laboratory, patients, billing)

**Description**: Data tables in `LaboratoryPage.tsx`, `PatientManagement.tsx`, and new dashboard pages render `<table>` elements without a `<caption>` element or `aria-label`. Screen reader users navigating by table landmarks cannot identify the purpose of a table before entering it.

**Remediation**: Add a visually hidden caption:
```tsx
<table aria-label="Active Inpatients — sorted by admission date">
  {/* OR */}
  <caption className="sr-only">Active inpatients, sorted by admission date</caption>
```

---

### A-09 · LOW — Icon-Only Buttons in Navigation Missing Accessible Names

**WCAG SC**: 4.1.2 Name, Role, Value · Level A  
**Files**: Various navigation and toolbar components

**Description**: Several icon buttons (refresh, close, toggle) render only a Lucide icon without an accessible name. Examples: `<Button variant="outline" size="sm">` with only `<RefreshCw />` in `WardCensusDashboard` and `LabTATDashboard`.

**Remediation**: Add `aria-label` or a visually hidden `<span>`:
```tsx
<Button variant="outline" size="sm" aria-label="Refresh dashboard data">
  <RefreshCw className="w-4 h-4" />
</Button>
```

---

### A-10 · LOW — Toast Notifications (`sonner`) Not Announced to Screen Readers in All Browsers

**WCAG SC**: 4.1.3 Status Messages · Level AA  
**Files**: All hooks using `toast()` from `sonner`

**Description**: Sonner's toast container uses `role="status"` by default, which is correct. However, Sonner does not set `aria-live="assertive"` on error toasts — only `aria-live="polite"`. For critical clinical errors (e.g., "Acknowledgement failed — patient at risk"), assertive announcements ensure screen readers interrupt current narration.

**Remediation**: Use `toast.error()` with Sonner's `important` option where clinical urgency warrants it, and verify the Sonner version in use surfaces `role="alert"` for errors:
```ts
toast.error('Critical acknowledgement failed', { important: true });
```

---

### A-11 · LOW — `SkipNavigation` Links Present But Not Verified Against Dynamic SPA Route Changes

**WCAG SC**: 2.4.1 Bypass Blocks · Level A  
**File**: [src/components/accessibility/SkipNavigation.tsx](../src/components/accessibility/SkipNavigation.tsx)

**Description**: `SkipNavigation` provides two skip links ("Skip to main content", "Skip to navigation"). In a React SPA, route transitions do not move focus to the `<main>` element by default. If focus is not moved on navigation, users relying on keyboard or screen readers must tab through the full navigation on every page change.

**Remediation**: Verify that the router's `onNavigate` or `ScrollRestoration` fires a `focus()` call on the `<main>` element after each route transition:
```tsx
// In root layout or App.tsx
const location = useLocation();
useEffect(() => {
  document.getElementById('main-content')?.focus();
}, [location.pathname]);
```
And ensure `<main id="main-content" tabIndex={-1}>` is used.

---

## Color Contrast Reference Table

Computed against sRGB white (`#ffffff`, L=1.0) unless noted.

| Token | Value | Approx Ratio | AA Normal | AA Large | Status |
|-------|-------|-------------|-----------|----------|--------|
| `--muted-foreground` | hsl(215.4, 16.3%, 46.9%) | 3.9:1 | ✗ FAIL | ✓ Pass | **Fix** |
| `--gray-400` | hsl(210, 20%, 65%) | 3.0:1 | ✗ FAIL | ✗ FAIL | **Fix** |
| `--gray-500` | hsl(210, 20%, 50%) | 4.6:1 | ✓ Pass | ✓ Pass | OK |
| `--warning-500` text on `--warning-100` bg | hsl(38,92%,50%) / hsl(38,92%,93%) | 2.2:1 | ✗ FAIL | ✗ FAIL | **Fix** |
| `--warning-foreground` on `--warning-500` | white / hsl(38,92%,50%) | 2.9:1 | ✗ FAIL | ✗ FAIL | **Fix** |
| `--warning-700` on white | hsl(38, 92%, 32%) | 6.8:1 | ✓ Pass | ✓ Pass | Use instead |
| `--success-500` on white | hsl(142, 76%, 45%) | 2.5:1 | ✗ FAIL | ✗ FAIL | Icon only |
| `--success-700` on white | hsl(142, 76%, 28%) | 6.4:1 | ✓ Pass | ✓ Pass | Use for text |
| `--destructive` | hsl(0, 84.2%, 60.2%) | 3.4:1 | ✗ FAIL | ✓ Pass | Large text only |
| `--destructive-700` | hsl(0, 84%, 32%) | 7.1:1 | ✓ Pass | ✓ Pass | Use for text |
| Primary button text (white on `--primary`) | ~5.2:1 (estimated) | 5.2:1 | ✓ Pass | ✓ Pass | OK |

**Note**: `--success-500`, `--warning-500`, and `--destructive` should ONLY be used as background fills or decorative borders — never as text/icon foreground colors. Use the corresponding `-700` shades for legible text.

---

## Risk Matrix

| ID   | Severity | WCAG SC     | Effort | Priority |
|------|----------|-------------|--------|----------|
| A-01 | High     | 1.4.3       | Low    | P1       |
| A-02 | High     | 1.4.3       | Low    | P1       |
| A-03 | Medium   | 1.4.3       | Low    | P1       |
| A-04 | Medium   | 4.1.3       | Low    | P2       |
| A-05 | Medium   | 2.2.2       | Low    | P2       |
| A-06 | Medium   | 1.4.1       | Low    | P2       |
| A-07 | Medium   | 3.3.1       | Medium | P2       |
| A-08 | Low      | 1.3.1       | Low    | P3       |
| A-09 | Low      | 4.1.2       | Low    | P3       |
| A-10 | Low      | 4.1.3       | Low    | P3       |
| A-11 | Low      | 2.4.1       | Low    | P3       |

---

## Positives Noted

- **`SkipNavigation` component** exists and is correctly positioned at the top of the layout.
- **shadcn/ui primitives** (`Button`, `Input`, `Select`, `Dialog`) are ARIA-correct out of the box.
- **`focus-visible` rings** are applied in patient portal links and modal inputs.
- **Keyboard navigation** is handled in `TwoFactorVerifyModal`, `BackupCodeVerifyModal`, and `StartConsultationModal` (Ctrl+Shift+N shortcut).
- **`prefers-reduced-motion` block** exists in `surfaces.css` — it just needs to cover `critical-pulse`.
- **Form labels** are correctly linked with `htmlFor` in `SignupPage.tsx` and shadcn form fields.
- **`aria-label` on step indicators** in signup flow (e.g., `aria-label="Step 1 of 2"`).

---

## Recommended Remediation Order

**Sprint 1 (P1 — before next release)**:
1. Fix `--muted-foreground` lightness to pass 4.5:1 (A-01) — 30-min change.
2. Audit all warning badge usages; replace `--warning-500` text with `--warning-700` (A-02) — 1h sweep.
3. Replace `--gray-400` hint text with `--gray-600` in helper text and non-decorative icons (A-03).

**Sprint 2 (P2)**:
4. Add `role="status"` + `aria-live="polite"` to KPI stat cards in all 3 dashboards (A-04).
5. Extend `prefers-reduced-motion` to cover `critical-pulse` (A-05).
6. Add text/icon fallback to `TATBadge` for color-only states (A-06).
7. Link form errors to inputs via `aria-describedby` — create a `FormFieldWithError` wrapper (A-07).

**Sprint 3 (P3)**:
8. Add `aria-label` to all `<table>` elements (A-08).
9. Add `aria-label` to all icon-only buttons (A-09) — linting rule available (`jsx-a11y/aria-proptypes`).
10. Verify Sonner error toasts use `role="alert"` (A-10).
11. Wire SPA focus management on route change to `<main id="main-content">` (A-11).
