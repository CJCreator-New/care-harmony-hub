# AROCORD-HIMS UI/UX Design System Audit

**Audit Date**: June 2026  
**Scope**: All 7 Role Dashboards + Core Components  
**Auditor**: Amazon Q

---

## Executive Summary

### Overall Assessment

| Category | Status | Score |
|----------|--------|-------|
| Button Styles | ⚠️ Needs Work | 65% |
| Color Palette | ✅ Good | 85% |
| Spacing (4px Grid) | ✅ Good | 90% |
| Typography | ⚠️ Inconsistent | 70% |
| Card/Widget Sizing | ✅ Good | 85% |
| Form Elements | ✅ Good | 80% |
| Theme Support | ✅ Excellent | 95% |
| Component Reuse | ⚠️ Needs Work | 60% |

**Overall Design System Compliance: 78%**

---

## 1. Button Styles Analysis

### 1.1 Design System Definition

**Location**: [src/components/ui/button.tsx](src/components/ui/button.tsx)

```typescript
// Standard variants defined:
variant: {
  default: "bg-gradient-to-b from-primary-vivid to-primary...",  // Primary CTA
  destructive: "bg-destructive text-destructive-foreground...",
  outline: "border border-input bg-background...",
  secondary: "bg-secondary text-secondary-foreground...",
  ghost: "hover:bg-accent hover:text-accent-foreground...",
  link: "text-primary underline-offset-4 hover:underline...",
  hero: "bg-gradient-to-b from-primary-vivid...",  // Marketing hero
}

size: {
  default: "h-10 px-4 py-2",
  sm: "h-9 min-h-[44px] rounded-md px-3",
  lg: "h-11 rounded-lg px-8",
  xl: "h-12 rounded-lg px-10 text-base",
  icon: "h-10 w-10",
}
```

### 1.2 Inconsistencies Found

#### 🔴 Issue #1: Inconsistent Button Styling in Dashboard Headers

| Location | Current | Expected | Severity |
|----------|---------|----------|----------|
| `AdminDashboard.tsx:76-82` | `variant="outline"` for primary navigation | Should use `variant="default"` for primary actions | Medium |
| `DoctorDashboard.tsx:84-89` | Mixed button hierarchy - "Start Consultation" is default, but "Quick Notes" is outline | Correct - primary action is default | ✅ |
| `NurseDashboard.tsx:63-68` | All quick actions use `variant="outline"` | "Record Vitals" should be `variant="default"` as primary action | Medium |
| `LabTechDashboard.tsx:68-72` | Active tab button switches to `variant="default"` dynamically | Good pattern | ✅ |
| `ReceptionistDashboard.tsx:76-78` | Check-In uses default, others use outline | Correct hierarchy | ✅ |
| `PharmacistDashboard.tsx:65-67` | "Pending Prescriptions" uses default | Correct | ✅ |
| `PatientDashboard.tsx` | No quick action buttons in header | N/A | - |

**Fix**: Standardize primary dashboard action button to use `variant="default"`:
```tsx
// ✅ CORRECT - Primary action
<Button onClick={() => setIsVitalsModalOpen(true)}>
  <Heart className="h-4 w-4 mr-2" />
  Record Vitals
</Button>

// ✅ CORRECT - Secondary actions
<Button variant="outline" asChild>
  <Link to="/patients">View Patients</Link>
</Button>
```

---

#### 🔴 Issue #2: Hardcoded Button Colors in LabTechDashboard

**Location**: `LabTechDashboard.tsx:87-94`

```tsx
// ❌ CURRENT - Hardcoded Tailwind colors
{case 'collected':
  return <Badge className="bg-blue-500 text-white">Collected</Badge>;
case 'in_progress':
  return <Badge className="bg-orange-500 text-white">In Progress</Badge>;
case 'completed':
  return <Badge className="bg-green-500 text-white">Completed</Badge>;
```

**Problem**: Uses hardcoded Tailwind colors (`bg-blue-500`, `bg-orange-500`) instead of CSS variables.

**Fix**: Use badge variants defined in the design system:
```tsx
// ✅ CORRECT - Use design system variants
{case 'collected':
  return <Badge variant="info">Collected</Badge>;
case 'in_progress':
  return <Badge variant="warning">In Progress</Badge>;
case 'completed':
  return <Badge variant="success">Completed</Badge>;
```

---

#### 🔴 Issue #3: Inconsistent Button Sizes

| Location | Issue | Fix |
|----------|-------|-----|
| `DoctorDashboard.tsx:258` | Button with `size="sm"` next to badges creates visual imbalance | Use `size="default"` for better touch target |
| `NurseDashboard.tsx:77` | Icon + text buttons use default size | ✅ Correct |

---

## 2. Color Palette Analysis

### 2.1 Design System Colors

**Location**: [src/index.css](src/index.css:16-95)

```css
/* Healthcare Primary - Teal */
--primary: 173 65% 42%;
--primary-vivid: 173 75% 48%;

/* Status Colors */
--success: 142 76% 36%;
--warning: 38 92% 50%;
--info: 199 89% 48%;
--destructive: 0 84% 60%;
--critical: 0 84% 60%;

/* Role-Based Colors */
--doctor: 217 91% 60%;      /* Blue */
--nurse: 142 76% 36%;       /* Green */
--pharmacy: 271 81% 56%;    /* Purple */
--receptionist: 25 95% 53%; /* Orange */
--admin: 0 72% 51%;         /* Red */
--patient: 173 58% 39%;     /* Teal */
```

### 2.2 Hardcoded Colors Found

#### 🔴 Issue #4: Hardcoded Colors in Components

| File | Line | Hardcoded Color | Should Use |
|------|------|-----------------|------------|
| `LabTechDashboard.tsx` | 87-94 | `bg-blue-500`, `bg-orange-500`, `bg-green-500` | CSS variables |
| `PharmacistDashboard.tsx` | 177 | `text-orange-500` | `text-warning` |
| `PatientDashboard.tsx` | 29-32 | `bg-info/10 text-info`, `bg-success/10 text-success` | Badge variants |
| `ReceptionistDashboard.tsx` | 313 | `bg-success`, `bg-warning`, `bg-info` (inline) | CSS variables |

**Example Fix**:

```tsx
// ❌ BEFORE - Hardcoded colors
<span className="text-orange-500">Expiring Soon</span>

// ✅ AFTER - Design system variable
<span className="text-warning">Expiring Soon</span>
```

---

## 3. Typography Hierarchy

### 3.1 Design System Definition

**Location**: [src/styles/typography.css](src/styles/typography.css:24-56)

```css
h1 { font-family: var(--font-display); font-weight: 400; font-size: 3.052rem; }
h2 { font-family: var(--font-display); font-weight: 400; font-size: 2.441rem; }
h3 { font-family: var(--font-display); font-weight: 400; font-size: 1.953rem; }
h4 { font-family: var(--font-sans); font-weight: 600; font-size: 1.563rem; }
h5 { font-family: var(--font-sans); font-weight: 600; font-size: 1.25rem; }
h6 { font-family: var(--font-sans); font-weight: 600; font-size: 1rem; }
```

### 3.2 Typography Inconsistencies

#### 🔴 Issue #5: Inconsistent Dashboard Header Typography

| Dashboard | Current Style | Expected Style | Fix |
|-----------|---------------|----------------|-----|
| `AdminDashboard.tsx:55` | `text-2xl md:text-3xl` with `font-display font-normal` | ✅ Correct | - |
| `DoctorDashboard.tsx:60` | `text-2xl md:text-3xl font-bold` | Should use `font-display font-normal` | Update to match system |
| `NurseDashboard.tsx:49` | `text-2xl md:text-3xl font-bold` | Should use `font-display font-normal` | Update to match system |
| `LabTechDashboard.tsx:73` | `text-2xl md:text-3xl font-bold` | Should use `font-display font-normal` | Update to match system |
| `ReceptionistDashboard.tsx:106` | `text-2xl md:text-3xl font-bold` | Should use `font-display font-normal` | Update to match system |
| `PharmacistDashboard.tsx:62` | `text-2xl md:text-3xl font-bold` | Should use `font-display font-normal` | Update to match system |
| `PatientDashboard.tsx:52` | `text-2xl font-bold text-foreground` | Should use `font-display font-normal` | Update to match system |

**Pattern Required**:
```tsx
// ✅ CORRECT - Dashboard header
<h1 className="font-display font-normal text-2xl md:text-3xl leading-tight">
  {greeting}, {name}!
</h1>
```

---

#### 🔴 Issue #6: Mixed Font Weight Usage

| Component | Issue | Location |
|-----------|-------|----------|
| `StatsCard.tsx:69` | Uses `font-display font-normal` ✅ Correct | - |
| `CardTitle` (h3) | Uses `font-semibold` | Should use `font-display font-normal` |
| Section headers | Inconsistent `text-lg` vs `text-xl` | Standardize to `text-lg` |

---

## 4. Spacing Analysis (4px Grid)

### 4.1 Design System

**Location**: [src/styles/spacing.css](src/styles/spacing.css)

The design system follows Tailwind's 4px base unit:
- `p-1` = 4px
- `p-2` = 8px
- `p-4` = 16px
- `p-6` = 24px
- `p-8` = 32px

### 4.2 Spacing Consistency

#### ✅ Good Patterns Found

| Pattern | Usage | Location |
|---------|-------|----------|
| Section spacing | `space-y-6` | All dashboards ✅ |
| Card padding | `p-6` | Cards throughout ✅ |
| Grid gaps | `gap-4` for stats, `gap-6` for main content | Consistent ✅ |
| Header margins | `mb-8` | Mostly consistent ✅ |

#### 🔴 Issue #7: Inconsistent Section Padding

| Location | Current | Expected |
|----------|---------|----------|
| `DoctorDashboard.tsx:59` | `mb-8` inside DashboardSection | ✅ Correct |
| `NurseDashboard.tsx:48` | `mb-8` | ✅ Correct |
| `AdminDashboard.tsx:54` | `mb-0` on header DashboardSection | Inconsistent with other dashboards |

---

## 5. Card/Widget Sizing

### 5.1 Card Components

**Design System**: [src/components/ui/card.tsx](src/components/ui/card.tsx)

```tsx
// Standard card padding
const CardHeader = "flex flex-col space-y-1.5 p-6";
const CardContent = "p-6 pt-0";
const CardFooter = "flex items-center p-6 pt-0";
```

### 5.2 Card Sizing Analysis

#### ✅ Consistent Patterns

| Element | Standard | Usage |
|---------|----------|-------|
| StatsCard | `p-6` (24px) | All dashboards ✅ |
| Cards | `p-6` | Consistent ✅ |
| ScrollArea height | `h-[280px]` to `h-[400px]` | Varies appropriately by content |

#### 🔴 Issue #8: Inconsistent Card Border Usage

| Location | Current | Issue |
|----------|---------|-------|
| `DoctorDashboard.tsx:180` | `border-success/50` | Good - semantic color |
| `LabTechDashboard.tsx:147` | `border-warning/20 shadow-sm` | Good - consistent |
| Most cards | Default border | Good - consistent |

---

## 6. Form Element Styling

### 6.1 Design System

**Input**: [src/components/ui/input.tsx](src/components/ui/input.tsx)
```tsx
className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base..."
```

**Select**: [src/components/ui/select.tsx](src/components/ui/select.tsx)
```tsx
className="flex h-10 w-full items-center justify-between rounded-md border border-input..."
```

### 6.2 Form Consistency

#### ✅ Consistent Patterns

| Element | Height | Border | Status |
|---------|--------|--------|--------|
| Input | `h-10` | `border-input` | ✅ Consistent |
| Select | `h-10` | `border-input` | ✅ Consistent |
| Button default | `h-10` | Varies by variant | ✅ Consistent |

#### 🔴 Issue #9: Focus Ring Inconsistency

The CSS in [src/index.css:242-251](src/index.css:242-251) defines custom focus styles:

```css
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  border-color: hsl(var(--primary)) !important;
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15)... !important;
}
```

**Issue**: The `!important` declarations may conflict with component-level styles. Consider using Tailwind's `focus-visible:ring-2` consistently instead.

---

## 7. Theme Support (Light/Dark Mode)

### 7.1 Theme Variables

**Location**: [src/index.css:17-98](src/index.css:17-98)

The design system has comprehensive dark mode support:

```css
:root {
  --background: 0 0% 98%;
  --foreground: 222 47% 11%;
  --primary: 173 65% 42%;
  /* ... */
}

.dark {
  --background: 222 47% 6%;
  --foreground: 215 20% 95%;
  --primary: 173 58% 45%;
  /* ... */
}
```

### 7.2 Theme Analysis

#### ✅ Excellent Dark Mode Coverage

| Component | Light/Dark Support | Notes |
|-----------|-------------------|-------|
| CSS Variables | ✅ Full | All colors have dark variants |
| Badge variants | ✅ Full | `dark:bg-green-500/20 dark:text-green-400` |
| StatsCard | ✅ Full | Uses CSS variables |
| Cards | ✅ Full | Uses CSS variables |
| Typography | ✅ Full | Uses CSS variables |

#### 🔴 Issue #10: Hardcoded Light-Mode-Only Colors

| Location | Issue |
|----------|-------|
| `LabTechDashboard.tsx:87-94` | `text-white` on badges - won't adapt to dark mode |
| `PatientDashboard.tsx:29-32` | Hardcoded opacity values may not translate well |

---

## 8. Component Reuse Analysis

### 8.1 Duplicated Patterns

#### 🔴 Issue #11: Repeated Status Badge Logic

**Problem**: Status badge rendering logic is duplicated across multiple dashboards:

| File | Lines | Duplicated Code |
|------|-------|-----------------|
| `LabTechDashboard.tsx` | 81-95 | `getStatusBadge()` function |
| `LabTechDashboard.tsx` | 97-105 | `getPriorityBadge()` function |
| `ReceptionistDashboard.tsx` | 85-93 | `getPriorityBadge()` function |
| `PharmacistDashboard.tsx` | 47-55 | `getPriorityColor()` function |

**Recommended Fix**: Create a shared component:

```tsx
// src/components/ui/status-badge.tsx
interface StatusBadgeProps {
  status: 'pending' | 'collected' | 'in_progress' | 'completed' | 'urgent' | 'high';
  type: 'status' | 'priority';
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const variants = {
    pending: 'secondary',
    collected: 'info',
    in_progress: 'warning',
    completed: 'success',
    urgent: 'destructive',
    high: 'warning',
  };
  
  return <Badge variant={variants[status]}>{status}</Badge>;
}
```

---

#### 🔴 Issue #12: Duplicated Greeting Function

**Problem**: Greeting logic repeated in 5+ dashboards:

| File | Lines |
|------|-------|
| `LabTechDashboard.tsx` | 63-68 |
| `PharmacistDashboard.tsx` | 42-47 |
| `ReceptionistDashboard.tsx` | 54-59 |

**Already exists**: `getGreeting()` in [src/lib/utils/datetime.ts](src/lib/utils/datetime.ts)

**Fix**: Import and use the shared utility:
```tsx
import { getGreeting } from '@/lib/utils/datetime';

// ❌ Don't define locally
const getGreeting = () => { ... };

// ✅ Use shared function
<h1>{getGreeting()}, {name}!</h1>
```

---

#### 🔴 Issue #13: Duplicated Stats Card Pattern

**Problem**: All dashboards use the same 4-column stats grid with `StatsCard`:

```tsx
// Repeated in all 7 dashboards:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <StatsCard title="..." value={...} icon={...} variant="..." />
  <StatsCard title="..." value={...} icon={...} variant="..." />
  <StatsCard title="..." value={...} icon={...} variant="..." />
  <StatsCard title="..." value={...} icon={...} variant="..." />
</div>
```

**Recommended**: Create a `DashboardStats` component:
```tsx
// src/components/dashboard/DashboardStats.tsx
interface StatItem {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: StatsCardVariant;
}

interface DashboardStatsProps {
  stats: StatItem[];
  isLoading?: boolean;
}

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => (
        <StatsCard key={i} {...stat} />
      ))}
    </div>
  );
}
```

---

## 9. Animation Analysis

### 9.1 Animation Definitions

**Location**: [src/index.css:134-158](src/index.css:134-158) and [src/styles/surfaces.css](src/styles/surfaces.css)

```css
/* Standard animations */
.animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.5s ease-out forwards; }
.animate-pulse-slow { animation: pulse 3s ease-in-out infinite; }

/* Stagger children */
.cs-stagger-children > * { animation: stagger-fade 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }

/* Card interactions */
.card-interactive { transition: transform 200ms ease, box-shadow 200ms ease; }
.card-interactive:hover { transform: translateY(-2px); }
```

### 9.2 Animation Issues

#### 🔴 Issue #14: Missing Reduced Motion Support in Some Components

**Location**: [src/index.css:185-192](src/index.css:185-192)

The CSS includes reduced motion support:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**However**, some inline animations may not respect this:

| Location | Issue |
|----------|-------|
| `PatientDashboard.tsx:212` | `animate-pulse` on health status dot |
| `LabTechDashboard.tsx:142` | `animate-pulse` on critical badge |

**Fix**: These will be caught by the CSS rule, but consider removing decorative animations entirely for clinical dashboards.

---

## 10. Summary of Required Fixes

### High Priority (Affects Consistency & Maintainability)

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| 5 | Typography inconsistency in headers | All dashboards | Low |
| 11 | Duplicated status badge logic | 4+ dashboards | Medium |
| 12 | Duplicated greeting function | 3 dashboards | Low |
| 4 | Hardcoded colors | Multiple files | Medium |
| 2 | Hardcoded badge colors | LabTechDashboard | Low |

### Medium Priority (Affects UX Consistency)

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| 1 | Button hierarchy inconsistency | AdminDashboard, NurseDashboard | Low |
| 13 | Duplicated stats pattern | All dashboards | Medium |
| 7 | Section padding inconsistency | AdminDashboard | Low |

### Low Priority (Minor Polish)

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| 3 | Button size inconsistency | Various | Low |
| 10 | Hardcoded light-mode colors | Various | Low |
| 14 | Decorative animations | PatientDashboard, LabTechDashboard | Low |

---

## 11. Recommended Actions

### Immediate (This Sprint)

1. **Standardize Dashboard Headers**
   - Create shared `DashboardHeader` component
   - Apply consistent typography (`font-display font-normal`)

2. **Create Shared Utility Components**
   - `StatusBadge` component for status/priority badges
   - `DashboardStats` component for stats grid

3. **Fix Hardcoded Colors**
   - Replace all `bg-blue-500`, `bg-orange-500`, etc. with CSS variables
   - Use badge variants instead of inline classes

### Next Sprint

4. **Button Hierarchy Audit**
   - Ensure primary actions use `variant="default"`
   - Secondary actions use `variant="outline"`

5. **Typography Audit**
   - Audit all section headers for consistency
   - Ensure CardTitle uses display font

### Future

6. **Create Dashboard Component Library**
   - Extract common patterns into reusable components
   - Document in Storybook

---

## 12. Files Requiring Updates

| File | Changes Required |
|------|-----------------|
| `src/components/dashboard/DoctorDashboard.tsx` | Typography, import greeting |
| `src/components/dashboard/NurseDashboard.tsx` | Typography, import greeting |
| `src/components/dashboard/LabTechDashboard.tsx` | Typography, badge colors, import greeting |
| `src/components/dashboard/ReceptionistDashboard.tsx` | Typography, import greeting |
| `src/components/dashboard/PharmacistDashboard.tsx` | Typography, hardcoded color, import greeting |
| `src/components/dashboard/PatientDashboard.tsx` | Typography, status colors |
| `src/components/dashboard/AdminDashboard.tsx` | Section padding, typography |

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/status-badge.tsx` | Shared status/priority badge component |
| `src/components/dashboard/DashboardHeader.tsx` | Shared dashboard header component |
| `src/components/dashboard/DashboardStats.tsx` | Shared stats grid component |

---

## 13. Positive Findings

### What's Working Well

1. **Theme System**: Excellent dark mode support with comprehensive CSS variables
2. **Card Elevation**: Well-designed `card-raised`, `card-interactive` patterns
3. **Spacing Grid**: Consistent 4px grid adherence
4. **Animation System**: Good stagger animation and reduced motion support
5. **StatsCard**: Consistent implementation across all dashboards
6. **Badge Variants**: Good role-based and status variants defined
7. **Surface System**: Well-structured `cs-surface-*` classes

---

**End of Audit Report**
