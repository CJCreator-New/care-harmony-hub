# TIER 2 ITEM 2.1 — FILE 1: START HERE

## 🎯 File: RoleProtectedRoute.tsx

**Path:** `src/components/auth/RoleProtectedRoute.tsx`  
**Effort:** 2 hours  
**Priority:** 🔴 Security-Critical (Authorization logic)  
**Status:** Ready to fix  

---

## ⚡ QUICK START (5 minutes)

### Step 1: Open the file

```bash
# In VS Code, press Ctrl+P, type:
RoleProtectedRoute.tsx

# Hit Enter to open
```

### Step 2: Remove @ts-nocheck

Find line 1:
```typescript
// @ts-nocheck
```

Delete this line entirely.

### Step 3: Run type check

```bash
# In VS Code terminal (Ctrl+`):
npm run type-check
```

### Step 4: Fix errors

Read the output. You'll see errors. Follow the section below for each error type.

---

## 🔧 EXPECTED ERRORS & FIXES

### Error Type 1: "Property does not exist on type"

**Example:**
```
Property 'logPermissionDenial' does not exist on type 'usePermissionAudit'
```

**Fix:** Add type annotation or check the hook return type

```typescript
// Current (problematic):
const { logPermissionDenial } = usePermissionAudit();

// After fix - check what usePermissionAudit returns
// Usually: check src/lib/hooks/usePermissionAudit.ts for return interface
```

---

### Error Type 2: "Argument of type 'X | null' is not assignable to type 'X'"

**Example:**
```
Argument of type 'string | null' is not assignable to type 'string'
```

**Fix:** Add null check before using

```typescript
// Current (problematic):
logPermissionDenial({
  attemptedBy: user?.email || user?.id || null,  // ← This can be null
});

// After fix:
logPermissionDenial({
  attemptedBy: user?.email || user?.id || undefined,  // Use undefined instead
});
```

---

### Error Type 3: "Cannot find name 'something'"

**Example:**
```
Cannot find name 'import'
```

**Fix:** Make sure all imports are present at top of file

Current imports (lines 1-12):
```typescript
import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import { hasAnyAllowedRole, hasPermissionForAnyRole, Permission } from '@/lib/permissions';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getDevTestRole } from '@/utils/devRoleSwitch';
import { usePermissionAudit } from '@/lib/hooks';
import { checkRouteAccess } from '@/middleware/routeGuard';
```

All imports already exist ✓

---

## 📋 WHAT TO DO (In Order)

### 1. Remove @ts-nocheck (1 minute)
- Line 1: Delete `// @ts-nocheck`
- Save file (Ctrl+S)

### 2. Run type-check (1 minute)
```bash
npm run type-check
```

### 3. Read errors (5-10 minutes)
- Look for error messages
- Note which lines have errors
- Match against "EXPECTED ERRORS" section above

### 4. Fix each error (remaining time)
- Use Ctrl+Click on error line number to jump to it
- Read the error message
- Apply fix from section above
- Save (Ctrl+S)
- Re-run `npm run type-check`
- Repeat until 0 errors

### 5. Commit (5 minutes)

```bash
git add src/components/auth/RoleProtectedRoute.tsx
git commit -m "refactor: add type safety to RoleProtectedRoute.tsx"
```

---

## 📊 PROGRESS CHECK

After completing this file:

```bash
# Should show 0 errors (at least for this file):
npm run type-check | grep "error TS"

# If empty = SUCCESS ✓
```

---

## ✅ DONE?

Once RoleProtectedRoute.tsx is complete with 0 errors:

1. ✅ @ts-nocheck removed
2. ✅ npm run type-check shows 0 errors for this file
3. ✅ Committed to git
4. ✅ Ready to move to File 2: orchestrator.ts

**Estimated time:** 2 hours

**Next file:** See [TIER2_ITEM21_EXECUTION_GUIDE.md](TIER2_ITEM21_EXECUTION_GUIDE.md) for orchestrator.ts fixes

---

## 🆘 STUCK?

**Question:** I don't understand the TypeScript error  
**Answer:** Copy the error message and search in [TypeScript Handbook](https://www.typescriptlang.org/docs/)

**Question:** I don't know how to fix it  
**Answer:** Look at similar files without @ts-nocheck for patterns

**Question:** The file is too complex  
**Answer:** Break it into smaller functions first, then type each function separately

---

## 🚀 START NOW

```bash
# 1. Open VS Code
code .

# 2. Open file (Ctrl+P):
RoleProtectedRoute.tsx

# 3. Delete line 1: // @ts-nocheck

# 4. Run type check:
npm run type-check

# 5. Fix errors (see sections above)

# 6. Commit when done:
git commit -m "refactor: add type safety to RoleProtectedRoute.tsx"
```

---

**Time Budget:** 2 hours  
**Difficulty:** Medium (authorization logic with multiple helpers)  
**Next:** orchestrator.ts (2 hours)

Let's go! 🎯
