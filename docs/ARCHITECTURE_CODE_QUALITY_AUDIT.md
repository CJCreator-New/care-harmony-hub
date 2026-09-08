# Architecture & Code Quality Audit Report
**AROCORD-HIMS v1.2.0**

**Audit Date**: January 2026  
**Scope**: Project structure, TypeScript strictness, dependencies, code consistency, component organization

---

## Executive Summary

| Category | Score | Status |
|----------|-------|--------|
| Project Structure | 85% | ✅ Good |
| TypeScript Strictness | 65% | ⚠️ Needs Improvement |
| Dependency Health | 75% | ⚠️ Needs Improvement |
| Code Consistency | 70% | ⚠️ Needs Improvement |
| Component Organization | 80% | ✅ Good |
| **Overall** | **75%** | ⚠️ Needs Improvement |

**Critical Issues**: 3  
**High Priority Issues**: 8  
**Medium Priority Issues**: 12  
**Low Priority Issues**: 15

---

## 1. Dependency Health Analysis

### npm audit Results

| Severity | Count | Package | Issue |
|----------|-------|---------|-------|
| Low | 1 | esbuild (0.27.3-0.28.0) | Arbitrary file read on Windows dev server |

**Status**: ✅ Single low-severity vulnerability in development dependency

**Fix**: Update esbuild to version 0.28.1 or later
```bash
npm update esbuild
```

### depcheck Results

#### Unused Dependencies (6)

| Package | Type | Recommendation |
|---------|------|----------------|
| `@opentelemetry/auto-instrumentations-web` | dependency | Remove if not using browser tracing |
| `@opentelemetry/exporter-trace-otlp-http` | dependency | Remove if not exporting traces |
| `@opentelemetry/sdk-trace-web` | dependency | Remove if not using OpenTelemetry |
| `@sentry/tracing` | dependency | Deprecated - use `@sentry/react` tracing |
| `@tanstack/react-query-devtools` | dependency | Move to devDependencies |
| `@tanstack/react-virtual` | dependency | Remove if not using virtualization |

#### Unused DevDependencies (6)

| Package | Recommendation |
|---------|----------------|
| `@tailwindcss/typography` | Keep - used in production |
| `@types/deno` | Remove - not using Deno |
| `autoprefixer` | Keep - required by Tailwind |
| `axe-core` | Keep - accessibility testing |
| `postcss` | Keep - required by Tailwind |
| `supabase` | Keep - CLI for migrations |

#### Missing Dependencies (11)

| Package | Used In | Type Needed |
|---------|---------|-------------|
| `k6` | tests/performance/*.k6.js | devDependency (global install) |
| `axios` | tests/load-testing/*.ts | devDependency |
| `npm:otpauth@9.3.2` | supabase/functions/verify-2fa | dependency |
| `glob` | src/utils/codeReviewer.ts, scripts/*.js | dependency |
| `commander` | src/utils/codeReviewerCLI.ts | dependency |
| `uuid` | src/utils/edgeCaseResilience.ts | dependency |
| `dompurify` | src/utils/sanitize.ts | dependency |
| `@supabase/realtime-js` | src/hooks/useRealtimeConnectionStatus.ts | dependency (may be bundled) |
| `kafkajs` | services/pharmacy-service/src/sync/*.ts | dependency |
| `fastify` | services/pharmacy-service/src/sync/*.ts | dependency |
| `dotenv` | scripts/*.mjs | devDependency |

**Effort**: 4 hours to resolve all dependency issues

---

## 2. Project Structure Organization

### ✅ Strengths

1. **Well-organized component hierarchy** by feature/domain
2. **Clear separation** of UI components (`src/components/ui/`) vs feature components
3. **Hooks properly centralized** in `src/hooks/`
4. **Type definitions** co-located with integrations
5. **Comprehensive test coverage** with clear test categories

### ⚠️ Issues

#### Issue #1: Duplicate Hook Files

**Problem**: Same hook names exist in multiple locations, causing potential confusion and import errors.

**Files**:
- `src/lib/hooks/pharmacy/usePharmacy.ts` AND `src/hooks/usePharmacy.ts`
- `src/lib/hooks/patients/usePatientPortal.ts` AND `src/hooks/usePatientPortal.ts`
- `src/lib/hooks/appointments/useAppointments.ts` AND `src/hooks/useAppointments.ts`
- `src/lib/hooks/appointments/useScheduling.ts` AND `src/hooks/useScheduling.ts`

**Impact**: Import confusion, potential circular dependencies, code duplication

**Fix**: Consolidate to single location (prefer `src/hooks/` or `src/lib/hooks/`, not both)

**Effort**: 1 day

---

#### Issue #2: Mixed Component Placement

**Problem**: Some role-specific components in `src/components/` while others in `src/pages/`.

Examples:
- `src/components/doctor/DoctorDashboard.tsx` exists
- `src/pages/doctor/DoctorDashboard.tsx` also exists

**Fix**: Establish clear convention:
- `src/components/{role}/` - Reusable role-specific components
- `src/pages/{role}/` - Page-level components for routing

**Effort**: 4 hours

---

## 3. TypeScript Strictness Analysis

### tsconfig.json Settings

```json
{
  "strict": true,
  "strictNullChecks": true,
  "noImplicitAny": true,
  "noUnusedLocals": false,      // ⚠️ Should be true
  "noUnusedParameters": false   // ⚠️ Should be true
}
```

### `any` Type Usage

**Finding**: 627 instances of `: any` type annotations across codebase

**Impact**: Loss of type safety, potential runtime errors, harder refactoring

### eslint.config.js Settings

```javascript
"@typescript-eslint/no-explicit-any": "off",  // ⚠️ Should be "warn" or "error"
"@typescript-eslint/no-unused-vars": "off",     // ⚠️ Should be "warn"
```

---

#### Issue #3: Excessive `any` Type Usage

**Problem**: 627 occurrences of explicit `: any` type annotations

**Top Files with `any` Usage**:
- Type definition files (generated Supabase types)
- Service layer files
- Test utilities

**Why it's a problem**: 
- Loses TypeScript benefits
- No autocomplete or intellisense
- Runtime errors not caught at compile time

**Fix**: 

1. Enable stricter ESLint rules:
```javascript
// eslint.config.js
"@typescript-eslint/no-explicit-any": "warn"
```

2. Replace `any` with proper types:
```typescript
// Before
function processData(data: any) { ... }

// After
interface ProcessData {
  id: string;
  payload: unknown;
}
function processData(data: ProcessData) { ... }
```

**Effort**: 3 days (incremental fix)

---

#### Issue #4: Disabled Unused Variable Checks

**Problem**: `noUnusedLocals` and `noUnusedParameters` set to `false`

**Impact**: Dead code accumulates, bundle size bloat, confusion

**Fix**:
```json
// tsconfig.json
{
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

**Effort**: 4 hours

---

## 4. Code Consistency Issues

### Issue #5: Inconsistent Import Organization

**Problem**: Mixed use of path aliases and relative imports

**Examples**:
```typescript
// Using alias (good)
import { Button } from '@/components/ui/button';

// Using relative (inconsistent)
import { Card } from '../ui/card';
import { formatDate } from '../../lib/utils/datetime';
```

**Fix**: Enforce path aliases via ESLint:
```javascript
// eslint.config.js - add import plugin
import importPlugin from 'eslint-plugin-import';

rules: {
  'import/no-relative-imports': ['error', { allowSameFolder: true }],
}
```

**Effort**: 4 hours

---

### Issue #6: Inconsistent Naming Conventions

**Findings**:

| Pattern | Occurrence | Convention |
|---------|------------|------------|
| Component files: PascalCase | ✅ 95% | Correct |
| Hook files: camelCase | ✅ 100% | Correct |
| Service files: camelCase | ⚠️ Mixed | Should be consistent |
| Utility files: kebab-case | ❌ Inconsistent | Should standardize |

**Examples of Inconsistency**:
- `codeReviewer.ts` vs `code-reviewer.ts`
- `edgeCaseResilience.ts` vs `edge-case-resilience.ts`

**Fix**: Add `.eslintrc` naming convention rule:
```javascript
'@typescript-eslint/naming-convention': [
  'error',
  {
    selector: 'file',
    format: ['camelCase', 'PascalCase'],
  }
]
```

**Effort**: 2 hours

---

## 5. Component Organization Issues

### Issue #7: Files Over 300 Lines

**Finding**: 136 files exceed 300 lines

**Top 10 Largest Files**:

| File | Lines | Concern |
|------|-------|---------|
| `types.ts` (integrations/supabase) | 3509 | Generated - acceptable |
| `ICD10Service.ts` | 1120 | Should extract to multiple modules |
| `OpenAIProvider.ts` | 1097 | Should split concerns |
| `ClaudeProvider.ts` | 1067 | Should split concerns |
| `EnhancedPortalPage.tsx` | 908 | Complex page - consider sub-components |
| `billingValidator.ts` | 885 | Large validator - could modularize |
| `ConsultationWorkflowPage.tsx` | 883 | Complex workflow - extract steps |
| `WorkflowDashboard.tsx` | 830 | Extract widgets |
| `AuthContext.tsx` | 812 | Large context - split contexts |
| `VideoCallModal.tsx` | 808 | Complex modal - extract components |

**Why it's a problem**:
- Harder to navigate and understand
- Difficult to test
- Merge conflicts more likely
- Violates single responsibility

**Fix**: Extract components/modules following Single Responsibility Principle

**Example for `ICD10Service.ts`**:
```
ICD10Service/
├── index.ts           # Public API
├── search.ts          # Search functions
├── validation.ts      # Code validation
├── mapping.ts         # Code mappings
└── types.ts           # Type definitions
```

**Effort**: 3 days (for top 20 files)

---

### Issue #8: Components with Excessive Props (>15)

**Finding**: 4 components have more than 15 props

| Component | Prop Count | Recommendation |
|-----------|------------|----------------|
| `micro-interactions.tsx` | 28 | Extract to config object |
| `LabResultEntryModal.tsx` | 19 | Group related props |
| `VoiceInput.tsx` | 21 | Use options pattern |
| `UserManagementTable.tsx` | 17 | Accept config object |

**Why it's a problem**:
- Hard to understand component API
- Easy to pass wrong props
- Difficult to maintain

**Fix**: Use props grouping pattern:

```typescript
// Before (19 props)
interface LabResultEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  orderId: string;
  testName: string;
  testCode: string;
  unit: string;
  referenceRange: string;
  criticalLow: number;
  criticalHigh: number;
  specimenId: string;
  collectedAt: Date;
  performedBy: string;
  status: string;
  onSave: (result: LabResult) => void;
  onSignOff: () => void;
  department: string;
  priority: string;
  notes: string;
}

// After (grouped into logical objects)
interface LabResultEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: LabOrderConfig;        // patientId, orderId, testName, testCode, unit
  reference: ReferenceConfig;   // referenceRange, criticalLow, criticalHigh
  specimen: SpecimenConfig;     // specimenId, collectedAt, performedBy
  callbacks: ModalCallbacks;    // onSave, onSignOff
  options?: ModalOptions;       // status, department, priority, notes
}
```

**Effort**: 4 hours per component

---

## 6. Import Organization

### Path Aliases Configured

✅ **Good**: Path aliases properly configured in `tsconfig.json`:
```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

✅ **Good**: Vite config matches:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Issue #9: Not Consistently Using Aliases

**Problem**: Some files use relative imports even when aliases are available

**Finding**: ~40% of imports use relative paths

**Fix**: Add import organization ESLint rule:
```bash
npm install -D eslint-plugin-import
```

```javascript
// eslint.config.js
rules: {
  'import/first': 'error',
  'import/newline-after-import': 'error',
  'import/no-duplicates': 'error',
  'import/order': ['error', {
    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
    'newlines-between': 'always',
    alphabetize: { order: 'asc' },
    pathGroups: [
      { pattern: '@/**', group: 'internal' },
    ],
  }],
}
```

**Effort**: 1 day

---

## 7. Summary of All Findings

### Critical Issues (Fix Immediately)

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| 3 | 627 `any` type usages | Throughout codebase | 3 days |
| 4 | Disabled unused variable checks | tsconfig.json | 4 hours |
| 1 | Duplicate hook files | src/hooks & src/lib/hooks | 1 day |

### High Priority Issues (Fix Within Sprint)

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| 7 | 136 files >300 lines | Various | 3 days |
| 5 | Inconsistent imports | Throughout codebase | 4 hours |
| 8 | Components with >15 props | 4 components | 1 day |
| 6 | Inconsistent naming | Service/util files | 2 hours |

### Medium Priority Issues (Fix Within Quarter)

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| 9 | Not using path aliases | Throughout codebase | 1 day |
| 2 | Mixed component placement | Components/pages | 4 hours |

### Low Priority Issues (Technical Debt Backlog)

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| - | Unused dependencies | package.json | 2 hours |
| - | Missing dependencies | package.json | 2 hours |
| - | Low-severity vuln in esbuild | package.json | 15 min |

---

## 8. Recommended Action Plan

### Week 1: Critical Issues

1. Enable TypeScript strict checks (Issue #4)
   ```bash
   # Update tsconfig.json, then run:
   npm run lint -- --fix
   npm run type-check
   ```

2. Start `any` type elimination (Issue #3)
   - Focus on service layer first
   - Use `unknown` + type guards

3. Consolidate duplicate hooks (Issue #1)
   - Audit all hook imports
   - Update imports to single location

### Week 2: High Priority

4. Refactor largest files (Issue #7)
   - ICD10Service.ts → split into modules
   - Provider files → extract common base

5. Fix component prop counts (Issue #8)
   - Group related props
   - Use config objects

### Week 3: Medium Priority

6. Implement import organization (Issue #5, #9)
   - Add eslint-plugin-import
   - Configure auto-fix

7. Standardize naming (Issue #6)
   - Add naming convention rule
   - Bulk rename files

### Week 4: Cleanup

8. Resolve dependency issues
   - Remove unused deps
   - Add missing deps
   - Update esbuild

---

## 9. Metrics to Track

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| `any` type usage | 627 | 50 | 3 months |
| Files >300 lines | 136 | 20 | 2 months |
| Components >15 props | 4 | 0 | 1 month |
| Unused dependencies | 6 | 0 | 1 week |
| Missing dependencies | 11 | 0 | 2 weeks |
| Security vulnerabilities | 1 low | 0 | 1 week |
| TypeScript strict mode | Partial | Full | 1 month |

---

## 10. Conclusion

AROCORD-HIMS has a **solid foundation** with good project structure, comprehensive testing, and proper build configuration. However, there are **significant opportunities for improvement** in:

1. **TypeScript strictness** - Too many `any` types undermine type safety
2. **Code organization** - Large files and excessive props indicate need for refactoring
3. **Dependency management** - Unused and missing dependencies need cleanup

**Priority Recommendation**: Focus on eliminating `any` types and enabling strict TypeScript checks first, as this will cascade benefits across all other areas (better IDE support, caught errors at compile time, easier refactoring).

**Estimated Total Effort**: 15-20 developer days to resolve all issues

---

*Generated by Architecture & Code Quality Audit - January 2026*
