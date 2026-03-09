---
name: performance-audit
description: 'Phase 3 performance analysis for the CareSync HIMS. Audits bundle size, TanStack Query stale times, missing pagination, heavy re-renders, and virtualization candidates. Outputs a prioritized fix list with effort estimates. Use when asked to audit performance, find bundle bloat, fix slow pages, optimize data fetching, or identify re-render issues.'
argument-hint: 'Scope: a specific page, hook, component, or "full app". Optionally specify focus: bundle | query-cache | pagination | re-renders | virtualization.'
---

# CareSync — Performance Audit Skill

Runs a structured Phase 3 performance analysis across the React/TypeScript/Vite/TanStack Query stack. Output is a prioritized fix list with severity, effort estimate, and concrete code changes.

## When to Use

- "Audit performance of [page/component/hook]"
- "Why is [page] slow?"
- "Find bundle bloat"
- "Optimize data fetching in [hook]"
- "Find re-render issues in [component]"
- "Which lists need virtualization?"

---

## Audit Domain 1 — Bundle Size

**Tools**: `vite.config.ts` `manualChunks`, `rollup-plugin-visualizer` (add with `--profile` flag)

**Current split** (from `vite.config.ts`):
- `vendor`: react, react-dom
- `charts`: recharts
- `supabase`: @supabase/supabase-js
- `tanstack`: @tanstack/react-query
- `motion`: framer-motion
- `icons`: lucide-react

**Scan for:**

| Signal | Issue | Fix |
|--------|-------|-----|
| Top-level `import { X } from 'recharts'` in a component file | Recharts loaded even when chart not visible | Move to `lazy(() => import(...))` or ensure only used inside lazy-loaded dashboard chunks |
| `import { X } from '@anthropic-ai/sdk'` or `import { X } from 'openai'` | Dead deps — plan.md says use Lovable AI gateway | Remove from `package.json` and all imports |
| `import * as` from a large library | Prevents tree-shaking | Use named imports only |
| Component file > 300 lines with multiple heavy imports | Candidate for code splitting | Extract sub-components into separate lazy chunks |
| `LazyComponents.tsx` missing a dashboard that's loaded on every role's initial route | Dashboard not lazy | Add to `LazyComponents.tsx` with `React.lazy()` |
| `manualChunks` missing a dep that appears in multiple chunks | Duplicate code across chunks | Add to appropriate chunk key in `vite.config.ts` |

**How to add bundle visualizer** (one-time):
```bash
npm install --save-dev rollup-plugin-visualizer
```
```ts
// vite.config.ts — add to plugins array
import { visualizer } from 'rollup-plugin-visualizer';
// inside plugins: [visualizer({ open: true, gzipSize: true })]
```
Then `npm run build` to open the treemap.

---

## Audit Domain 2 — TanStack Query Stale Times

**Default**: TanStack Query refetches on every window focus with `staleTime: 0`. For a clinical app this causes excessive Supabase reads.

**Recommended stale times by data type:**

| Data Type | Recommended `staleTime` | Reason |
|-----------|------------------------|--------|
| Static reference data (ICD-10 codes, drug list, hospital info) | `Infinity` | Never changes at runtime |
| User profile / roles | `5 * 60 * 1000` (5 min) | Changes rarely, auth context handles invalidation |
| Appointment slots / availability | `60 * 1000` (1 min) | Moderate change rate |
| Patient queue / notifications | `0` + Supabase Realtime | Live data — use Realtime instead of polling |
| Lab results / prescriptions | `2 * 60 * 1000` (2 min) | Updated by staff, not real-time critical |
| Dashboard stats / analytics | `5 * 60 * 1000` (5 min) | Aggregates, expensive to recompute |

**Scan for:**

| Signal | Issue |
|--------|-------|
| `useQuery({ queryKey: [...], queryFn: ... })` with no `staleTime` on a rarely-changing resource | Refetches on every window focus |
| `useQuery` on ICD-10 codes, drug list, hospital settings without `staleTime: Infinity` | Unnecessary Supabase reads |
| `useQuery` on patient queue / notifications without Supabase Realtime subscription | Should use Realtime, not polling |
| `refetchInterval` set on a non-live-data query | Polling instead of Realtime |
| `queryClient.invalidateQueries()` called without a specific `queryKey` | Invalidates entire cache — causes cascade refetch |

**Fix pattern:**
```ts
useQuery({
  queryKey: ['hospital-settings', hospitalId],
  queryFn: () => fetchHospitalSettings(hospitalId),
  staleTime: 5 * 60 * 1000,   // ← add this
  gcTime: 10 * 60 * 1000,     // keep in cache 10 min after unmount
});
```

---

## Audit Domain 3 — Missing Pagination

Supabase has a **1000-row default limit**. Any `.select()` without `.range()` silently truncates results.

**Scan for:**

| Signal | Issue |
|--------|-------|
| `supabase.from('patients').select(...)` without `.range()` or `.limit()` | Silently truncates at 1000 rows |
| `supabase.from('lab_orders').select(...)` in a list view hook without pagination | Same issue |
| List component rendering `data.map(...)` where `data` could be > 50 items without pagination UI | No page controls |
| `usePaginatedQuery` hook exists but not used in `usePatients`, `useAppointments`, `useLabOrders` | Pagination hook available but unused |

**`usePaginatedQuery` is already implemented** at `src/hooks/usePaginatedQuery.ts`. Use it:
```ts
const { data, currentPage, nextPage, prevPage, totalCount } = usePaginatedQuery({
  table: 'patients',
  filters: { hospital_id: hospitalId },
  pageSize: 20,  // default
});
```

**Tables that definitely need pagination** (high row count in production):
- `patients`, `appointments`, `lab_orders`, `prescriptions`, `activity_logs`, `notifications`, `secure_messages`, `patient_queue`

---

## Audit Domain 4 — Heavy Re-renders

**Scan for:**

| Signal | Issue | Fix |
|--------|-------|-----|
| `new Date()` or `Date.now()` called directly in render body | New reference every render → child re-renders | Move to `useMemo` or `useRef` |
| `Math.random()` in render body | Same issue | Move outside component or to `useRef` |
| Inline object/array literal passed as prop: `<Comp style={{ color: 'red' }} />` | New reference every render | Extract to `const` outside component or `useMemo` |
| Inline arrow function passed as prop to a memoized child: `<Comp onClick={() => fn(id)} />` | Breaks `React.memo` | Wrap in `useCallback` |
| Large component (>150 lines) with multiple `useEffect` and `useState` | Monolithic — re-renders entire tree on any state change | Split into smaller components |
| Context value object created inline: `<Ctx.Provider value={{ a, b, c }}>` | New object every render → all consumers re-render | Wrap value in `useMemo` |
| `useEffect` with no dependency array | Runs on every render | Add correct deps or use `useRef` |
| `useEffect` fetching data directly (not via TanStack Query) | No caching, re-fetches on every mount | Migrate to `useQuery` |

**React DevTools Profiler** — instruct user to:
1. Open React DevTools → Profiler tab
2. Record while navigating to the slow page
3. Look for components with high "render count" or "render duration"

---

## Audit Domain 5 — Virtualization Candidates

Rendering 100+ DOM nodes in a list causes layout thrashing. Use virtualization for large lists.

**Candidate identification:**

| Component/Page | Likely row count | Virtualize? |
|----------------|-----------------|-------------|
| Patient list (`/patients`) | 100–10,000 | ✅ Yes |
| Appointment list | 50–500/day | ✅ Yes if > 100 visible |
| Lab orders list | 50–200/day | ✅ Yes |
| Medication/drug search dropdown | 1,000+ drugs | ✅ Yes |
| Notification list | 20–50 | ❌ No |
| Dashboard stat cards | < 20 | ❌ No |

**Recommended library**: `@tanstack/react-virtual` (already in TanStack ecosystem)

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: patients.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 64, // row height in px
});

return (
  <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
      {rowVirtualizer.getVirtualItems().map(virtualRow => (
        <div
          key={virtualRow.index}
          style={{ position: 'absolute', top: virtualRow.start, width: '100%' }}
        >
          <PatientRow patient={patients[virtualRow.index]} />
        </div>
      ))}
    </div>
  </div>
);
```

---

## Audit Domain 6 — Search Input Debouncing

**Scan for:**

| Signal | Issue |
|--------|-------|
| `onChange` on a search input that directly sets a query filter | Fires Supabase query on every keystroke |
| `useDebouncedValue` hook exists at `src/hooks/useDebouncedValue.ts` but not used in search inputs | Debounce hook available but unused |

**Fix pattern** (`useDebouncedValue` already exists):
```ts
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebouncedValue(searchTerm, 300);

// Use debouncedSearch in the query, not searchTerm
const { data } = useQuery({
  queryKey: ['patients', debouncedSearch],
  queryFn: () => searchPatients(debouncedSearch),
  enabled: debouncedSearch.length > 1,
});
```

---

## Audit Procedure

### Step 1 — Scope
- **Single component/hook**: read the file, run domains 2, 4
- **Page**: read page + its hooks, run all 6 domains
- **Full app**: prioritize Domain 3 (pagination) → Domain 2 (stale times) → Domain 1 (bundle) → Domain 4 (re-renders) → Domain 5 (virtualization) → Domain 6 (debounce)

### Step 2 — Produce Prioritized Fix List

```markdown
## Performance Fix List — [Scope]

| # | Domain | Issue | File | Effort | Impact |
|---|--------|-------|------|--------|--------|
| 1 | Pagination | usePatients missing .range() — truncates at 1000 rows | src/hooks/usePatients.ts | 30 min | High |
| 2 | Query Cache | Hospital settings refetches on every focus | src/hooks/useAdminStats.ts | 10 min | Medium |
| 3 | Re-renders | Inline style object on PatientCard | src/components/patients/PatientCard.tsx | 5 min | Low |
...

### Quick Wins (< 15 min each)
[List items with effort ≤ 15 min]

### High Impact (fix first)
[List items with Impact = High]
```

### Step 3 — Provide Code Fixes

For each finding, provide the minimal diff — not a full file rewrite. Show only the changed lines with enough context to locate them.

---

## Performance Baseline Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Initial JS bundle (gzipped) | < 200 KB | `npm run build` → check dist/ sizes |
| Largest role dashboard chunk | < 100 KB | Rollup visualizer |
| Time to Interactive (TTI) | < 3s on 4G | Lighthouse in Chrome DevTools |
| Supabase queries on dashboard load | < 5 | Network tab, filter by supabase.co |
| Re-renders on patient list scroll | 0 extra | React DevTools Profiler |
| Search input query debounce | 300ms | Code inspection |
