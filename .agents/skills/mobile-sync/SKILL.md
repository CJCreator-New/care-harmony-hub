---
name: mobile-sync
description: 'Keeps the mobile-app Expo scaffold (mobile-app/) in sync with web-side hook signatures and Supabase types when shared data models change. Use when a web hook, Supabase table, or shared type changes and the mobile app needs to reflect it. Produces the minimal diff across mobile-app/app/src/hooks/, mobile-app/app/src/lib/supabase.ts, and mobile-app/app/src/contexts/AuthContext.tsx.'
argument-hint: 'Describe what changed on the web side: a hook name, a table/column change, a new shared type, or an AuthContext field. The skill will produce the corresponding mobile-side update.'
---

# CareSync — Mobile Sync Skill

Keeps `mobile-app/` (Expo/React Native, patient-facing) in sync with the web app when shared data models, hook signatures, or Supabase types change. Produces minimal, targeted diffs — not full rewrites.

## When to Use

- "I updated [hook] on the web — sync the mobile app"
- "Added [column] to [table] — update mobile types"
- "AuthContext changed — update mobile AuthContext"
- "New shared type [X] — add it to mobile"
- "Web hook [useX] signature changed — update mobile equivalent"

---

## Architecture Overview

| Layer | Web (`src/`) | Mobile (`mobile-app/app/src/`) |
|-------|-------------|-------------------------------|
| Supabase client | `src/integrations/supabase/client.ts` — `import.meta.env.VITE_*` | `mobile-app/app/src/lib/supabase.ts` — `process.env.EXPO_PUBLIC_*` |
| Auth context | `src/contexts/AuthContext.tsx` — full profile + roles + hospital | `mobile-app/app/src/contexts/AuthContext.tsx` — minimal: `user`, `loading`, `signIn`, `signOut` |
| Types | `src/integrations/supabase/types.ts` (generated) | No generated types yet — inline interfaces |
| Hooks | `src/hooks/use*.ts` — TanStack Query + full RBAC | `mobile-app/app/src/hooks/` — empty, scaffold only |
| Storage | `localStorage` (web) | `expo-secure-store` (mobile) |
| Env vars | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

---

## Sync Rules

### Rule 1 — Supabase Table/Column Changes

When a migration adds/removes/renames a column on a table the mobile app queries:

1. Identify which mobile hooks (if any) query that table
2. Update the inline TypeScript interface in that hook
3. If the column is in `AuthContext` user shape — update the `User` interface

**Mobile `User` interface** (current, in `AuthContext.tsx`):
```ts
interface User {
  id: string;
  email: string;
  phone?: string;
  full_name?: string;
}
```
This maps to `auth.users` metadata only — not the `profiles` table. Only update if `auth.users.user_metadata` shape changes.

### Rule 2 — Web Hook Signature Changes

The mobile app has an empty `hooks/` directory. When a web hook is updated:

1. Check if a mobile equivalent exists — if not, scaffold it
2. Mobile hooks use the same Supabase client but **no TanStack Query** (not installed)
3. Use `useState` + `useEffect` pattern for mobile hooks
4. Omit RBAC/permission checks — mobile app is patient-only (`patient` role)
5. Omit `hospital_id` scoping from the mobile client — RLS handles it server-side via the patient's JWT

**Mobile hook template** (mirrors a web hook without TanStack Query):
```ts
// mobile-app/app/src/hooks/use<Name>.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface <Type> {
  // mirror only the fields the mobile UI needs
}

export function use<Name>() {
  const [data, setData] = useState<<Type>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      const { data: rows, error: err } = await supabase
        .from('<table>')
        .select('<columns>')
        .order('created_at', { ascending: false });

      if (!cancelled) {
        if (err) setError(err.message);
        else setData(rows ?? []);
        setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
```

### Rule 3 — AuthContext Changes

The web `AuthContext` has: `user`, `session`, `profile`, `hospital`, `roles`, `isAuthenticated`, `isLoading`, `signIn`, `signUp`, `signOut`, `refreshProfile`, `hasRole`.

The mobile `AuthContext` has: `user`, `loading`, `signIn`, `signOut`.

**Only sync these fields** if they change on the web side:
- `user.id` — maps to `session.user.id`
- `user.email` — maps to `session.user.email`
- `user.phone` — maps to `session.user.phone`
- `user.full_name` — maps to `session.user.user_metadata?.full_name`

If the web adds a field to `AuthContextType` that the mobile patient app needs (e.g., `patientId`), add it to the mobile `AuthContextType` and populate it from a `profiles` query in the `onAuthStateChange` handler.

**Pattern for adding `patientId` to mobile AuthContext:**
```ts
// In onAuthStateChange handler, after setting user:
if (session?.user) {
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  setPatientId(patient?.id ?? null);
}
```

### Rule 4 — Env Var Differences

Never use web env var names in mobile code:

| Web | Mobile |
|-----|--------|
| `import.meta.env.VITE_SUPABASE_URL` | `process.env.EXPO_PUBLIC_SUPABASE_URL` |
| `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` | `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY` |

### Rule 5 — Storage Differences

| Web | Mobile |
|-----|--------|
| `localStorage` | `expo-secure-store` via `ExpoSecureStoreAdapter` |
| `sessionStorage` | `expo-secure-store` (same) |
| Cookies | Not applicable |

The `ExpoSecureStoreAdapter` is already wired in `mobile-app/app/src/lib/supabase.ts`. Do not change it.

---

## Output Format

For each sync task, produce:

1. **What changed on the web** — one-line summary
2. **Mobile files to update** — list only files that actually need changes
3. **Minimal diff** — show only the changed lines with enough context to locate them, not full file rewrites
4. **No-op confirmation** — if a web change has no mobile impact, say so explicitly

Example output structure:
```
Web change: Added `mrn` column to `patients` table

Mobile impact:
- mobile-app/app/src/hooks/usePatientProfile.ts — add `mrn?: string` to Patient interface

No impact on:
- AuthContext.tsx (mrn is not in auth.users metadata)
- supabase.ts (client config unchanged)
```

---

## What the Mobile App Does NOT Need

These web-side patterns have no mobile equivalent — do not port them:

- TanStack Query (`useQuery`, `useMutation`, `QueryClient`)
- `usePermissions()` / `hasPermission()` — mobile is patient-only
- `hospital_id` in client-side queries — RLS enforces it via JWT
- `useAudit()` / `logActivity()` — audit logging is server-side only
- `sanitizeForLog()` — no `console.log` of PHI in mobile production builds
- Role-based route guards — mobile has no role switching
- `usePaginatedQuery` — implement simple `limit` + `offset` state if needed
