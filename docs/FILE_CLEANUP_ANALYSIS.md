# Comprehensive File Cleanup Analysis

Date: 2026-03-03  
Project: `care-harmony-hub`

## 1) Audit Coverage
This analysis traversed the full repository tree (all project directories), excluding only `.git` internals for safety.

Scan baseline:
- Total files: `86,886`
- Total size: `~870.77 MB`
- Largest footprint areas:
  - `node_modules`: `~521.76 MB`
  - `services/*/node_modules`: `~297.34 MB` combined
  - `.venv`: `~137.15 MB`

## 2) Unwanted File Inventory

## Priority P0 (Highest Impact, Safe to remove)

| Path | Size | Issue Type | Why It Is Unwanted | Recommended Action |
|---|---:|---|---|---|
| `src/integrations/supabase/types-new.ts` | 0 B | Obsolete version file | Empty file, superseded by `types.ts` | Delete |
| `services/patient-service/tests/setup.js` | 565 B | Redundant transpiled artifact | TS source exists (`setup.ts`) | Delete |
| `services/patient-service/tests/setup.js.map` | 584 B | Redundant transpiled artifact | Generated sourcemap for redundant JS | Delete |
| `services/patient-service/tests/setup.d.ts` | 46 B | Redundant declaration artifact | Generated declaration beside TS source | Delete |
| `services/patient-service/tests/setup.d.ts.map` | 97 B | Redundant declaration artifact | Generated map artifact | Delete |

## Priority P1 (Tracked generated artifacts likely to cause conflicts/noise)

| Path | Size | Issue Type | Why It Is Unwanted | Recommended Action |
|---|---:|---|---|---|
| `dev-dist/registerSW.js` | 119 B | Generated build output | Build artifact should be reproducible, not source-of-truth | Remove from VCS and regenerate in CI/build |
| `dev-dist/sw.js` | 3.28 KB | Generated build output | Same as above | Remove from VCS and regenerate |
| `dev-dist/workbox-52f2a342.js` | 172.26 KB | Generated build output | Same as above | Remove from VCS and regenerate |
| `playwright-report-full/index.html` | 519.64 KB | Generated test report | Snapshot artifact; stale quickly | Remove from VCS, generate on demand |
| `playwright-report-roles/index.html` | 520.47 KB | Generated test report | Snapshot artifact; stale quickly | Remove from VCS, generate on demand |
| `test-output.txt` | 44.35 KB | Captured test output artifact | Historical run output, not source | Remove from VCS |
| `test-run-output.txt` | 32.04 KB | Captured test output artifact | Historical run output, not source | Remove from VCS |

## Priority P2 (Untracked runtime/test artifacts)

| Path | Size | Issue Type | Recommended Action |
|---|---:|---|---|
| `vite-debug.log` | 153.59 KB | Runtime log | Delete |
| `build-full.log` | 45.15 KB | Build log | Delete |
| `build-output.log` | 44.21 KB | Build log | Delete |
| `build-errors.log` | 44.21 KB | Build log | Delete |
| `test-unit.log` | 22.32 KB | Test log | Delete |
| `dev_output.log` | 0.84 KB | Dev run log | Delete |
| `dist/` | 3.64 MB | Local build folder | Delete and regenerate when needed |
| `playwright-report/` | 0.52 MB | Local report folder | Delete and regenerate when needed |
| `test-results/` | 0.72 MB | Local test artifacts | Delete |
| `screenshots/` | 0.02 MB | Local test screenshots | Delete |
| `scripts/python-e2e/reports/` | 0.29 MB | Local E2E report artifacts | Delete |

## Priority P3 (Storage/perf cleanup candidates - environment artifacts)

| Path | Size | Issue Type | Recommended Action |
|---|---:|---|---|
| `node_modules/` | 521.76 MB | Dependency cache | Delete and reinstall (`npm ci`) |
| `services/appointment-service/node_modules/` | 96.14 MB | Service dependency cache | Delete and reinstall per service |
| `services/clinical-service/node_modules/` | 89.27 MB | Service dependency cache | Delete and reinstall per service |
| `services/patient-service/node_modules/` | 111.93 MB | Service dependency cache | Delete and reinstall per service |
| `.venv/` | 137.15 MB | Python virtual env cache | Delete and recreate only if Python tools needed |

## Priority P4 (Review-required, not auto-delete)

| Path | Size | Issue Type | Risk | Recommendation |
|---|---:|---|---|---|
| `package.test.json` | 0.26 KB | Potentially obsolete config | Low | No references found; remove if not used by external tooling |
| `monitoring/grafana/datasources/prometheus.yml` | 166 B | Duplicate content | Low | Keep one canonical file; template/symlink/copy at build time |
| `monitoring/grafana/provisioning/datasources/prometheus.yml` | 166 B | Duplicate content | Low | Same as above |
| `bun.lockb` + `package-lock.json` (root) | N/A | Multiple lockfiles | Medium | Standardize on one package manager at root to avoid drift |

## 3) Exact Duplicate Content Findings

- Duplicate hash group A: `18` files, each `8,511 B`, total `153,198 B`
  - Location: `scripts/python-e2e/reports/screenshots/*`
  - All 18 PNG files are byte-identical and likely placeholder/repeated captures.
- Duplicate hash group B: `2` files, each `166 B`
  - `monitoring/grafana/datasources/prometheus.yml`
  - `monitoring/grafana/provisioning/datasources/prometheus.yml`

## 4) Full List: Duplicate Screenshot Files (18)

1. `scripts/python-e2e/reports/screenshots/test_doctor_cannot_access_admin[chromium].png` (8,511 B)
2. `scripts/python-e2e/reports/screenshots/test_doctor_can_start_consultation[chromium].png` (8,511 B)
3. `scripts/python-e2e/reports/screenshots/test_doctor_patient_queue_visible[chromium].png` (8,511 B)
4. `scripts/python-e2e/reports/screenshots/test_login_page_loads[chromium].png` (8,511 B)
5. `scripts/python-e2e/reports/screenshots/test_login_validation_works[chromium].png` (8,511 B)
6. `scripts/python-e2e/reports/screenshots/test_nurse_vitals_form_accessible[chromium].png` (8,511 B)
7. `scripts/python-e2e/reports/screenshots/test_nurse_vitals_validation[chromium].png` (8,511 B)
8. `scripts/python-e2e/reports/screenshots/test_role_dashboard_accessible[chromium-admin].png` (8,511 B)
9. `scripts/python-e2e/reports/screenshots/test_role_dashboard_accessible[chromium-doctor].png` (8,511 B)
10. `scripts/python-e2e/reports/screenshots/test_role_dashboard_accessible[chromium-lab_technician].png` (8,511 B)
11. `scripts/python-e2e/reports/screenshots/test_role_dashboard_accessible[chromium-nurse].png` (8,511 B)
12. `scripts/python-e2e/reports/screenshots/test_role_dashboard_accessible[chromium-patient].png` (8,511 B)
13. `scripts/python-e2e/reports/screenshots/test_role_dashboard_accessible[chromium-pharmacist].png` (8,511 B)
14. `scripts/python-e2e/reports/screenshots/test_role_dashboard_accessible[chromium-receptionist].png` (8,511 B)
15. `scripts/python-e2e/reports/screenshots/test_rbac_route_blocking[chromium-lab_technician-\billing].png` (8,511 B)
16. `scripts/python-e2e/reports/screenshots/test_rbac_route_blocking[chromium-nurse-\pharmacy].png` (8,511 B)
17. `scripts/python-e2e/reports/screenshots/test_rbac_route_blocking[chromium-patient-\settings].png` (8,511 B)
18. `scripts/python-e2e/reports/screenshots/test_rbac_route_blocking[chromium-receptionist-\consultations].png` (8,511 B)

## 5) Prioritized Removal Plan

### Phase 1 - Immediate (safe, low risk)
1. Remove obsolete/empty and redundant generated file set (P0).
2. Remove logs and transient artifacts (P2).

### Phase 2 - Repository hygiene
1. Remove tracked generated reports/build outputs (P1).
2. Add/adjust `.gitignore` to prevent reintroduction.

Suggested `.gitignore` additions:
- `dev-dist/`
- `playwright-report-full/`
- `playwright-report-roles/`
- `test-output.txt`
- `test-run-output.txt`
- `scripts/python-e2e/reports/`

### Phase 3 - Dependency/cache refresh
1. Clean dependency caches (`node_modules`, service `node_modules`, `.venv`) when preparing a clean build/test cycle.
2. Reinstall only what is needed.

### Phase 4 - Policy standardization
1. Choose one lockfile strategy at root (`npm` or `bun`), then remove the other.
2. Consolidate duplicate Prometheus config source and generate copies where needed.

## 6) Safe Deletion Commands (PowerShell)

Run from repo root.

```powershell
# P0: obsolete/redundant files
Remove-Item "src/integrations/supabase/types-new.ts" -Force
Remove-Item "services/patient-service/tests/setup.js" -Force
Remove-Item "services/patient-service/tests/setup.js.map" -Force
Remove-Item "services/patient-service/tests/setup.d.ts" -Force
Remove-Item "services/patient-service/tests/setup.d.ts.map" -Force

# P1: tracked generated artifacts (after team confirmation)
Remove-Item "dev-dist" -Recurse -Force
Remove-Item "playwright-report-full" -Recurse -Force
Remove-Item "playwright-report-roles" -Recurse -Force
Remove-Item "test-output.txt" -Force
Remove-Item "test-run-output.txt" -Force

# P2: transient logs/artifacts
Remove-Item "vite-debug.log","build-full.log","build-output.log","build-errors.log","test-unit.log","dev_output.log" -Force -ErrorAction SilentlyContinue
Remove-Item "dist","playwright-report","test-results","screenshots","scripts/python-e2e/reports" -Recurse -Force -ErrorAction SilentlyContinue

# P3: dependency/cache cleanup (optional but high space recovery)
Remove-Item "node_modules",".venv" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "services/appointment-service/node_modules","services/clinical-service/node_modules","services/patient-service/node_modules" -Recurse -Force -ErrorAction SilentlyContinue
```

## 7) Post-cleanup Validation Checklist

1. `npm ci`
2. `npm run type-check`
3. `npm run test:unit`
4. `npm run test:security`
5. `npm run build`
6. For microservices changed/cleaned:
   - `npm --prefix services/appointment-service ci`
   - `npm --prefix services/clinical-service ci`
   - `npm --prefix services/patient-service ci`

## 8) Risk Notes

- Do not remove service-level `package-lock.json` files unless you are intentionally changing each service's package manager strategy.
- Do not remove directories under `.git/`.
- If `package.test.json` is referenced by external CI or local scripts not present in repo, confirm before deleting.
