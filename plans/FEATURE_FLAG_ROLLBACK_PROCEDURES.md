# V2 Feature Flag — Internal Pilot & Rollback Procedures

**Created:** 2026-02-24  
**Owner:** Engineering  
**Scope:** T-87 `useFeatureFlags` / T-88 pilot procedures  
**Status:** Ready for internal pilot

---

## 1. Pilot Scope

Enable the six `_v2` flags for internal staff on the staging/internal hospital configuration.
Monitor for **3–5 days** before expanding to all hospitals.

| Flag name            | V2 code paths covered           | Ticket range    |
|----------------------|---------------------------------|-----------------|
| `doctor_flow_v2`     | Enhanced consultation workflow  | T-32–T-37, T-61–T-62 |
| `lab_flow_v2`        | Modern lab order + queue hooks  | T-38–T-43, T-63 |
| `nurse_flow_v2`      | Vitals, prep checklist          | T-25–T-31, T-65 |
| `pharmacy_flow_v2`   | PrescriptionDispensingModal, refill auth | T-51–T-54, T-68–T-69 |
| `reception_flow_v2`  | Queue, digital check-in         | T-55–T-60, T-64 |
| `patient_portal_v2`  | Portal hooks, billing           | T-44–T-50, T-66–T-67 |

---

## 2. Enabling a Flag for a Hospital

```sql
-- Enable a specific v2 flag for a hospital (replace values)
UPDATE feature_flags
SET enabled = true, updated_at = now()
WHERE hospital_id = '<target-hospital-uuid>'
  AND flag_name = '<flag_name>';
```

Using the Admin UI: **Admin Settings → Feature Flags → toggle the flag → Save**.

---

## 3. Monitoring Checklist (3-5 day window)

After enabling a flag, verify the following every 24 hours:

- [ ] Zero TypeScript runtime errors in Sentry / error telemetry (`telemetry:*_failure` events)
- [ ] Consultation start success rate ≥ 99 % (`telemetry:consult_start_success` vs `*_failure`)
- [ ] Lab order dispatch success rate ≥ 99 % (`telemetry:lab_order_dispatch_success` vs `*_failure`)
- [ ] Check-in audit events flowing (`action_type = 'checkin_queue_created'`)
- [ ] No orphaned queue entries (status stuck in `waiting` > 4 hours)
- [ ] Patient billing data loading from DB (not mock)
- [ ] No increase in Supabase RLS policy violations

Query to pull telemetry summary:

```sql
SELECT action_type,
       COUNT(*) AS total,
       DATE_TRUNC('hour', created_at) AS hour
FROM activity_logs
WHERE action_type LIKE 'telemetry:%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1, 3
ORDER BY 3 DESC, 1;
```

---

## 4. Per-Flag Rollback Procedure

### Step 1 — Disable the flag immediately

```sql
UPDATE feature_flags
SET enabled = false, updated_at = now()
WHERE hospital_id = '<target-hospital-uuid>'
  AND flag_name = '<flag_name>';
```

**Effect:** All clients will fall back to the legacy code path within 5 minutes
(React Query `staleTime` = 5 min for `useFeatureFlags`).

### Step 2 — Force-expire the cache (optional, for faster rollback)

If an immediate rollback is needed without waiting for cache expiry, instruct affected
users to **hard-reload** the browser (Ctrl+Shift+R / Cmd+Shift+R).

### Step 3 — Triage the failure

Check `activity_logs` for the error event:

```sql
SELECT entity_type, details, created_at
FROM activity_logs
WHERE action_type LIKE 'telemetry:%failure%'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 50;
```

### Step 4 — File a bug with the T-number reference

Create a GitHub issue tagged `regression`, reference the T-number, and block the next
flag re-enable until root cause is confirmed fixed.

---

## 5. Global Kill Switch

To disable ALL v2 code paths hospital-wide instantly:

```sql
UPDATE feature_flags
SET enabled = false, updated_at = now()
WHERE hospital_id = '<target-hospital-uuid>';
```

---

## 6. Promotion to All Hospitals (post stable window)

After 5 calendar days with zero P0/P1 issues on the internal pilot:

1. Update `feature_flags` for all hospitals:
   ```sql
   UPDATE feature_flags SET enabled = true, updated_at = now()
   WHERE flag_name = '<flag_name>';
   ```
2. Announce in release notes under the new sprint tag.
3. Schedule **T-94** cleanup sprint: remove legacy routing paths, mock fallbacks,
   and `_v2` flags; archive `useLaboratory.ts` and legacy `usePatientPortal`.
