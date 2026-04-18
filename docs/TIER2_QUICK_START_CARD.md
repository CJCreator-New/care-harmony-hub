# TIER 2: QUICK START CARD

**Owner Assignment:** [Assign your developer]  
**Duration:** 40 hours across 1-2 sprints  
**Effort per Item:** 15h | 10h | 8h | 7h  
**Success:** All tests pass + `npm run type-check` returns 0 errors

---

## 🎯 What Tier 2 Does

Eliminates **type safety gaps** that could cause production crashes:

```
Problem: Code compiles but crashes at runtime
Solution: Add TypeScript strict mode enforcement
Result: 90% fewer runtime errors in production
```

---

## 📋 4 Items in Tier 2

### Item 2.1: Fix 18 `@ts-nocheck` Files (15 hours)

**Why:** Each file with `@ts-nocheck` hides bugs  
**What:** Remove the directive + fix TypeScript errors  
**How:**

```bash
# Find all files
grep -r "@ts-nocheck" src/ --include="*.ts" --include="*.tsx"

# For each file:
# 1. Delete the @ts-nocheck line
# 2. Run: npm run type-check
# 3. Fix errors shown
# 4. Commit the fix
```

**Priority order:**
1. `RoleProtectedRoute.tsx` — Auth logic (2h)
2. `orchestrator.ts` — Workflows (2h)
3. `usePermissions.ts` — Permissions (2h)
4. `sanitize.ts` — Input validation (2h)
5. 14 other files (7h)

---

### Item 2.2: Enable TypeScript Strict Mode (10 hours)

**Why:** Catch null/undefined bugs before production  
**What:** Set `"strict": true` in tsconfig.json  
**How:**

```bash
# Step 1: Update tsconfig.json
# Change: "strict": false
# To:     "strict": true

# Step 2: Check for errors
npm run type-check 2>&1 | tee errors.log

# Step 3: Fix each error
# Add null checks, type annotations, etc.

# Step 4: Verify
npm run test && npm run test:e2e:smoke
```

**Common fixes:**
- Add `?:` for optional values
- Add null checks `if (value !== null)`
- Type function return values `function foo(): string {}`

---

### Item 2.3: Remove `(supabase as any)` Casts (8 hours)

**Why:** IDE autocomplete only works with proper types  
**What:** Replace `any` with actual Supabase types  
**How:**

```bash
# Find all casts
grep -r "(supabase as any)" src/ --include="*.ts" --include="*.tsx"

# For each occurrence, replace:
# FROM:  const data = (supabase as any).from('patients').select();
# TO:    const data = supabase.from('patients').select<Patient>('*');
```

**Expected:** ~30-40 replacements total

---

### Item 2.4: Split App.tsx Initialization (7 hours)

**Why:** Long App.tsx causes startup race conditions  
**What:** Move init logic to separate `src/bootstrap/` modules  
**How:**

```bash
# Create bootstrap structure
mkdir -p src/bootstrap

# Create modules:
# - src/bootstrap/index.ts          (orchestrator)
# - src/bootstrap/telemetry.ts      (analytics)
# - src/bootstrap/sentry.ts         (error tracking)
# - src/bootstrap/metrics.ts        (monitoring)
# - src/bootstrap/auth.ts           (auth setup)

# Update App.tsx to call: await bootstrap()
# Profit: App.tsx now 50 lines instead of 200+
```

---

## ⏱️ Timeline

| Day | Tasks | Hours |
|-----|-------|-------|
| **Mon-Tue** | Item 2.1 Phase 1 (security-critical files) | 8 |
| **Wed** | Item 2.1 Phase 2 (remaining files) | 7 |
| **Thu-Fri** | Item 2.2 (strict mode) | 10 |
| **Mon-Wed** | Item 2.3 (remove any casts) | 8 |
| **Thu-Fri** | Item 2.4 (split App.tsx) | 7 |
| **TOTAL** | — | **40** |

---

## ✅ Success Criteria

When all boxes checked, Tier 2 is DONE:

- [ ] `grep -r "@ts-nocheck" src/` returns 0 results
- [ ] `npm run type-check` shows 0 errors
- [ ] `grep -r "(supabase as any)" src/` returns 0 results
- [ ] `src/bootstrap/` modules created and working
- [ ] `npm run test` passes
- [ ] `npm run test:e2e:smoke` passes
- [ ] All commits pushed to main
- [ ] No console warnings or errors

---

## 🚀 How to Execute

### Step 1: Assign Owner
```
[ ] Who is doing Tier 2?
    Name: _______________
    Start Date: _______________
```

### Step 2: Copy the Detailed Guide

Send this to the owner:
**📖 [TIER1_COMPLETION_AND_TIER2_KICKOFF.md](TIER1_COMPLETION_AND_TIER2_KICKOFF.md)**

### Step 3: Daily Standup Questions

- How many files fixed today?
- Any type errors blocking you?
- Tests still passing?
- Any questions/blockers?

### Step 4: Track Progress

| Date | Item 2.1 | Item 2.2 | Item 2.3 | Item 2.4 | Status |
|------|----------|----------|----------|----------|--------|
| Mon  | 0% | — | — | — | Starting |
| Tue  | 50% | — | — | — | On track |
| Wed  | 100% | 0% | — | — | Phase 2 done |
| Thu  | — | 50% | — | — | Strict mode |
| Fri  | — | 100% | 0% | — | Tests passing |
| Mon  | — | — | 50% | — | Casts removing |
| Tue  | — | — | 100% | 0% | App split |
| Wed  | — | — | — | 100% | ✅ TIER 2 DONE |

---

## 📞 Support

**Questions about Item 2.X?**  
👉 See [TIER1_COMPLETION_AND_TIER2_KICKOFF.md](TIER1_COMPLETION_AND_TIER2_KICKOFF.md)

**TypeScript errors?**  
→ Search on [Stack Overflow](https://stackoverflow.com/questions/tagged/typescript)  
→ Check [TS Handbook](https://www.typescriptlang.org/docs/)

**Code review?**  
→ Tag security lead for Item 2.1 & 2.2 (auth + validation)  
→ Tag frontend lead for Item 2.3 & 2.4 (Supabase + App)

---

## 🎯 Exit Criteria

Tier 2 is COMPLETE when:

✅ All 4 items merged to main  
✅ All tests passing  
✅ Zero type errors  
✅ Production ready to scale  
✅ Team sign-off received

**Next:** → TIER 3 (Observability & Operations)

---

**Print this card and post on your desk!** 📌

Status: Ready to assign  
Blocker: None  
Next Action: Assign owner + start Item 2.1
