---
name: accessibility-audit
description: 'WCAG 2.1 AA accessibility audit for the CareSync clinical UI. Focused on form labels, keyboard navigation, color contrast for the 60+ status/role colors defined in src/styles/colors.css, screen reader compatibility, and reduced-motion support. Use when asked to audit accessibility, fix ARIA issues, check contrast, or verify keyboard navigation. Produces a structured gap report with WCAG criterion citations and remediation code.'
argument-hint: 'Scope: a specific component, page, or feature area (forms, modals, data tables, status badges, navigation). Optionally specify focus: labels | contrast | keyboard | screen-reader | motion.'
---

# CareSync — Accessibility Audit Skill

Audits the React/TypeScript/Tailwind/shadcn UI against WCAG 2.1 AA. Focused on the clinical context: status badges, data-dense tables, multi-step forms, and the 60+ color tokens in `src/styles/colors.css`.

## When to Use

- "Audit accessibility of [component/page]"
- "Fix ARIA issues in [component]"
- "Check color contrast for [status badges / role colors]"
- "Is [form] keyboard navigable?"
- "Check screen reader compatibility for [component]"

---

## Audit Domain 1 — Form Labels & Inputs
**WCAG**: 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value

| Signal | Issue | Fix |
|--------|-------|-----|
| `<input>` without `<label htmlFor>` or `aria-label` | Input has no accessible name | Add `<label htmlFor="id">` or `aria-label` |
| `<input id>` doesn't match any `<label htmlFor>` | Label not programmatically associated | Align `id` and `htmlFor` values |
| `<input placeholder>` used as the only label | Placeholder disappears on focus | Add visible `<label>` — placeholder is supplemental only |
| `<select>` without label | Dropdown has no accessible name | Same as input rule |
| `<textarea>` without label | Same | Same |
| Required field without `aria-required="true"` or `required` attribute | Screen reader can't announce required state | Add `required` or `aria-required="true"` |
| Error message not linked to input via `aria-describedby` | Error not announced on focus | `<input aria-describedby="field-error" />` + `<p id="field-error">` |
| `autoFocus` without `aria-live="assertive"` on error container | Errors not announced after focus shift | Add `role="alert"` or `aria-live="assertive"` to error container |

**Fix pattern:**
```tsx
<div>
  <label htmlFor="patient-dob">Date of Birth</label>
  <input
    id="patient-dob"
    type="date"
    required
    aria-required="true"
    aria-describedby="dob-error"
  />
  {error && <p id="dob-error" role="alert">{error}</p>}
</div>
```

---

## Audit Domain 2 — Color Contrast
**WCAG**: 1.4.3 Contrast (Minimum) — 4.5:1 for normal text, 3:1 for large text / UI components

CareSync has 60+ color tokens in `src/styles/colors.css`. The highest-risk combinations are light backgrounds with mid-tone text.

**Known risk pairs to check:**

| Token pair | Use case | Risk |
|------------|----------|------|
| `--warning-500` text on `--warning-100` bg | `.badge-warning` | ⚠️ Amber-on-light often fails 4.5:1 |
| `--success-500` text on `--success-100` bg | `.badge-success` | ⚠️ Mid-green on light green |
| `--info-500` text on `--info-100` bg | `.badge-info` | ⚠️ Mid-blue on light blue |
| `--muted-foreground` (`hsl(215.4, 16.3%, 46.9%)`) on white | Helper text, placeholders | ⚠️ ~3.9:1 — borderline |
| `--gray-400` on white | Disabled state text | ❌ Fails 4.5:1 |
| `--primary-300` on white | Light teal decorative text | ❌ Fails |

**Correct badge pattern** — use `-700` text on `-100` bg (already defined in `colors.css`):
```css
/* ✅ Already correct in colors.css — verify components use these classes */
.badge-warning  { background: var(--warning-100);  color: var(--warning-700); }
.badge-success  { background: var(--success-100);  color: var(--success-700); }
.badge-info     { background: var(--info-100);     color: var(--info-700); }
```

**Scan for violations:**
- Inline `text-warning-500` or `text-success-500` on light backgrounds — should be `-700`
- `text-muted-foreground` on `bg-muted` — verify contrast in both light and dark mode
- Status indicators that use color only (no icon or text label) — violates 1.4.1 Use of Color

**Dark mode** — `src/styles/colors.css` defines `--dark-*` overrides. Verify:
- `--dark-muted-foreground: hsl(215, 20.2%, 65.1%)` on `--dark-background: hsl(222.2, 84%, 4.9%)` ✅ passes
- `--dark-destructive: hsl(0, 62.8%, 30.6%)` on dark bg — check if used as text color (fails)

---

## Audit Domain 3 — Keyboard Navigation
**WCAG**: 2.1.1 Keyboard, 2.4.3 Focus Order, 2.4.7 Focus Visible

| Signal | Issue | Fix |
|--------|-------|-----|
| Interactive `<div>` or `<span>` without `tabIndex={0}` and `onKeyDown` | Not keyboard reachable | Use `<button>` instead, or add `role="button" tabIndex={0} onKeyDown` |
| Icon-only button without `aria-label` | No accessible name | `<button aria-label="Close dialog"><X /></button>` |
| Modal/dialog without focus trap | Tab escapes modal | Use `useFocusTrap` hook already at `src/hooks/useFocusTrap.ts` |
| Modal closes but focus doesn't return to trigger | Focus lost after close | Store trigger ref, call `triggerRef.current?.focus()` on close |
| Dropdown menu items not navigable with arrow keys | Keyboard users can't navigate | Use shadcn `DropdownMenu` which handles this via Radix |
| `tabIndex > 0` (positive tab index) | Disrupts natural tab order | Remove — use DOM order instead |
| Focus indicator overridden with `outline: none` without replacement | Focus invisible | `src/styles/accessibility.css` sets `*:focus-visible` — don't override without replacement |

**`useFocusTrap` is already implemented** at `src/hooks/useFocusTrap.ts`:
```tsx
const trapRef = useFocusTrap(isOpen);
<div ref={trapRef} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  ...
</div>
```

---

## Audit Domain 4 — Screen Reader Compatibility
**WCAG**: 4.1.2 Name, Role, Value; 4.1.3 Status Messages

| Signal | Issue | Fix |
|--------|-------|-----|
| Status badge with only color/icon, no text | Screen reader gets nothing | Add `<span className="sr-only">Status: Ready</span>` |
| Loading spinner without `aria-label` or `role="status"` | Spinner invisible to SR | `<div role="status" aria-label="Loading...">` |
| Dynamic content update (queue count, notification) without `aria-live` | SR doesn't announce change | `<div aria-live="polite" aria-atomic="true">{count}</div>` |
| `<table>` without `<caption>` or `aria-label` | Table purpose unclear | Add `<caption>` or `aria-label` on `<table>` |
| `<th>` without `scope` attribute | Column/row relationship unclear | `<th scope="col">` or `<th scope="row">` |
| Image without `alt` text | Image invisible to SR | Add descriptive `alt` or `alt=""` for decorative images |
| Icon component (`<LucideIcon />`) without `aria-hidden="true"` when decorative | SR reads icon name | `<Icon aria-hidden="true" />` for decorative icons |
| `<button>` containing only an icon component | No accessible name | `<button aria-label="Delete patient"><Trash2 aria-hidden="true" /></button>` |
| Toast/notification not announced | SR misses transient messages | `sonner` toasts are announced — verify `role="status"` on Toaster |

**`sr-only` class** is defined in `src/styles/accessibility.css` — use it for visually hidden but SR-readable text.

---

## Audit Domain 5 — Reduced Motion
**WCAG**: 2.3.3 Animation from Interactions (AAA, but best practice)

`src/styles/accessibility.css` already has:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Scan for:**
- Framer Motion animations without `useReducedMotion()` check — the hook exists at `src/hooks/useReducedMotion.ts`
- `animate` prop on `motion.div` without conditional based on reduced motion preference

**Fix pattern:**
```tsx
import { useReducedMotion } from '@/hooks/useReducedMotion';

const prefersReduced = useReducedMotion();

<motion.div
  animate={prefersReduced ? {} : { opacity: 1, y: 0 }}
  transition={prefersReduced ? { duration: 0 } : { duration: 0.35 }}
>
```

---

## Audit Procedure

### Step 1 — Scope
- **Single component**: read the file, run all 5 domains
- **Page**: read page + child components, prioritize Domain 1 (forms) + Domain 3 (keyboard)
- **Status badges / colors**: focus Domain 2 (contrast)
- **Modals / dialogs**: focus Domain 3 (focus trap) + Domain 4 (aria-modal)

### Step 2 — Write the Gap Report

Per finding:
```markdown
### [N]) [WCAG Criterion] — [One-line title]
- **Severity**: Critical (blocks access) | High (degrades access) | Medium (best practice gap)
- **WCAG**: [X.X.X] [Criterion Name] (Level A/AA)
- **File**: `relative/path/to/file.tsx:[line]`

#### Finding
[What the issue is and who it affects — screen reader users, keyboard-only users, low-vision users.]

#### Fix
[Minimal code change — show only the changed element, not the whole component.]
```

### Step 3 — Compliance Summary

```markdown
## Accessibility Summary
WCAG 2.1 AA compliance: [Passing / Partial / Failing]

Critical blockers (prevent access entirely):
- [list]

High priority (significantly degrades experience):
- [list]

Quick wins (< 5 min each):
- [list]
```

---

## Clinical UI Specifics

These patterns are common in CareSync and need extra attention:

| Pattern | What to check |
|---------|--------------|
| Patient status badges (`waiting`, `ready_for_doctor`, `in_consultation`, `completed`) | Color + text label both present; contrast ≥ 4.5:1 |
| Lab result severity indicators (`critical`, `high`, `normal`, `low`) | Not color-only; `aria-label` on icon |
| Vital signs data tables | `<th scope>`, `<caption>`, numeric cells have units in SR text |
| Prescription/medication lists | Row actions (edit/delete) have `aria-label` with patient/med context |
| Queue management cards | Live region for count updates; drag handles keyboard accessible |
| Notification bell dropdown | `aria-haspopup`, `aria-expanded`, focus returns on close |
| Date/time pickers | Keyboard navigable; `aria-label` on calendar grid cells |
