# Fix Role-Switching Failure Across All Roles

## Root Cause Analysis

The role-switching system has three critical bugs preventing Admin, Nurse, Receptionist, and Pharmacist users from switching roles and seeing their modules:

1. **No production role switcher exists** — The `RoleSwitcher` component is only rendered inside `import.meta.env.DEV`, so production users have zero UI to switch roles
2. **`GroupedSidebar` receives a potentially null `primaryRole`** — `DashboardLayout` passes `primaryRole` (typed `UserRole | null`) to `GroupedSidebar` which expects non-nullable `UserRole`, causing the sidebar to show no navigation items when the role hasn't resolved
3. **The `GroupedSidebar` always uses `primaryRole`** — even after a role switch, the sidebar is passed `primaryRole` directly instead of the resolved active role, so navigation doesn't update consistently

## Affected Files

| File | Issue |
|------|-------|
| `src/components/layout/DashboardLayout.tsx` | No production role switcher; passes `primaryRole` instead of `activeRole` to sidebar |
| `src/components/layout/GroupedSidebar.tsx` | `userRole` prop typed as non-nullable `UserRole` but receives `null` |
| `src/pages/Dashboard.tsx` | Falls back to `'admin'` dashboard when `primaryRole` is null |

## Steps

### Step 1: Add a production-mode RoleSwitcher to the dashboard header

**File:** `src/components/layout/DashboardLayout.tsx` (lines ~280–310)

- Place a `<RoleSwitcher variant="default" />` in the header bar (next to the theme toggle/notifications), visible when `roles.length > 1`
- This uses `AuthContext.switchRole` which sets `preferredRole` via React state — no page reload needed, the `primaryRole` memo recomputes instantly
- The existing dev-mode switcher at the bottom-right remains unchanged for testing

### Step 2: Fix the GroupedSidebar prop type and null handling

**File:** `src/components/layout/GroupedSidebar.tsx` (lines ~149–157)

- Change `userRole: UserRole` → `userRole: UserRole | null` in `GroupedSidebarProps`
- Update `hasAccessToGroup` and `hasAccessToItem` to handle `null` gracefully (return `false`)

### Step 3: Pass the resolved activeRole to GroupedSidebar

**File:** `src/components/layout/DashboardLayout.tsx` (lines ~200–203)

- Currently passes `userRole={primaryRole}` — change to `userRole={activeRole}` so the sidebar reflects whichever role is currently active (whether from dev switch or production `switchRole`)

### Step 4: Fix the Dashboard null-role fallback

**File:** `src/pages/Dashboard.tsx` (line ~26)

- When `primaryRole` is `null` and no dev test role exists, show a loading/error state instead of defaulting to admin dashboard

## Verification

- `bun run build` — confirm no build errors
- `bun run type-check` — confirm no TypeScript type errors
- `bun run test:unit` — confirm existing tests pass
- Manual: After login with multi-role user, the header should show a role switcher dropdown; clicking a different role should update the dashboard component and sidebar navigation instantly without reload
