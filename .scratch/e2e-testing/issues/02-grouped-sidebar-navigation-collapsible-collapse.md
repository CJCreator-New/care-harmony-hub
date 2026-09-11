---
Status: ready-for-agent
Severity: P1
Role: admin, doctor
Page: /dashboard
Viewport: 1280x720
Browser: chromium
---

# [P1] Navigation Helper Fails on Collapsed Sidebar Accordion Groups

## Description
In `src/components/layout/GroupedSidebar.tsx`, sidebar navigation items are partitioned into collapsible groups (`Administration`, `Business Operations`, `Pharmacy & Inventory`, `Laboratory`, `AI & Analytics`) based on `src/config/routeManifest.ts`. Only `Core Operations` and `Clinical Care` are `defaultExpanded: true`.

When automated tests run `dashboard.navigateTo('Settings')` or `dashboard.navigateTo('Users')` or `dashboard.navigateTo('Pharmacy')`, `NavigationComponent.clickNavItem` in `tests/e2e/pages/components/index.ts` attempts:
```typescript
await this.rootLocator.getByRole('link', { name: new RegExp(itemName, 'i') }).click();
```
Because the parent collapsible section is not expanded, the link is hidden and the click times out after 15,000ms. Furthermore, the label in `routeManifest.ts` is `Staff Management` (not `Users`), `Hospital Settings` (not `Settings`), and `Lab Orders` (not `Laboratory`).

## Steps to Reproduce
1. Log in as `admin@testgeneral.com`
2. Call `dashboard.navigateTo('Users')` or `dashboard.navigateTo('Settings')`
3. Observe locator timeout waiting for `/Users/i` or `/Settings/i` link.

## Expected Result
`NavigationComponent.clickNavItem` or `DashboardPage.navigateTo` should automatically detect if the target link belongs to a collapsed group, expand the group trigger, and click the link, or support direct section mapping.

## Actual Result
Test times out waiting for hidden links inside collapsed accordion sections.

## Evidence
- TimeoutError: `locator.click: Timeout 15000ms exceeded. waiting for locator('nav, aside, [role="navigation"]').getByRole('link', { name: /Users/i })`
- Page snapshot reveals `button "Administration" [cursor=pointer]` is not expanded.

## Likely Root Cause
`NavigationComponent` in `tests/e2e/pages/components/index.ts` does not auto-expand collapsible sidebar groups before attempting to click child nav links.

## Recommended Fix
Enhance `NavigationComponent.clickNavItem` to search for visible links, and if not visible, auto-expand relevant accordion sections (`expandSection`) or find links across all groups.

## Regression Test Required
Yes (`tests/e2e/tests/roles/admin/admin.spec.ts`).
