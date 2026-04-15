# Phase 4B: Frontend Performance Tests - Fix Guide

**Status:** 29/35 tests passing (83%)  
**Failing Tests:** 6  
**Target:** 35/35 (100%)  
**Estimated Effort:** 2-3 hours

---

## 📊 Current Status Summary

```
✅ Passing (29 tests):
- Bundle Size Analysis: 5/5
- Code Splitting Strategy: 3/6  ← 3 FAILING
- React Rendering Optimization: 3/6  ← 3 FAILING
- Web Vitals: 5/5
- Asset Optimization: 5/5
- Dependency Management: 4/5  ← 1 FAILING
- Build Optimization: 4/5  ← 1 FAILING

❌ Failing (6 tests):
1. PERF-SPLIT-004: Suspense boundaries guard lazy components
2. PERF-SPLIT-005: Chunks appropriately sized (50-500KB each)
3. PERF-RENDER-004: Virtual lists for large tables (react-window)
4. PERF-RENDER-005: No inline object/array literals in renders
5. PERF-DEP-002: Major dependencies kept up-to-date
6. PERF-BUILD-005: Cache busting via content hash
```

---

## 🎯 Fixes Required

### Fix 1: PERF-SPLIT-004 - Suspense Boundaries

**Issue:** Main app component doesn't use Suspense wrapper  
**Location:** `src/App.tsx` or route definitions  
**Fix:**

```typescript
// ❌ BEFORE - No Suspense
<BrowserRouter>
  <ErrorBoundary>
    <Routes>
      {renderRoutes()}
    </Routes>
  </ErrorBoundary>
</BrowserRouter>

// ✅ AFTER - With Suspense
import { Suspense, lazy } from 'react';

<BrowserRouter>
  <ErrorBoundary>
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {renderRoutes()}
      </Routes>
    </Suspense>
  </ErrorBoundary>
</BrowserRouter>
```

**Verification:**
```bash
npm run test:performance:frontend -- --reporter=verbose
# Look for: "FAIL PERF-SPLIT-004: Suspense boundaries guard lazy components"
```

**Expected Result:** Test checks for `/Suspense/` pattern in App component

---

### Fix 2: PERF-SPLIT-005 - Chunk Sizing

**Issue:** Lazy-loaded chunks not within 50-500KB range  
**Location:** `vite.config.ts` - rollup options  
**Fix:**

```typescript
// src/vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-lib': ['@/components/ui'],
          'clinic': ['@/routes/clinic'],
          'pharmacy': ['@/routes/pharmacy'],
          'laboratory': ['@/routes/laboratory'],
          'billing': ['@/routes/billing'],
          'admin': ['@/routes/admin'],
          'utilities': ['@tanstack/react-query', '@radix-ui/*'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});
```

**Verification:**
```bash
npm run build
# Check dist/assets/ - run chunks through size analyzer
# Each chunk should report size on console
```

**Expected Result:** All chunks between 50-500KB (gzipped)

---

### Fix 3: PERF-RENDER-004 - Virtual Lists

**Issue:** Large tables not using react-window virtualization  
**Package:** Already available as `react-window` (check package.json)  
**Location:** Large data tables (patients, consultations, etc.)  
**Fix:**

```typescript
// ❌ BEFORE - Renders all 100+ rows at once
export function PatientsList({ patients }: Props) {
  return (
    <table>
      <tbody>
        {patients.map(p => (
          <tr key={p.id}>
            <td>{p.name}</td>
            <td>{p.email}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ✅ AFTER - Uses react-window
import { FixedSizeList as List } from 'react-window';

export function PatientsList({ patients }: Props) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="table-row">
      <span>{patients[index].name}</span>
      <span>{patients[index].email}</span>
    </div>
  );

  return (
    <List
      height={600}
      itemCount={patients.length}
      itemSize={35}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

**Affected Components:**
- `PatientsView` - `/patients` page
- `AppointmentsList` - `/appointments` page
- `PrescriptionsList` - `/pharmacy/prescriptions` page
- `LabResultsList` - `/laboratory/results` page
- `InvoicesList` - `/billing/invoices` page

**Verification:**
```bash
# Search for large list renders
grep -r "\.map\(" src/routes --include="*.tsx" | grep -v "limited\|slice\|virtual"
```

---

### Fix 4: PERF-RENDER-005 - Inline Objects/Arrays

**Issue:** Objects/arrays created inline cause re-renders  
**Location:** Component render functions  
**Fix:**

```typescript
// ❌ BEFORE - Inline objects cause re-renders
export function PatientFilter() {
  return (
    <QueryInput
      filter={{ status: 'active', hospital_id: 'test' }}
      options={[
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ]}
    />
  );
}

// ✅ AFTER - Memoize or move outside
const DEFAULT_FILTER = { status: 'active', hospital_id: 'test' };
const FILTER_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

export function PatientFilter() {
  return (
    <QueryInput
      filter={DEFAULT_FILTER}
      options={FILTER_OPTIONS}
    />
  );
}

// Or use useMemo
export function PatientFilter() {
  const filter = useMemo(() => ({ status: 'active', hospital_id: 'test' }), []);
  const options = useMemo(() => [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ], []);

  return <QueryInput filter={filter} options={options} />;
}
```

**Finding Issues:**
```bash
# Search for inline objects in render
grep -r "=\s*{" src/routes --include="*.tsx" | grep -v "const\|let\|}"
# Look for render functions with { } immediately after JSX attributes
```

---

### Fix 5: PERF-DEP-002 - Major Dependencies Updated

**Issue:** Key packages are outdated  
**Current Versions:** Check `package.json` and `npm outdated`  
**Fix:**

```bash
# Check outdated packages
npm outdated

# Update major packages (if needed)
npm update react@latest react-dom@latest
npm update @tanstack/react-query@latest
npm update @radix-ui/react-* --save

# Or use npm-check-updates
npm i -g npm-check-updates
ncu -u  # Interactive update
npm install
```

**Critical Packages to Check:**
- react ^18.x
- react-dom ^18.x
- @tanstack/react-query ^5.x
- typescript ^5.x
- vite ^5.x

**Verification:**
```bash
npm run test:performance:frontend -- --reporter=verbose
# Look for PERF-DEP-002 assertion
```

---

### Fix 6: PERF-BUILD-005 - Cache Busting

**Issue:** Static assets not getting content hash for cache busting  
**Location:** `vite.config.ts` or `vite.config.production.ts`  
**Fix:**

```typescript
// vite.config.production.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Ensure content hashes are included
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});

// Verify in dist/ after build
// Expected: main-a1b2c3d4.js, chunk-x9y8z7.js, styles-e5f6g7.js
```

**Verification:**
```bash
npm run build

# Check generated files
ls dist/assets/

# All should have hash pattern: [name]-[hash].[ext]
# Example:
# ✅ main-a1b2c3d4.js
# ✅ chunk-clinic-e5f6g7.js
# ❌ main.js (no hash)
# ❌ chunk-1.js (no hash)
```

---

## 🚀 Implementation Plan

### Phase 1: Quick Wins (30 min)
1. ✅ Fix PERF-DEP-002 - Update dependencies
2. ✅ Fix PERF-BUILD-005 - Configure cache busting

### Phase 2: Code Changes (90 min)
3. ✅ Fix PERF-SPLIT-004 - Add Suspense wrapper
4. ✅ Fix PERF-RENDER-005 - Remove inline objects
5. ✅ Fix PERF-SPLIT-005 - Configure chunk sizing

### Phase 3: Component Refactoring (60 min)
6. ✅ Fix PERF-RENDER-004 - Add virtual lists to tables

---

## 🧪 Testing Strategy

### Before Each Fix
```bash
npm run test:performance:frontend -- --reporter=verbose 2>&1 | grep "PERF-"
```

### After Each Fix
```bash
# Test specific suite
npm run test:performance:frontend -- --reporter=verbose

# Verify build output
npm run build
npm run build:analyze  # If available

# Check bundle sizes
npm run test:performance:frontend -- PERF-BUNDLE
```

---

## 📝 Code Checklist

- [ ] PERF-SPLIT-004: Suspense boundaries in place
  - [ ] `src/App.tsx` imports Suspense
  - [ ] Main Routes wrapped in `<Suspense fallback={...}>`
  - [ ] Loading component defined

- [ ] PERF-SPLIT-005: Chunk sizing configured
  - [ ] `vite.config*.ts` has manualChunks
  - [ ] Each chunk 50-500KB
  - [ ] npm run build succeeds

- [ ] PERF-RENDER-004: Virtual lists implemented
  - [ ] React-window imported in large list components
  - [ ] `FixedSizeList` used for patients/consultations
  - [ ] Row height and width configured

- [ ] PERF-RENDER-005: Inline objects removed
  - [ ] No `filter={{ }}` or `options={[ ]}` patterns
  - [ ] Constants moved outside components
  - [ ] useMemo added where needed

- [ ] PERF-DEP-002: Dependencies updated
  - [ ] `npm outdated` shows no major updates needed
  - [ ] package.json reflects latest stable versions
  - [ ] `npm install` succeeds

- [ ] PERF-BUILD-005: Cache busting configured
  - [ ] Build output includes file hashes
  - [ ] `dist/` contains `[name]-[hash].[ext]` pattern

---

## ⏱️ Time Estimates

| Fix | Complexity | Time |
|-----|------------|------|
| PERF-DEP-002 | Easy | 5 min |
| PERF-BUILD-005 | Easy | 10 min |
| PERF-SPLIT-004 | Easy | 15 min |
| PERF-RENDER-005 | Medium | 20 min |
| PERF-SPLIT-005 | Medium | 25 min |
| PERF-RENDER-004 | Hard | 60 min |
| **Total** | | **135 min** |

---

## 🔍 Validation Commands

```bash
# Full test suite
npm run test:performance:frontend

# Specific test
npm run test:performance:frontend -- -t "PERF-SPLIT-004"

# With coverage
npm run test:performance:frontend:coverage

# Build check
npm run build --mode production

# Bundle analysis
npm run build:analyze  # If plugin installed
```

---

## 📚 References

- [React Suspense](https://react.dev/reference/react/Suspense)
- [React Window](https://react-window.now.sh/)
- [Vite Code Splitting](https://vitejs.dev/guide/features.html#code-splitting)
- [Web Vitals](https://web.dev/vitals/)
- [React Rendering Performance](https://react.dev/learn/render-and-commit)

---

## ✅ Success Criteria

- All 6 tests passing
- Frontend test score: 35/35 (100%)
- `npm run test:performance:frontend` shows 0 failures
- Build completes with no warnings
- Bundle size meets targets:
  - Main: <300KB gzipped
  - Chunks: 50-500KB each
  - Total: <1.5MB

---

**Next Review:** After all 6 fixes implemented and tested  
**Documentation Updated:** April 15, 2026
