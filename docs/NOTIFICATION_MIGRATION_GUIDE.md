# Notification System Migration Guide — Phase 3

## Objective
Migrate all notification senders from legacy `user_id` field to canonical `recipient_id` field for consistency and improved audit trails.

## Status
- **Canonical Adapter**: ✅ Complete ([src/services/notificationAdapter.ts](src/services/notificationAdapter.ts))
- **Migration Checklist**: This document
- **Deadline**: Target Phase 3 completion (Q2 2026)

---

## Legacy vs. Canonical Field Reference

### Old Implementation (Legacy)
```typescript
// ❌ OLD — Do not use
const legacyPayload = {
  hospital_id: '...',
  user_id: 'recipient-uuid',  // ← Non-canonical field
  sender_id: '...',
  title: 'Alert',
  message: 'Content',
  type: 'system',
  priority: 'high',
};

await supabase.from('notifications').insert(legacyPayload);
```

### New Implementation (Canonical)
```typescript
// ✅ NEW — Use this
const canonicalPayload = {
  hospital_id: '...',
  recipient_id: 'recipient-uuid',  // ← Canonical field
  sender_id: '...',
  title: 'Alert',
  message: 'Content',
  type: 'system',
  priority: 'high',
  metadata: {
    workflow_event: 'patient.checked_in',
    actor_role: 'receptionist',
  },
};

await sendNotification(canonicalPayload);  // Uses notificationAdapter
```

---

## Migration Checklist by Component

### Frontend Hooks & Components

#### ✅ `useWorkflowOrchestrator.ts` — MIGRATED
- [x] Updated `executeSingleAction` to use canonical `recipient_id`
- [x] Added metadata for traceability
- [x] Passes audit context to adapter
- Status: **Ready for production**

#### ⏳ `useAppointmentMutations.ts` — TODO
- [ ] Scan all `sendNotification()` calls
- [ ] Replace `user_id -> recipient_id`
- [ ] Add metadata context (e.g., `appointment_id`, `status_change`)
- [ ] Run unit tests: `npm run test:unit -- useAppointmentMutations`
- Assigned to: **Clinical team**

#### ⏳ `usePatientsQuery.ts` — TODO
- [ ] Scan feedback/status notification calls
- [ ] Apply canonical conversion
- [ ] Verify role-based recipient routing still works
- Assigned to: **Frontend team**

#### ⏳ `useLabResultsNotifications.ts` — TODO
- [ ] Update critical alert payloads
- [ ] Ensure `sender_id` = lab technician
- [ ] Add lab order IDs to metadata
- Assigned to: **Lab workflow team**

#### ⏳ `usePrescriptionNotifications.ts` — TODO
- [ ] Update pharmacy verification & dispense notifications
- [ ] Add pharmacy_id to metadata
- [ ] Test with multi-hospital scenario
- Assigned to: **Pharmacy team**

#### ⏳ Dashboard Components — TODO
- [ ] `AdminDashboard.tsx` — system notifications
- [ ] `DoctorDashboard.tsx` — patient alerts
- [ ] `ReceptionistDashboard.tsx` — queue notifications
- Assigned to: **Dashboard team**

---

### Backend Edge Functions & Services

#### ✅ `workflow-automation/index.ts` — MIGRATED
- [x] Updated `send_notification` action type
- [x] Normalized recipient field in fan-out logic
- [x] Enforces hospital scope on all recipients
- Status: **Ready for production**

#### ✅ `discharge-workflow/index.ts` — MIGRATED
- [x] Updated all escalation notifications
- [x] Uses canonical adapter pattern
- Status: **Ready for production**

#### ⏳ `lab-result-publisher/index.ts` — TODO (if exists)
- [ ] Check critical alert notification structure
- [ ] Migrate to canonical `recipient_id`
- Assigned to: **Lab team**

#### ⏳ `billing-invoice-finalizer/index.ts` — TODO (if exists)
- [ ] Check payment reminder & invoice notifications
- [ ] Migrate to canonical format
- Assigned to: **Billing team**

---

### Adapter & Validation Layer

#### ✅ `src/services/notificationAdapter.ts` — MIGRATED
- [x] Added `recipient_id` canonicalization
- [x] Legacy `user_id` fallback support
- [x] Validates `recipient_id` presence
- [x] Logs adapter-level errors
- Status: **Ready for production**

---

## Migration Steps

### 1. Identify Legacy Callers
Run a search for all instances of `user_id` in notification payloads:
```bash
grep -r "user_id" src/ supabase/functions/ \
  --include="*.ts" --include="*.tsx" \
  | grep -i "notif\|send"
```

**Expected locations:**
- `src/hooks/use*Notifications.ts`
- `src/services/notificationService.ts`
- `supabase/functions/*/index.ts`
- Dashboard components sending alerts

### 2. Test Backward Compatibility
The adapter provides fallback support for existing `user_id` fields:
```typescript
// This still works (with deprecation notice in logs)
const legacyPayload = {
  hospital_id: '...',
  user_id: 'uuid-123',  // ← Still accepted
  // ...
};

await sendNotification(legacyPayload as any);
```

**Verification:**
- Run: `npm run test:unit -- notificationAdapter`
- Expected: All tests pass, adapter logs deprecation warning

### 3. Migrate Each Caller
For each identified caller:

```typescript
// BEFORE
await sendNotification({
  hospital_id: hospitalId,
  user_id: doctorId,        // ❌ Old
  sender_id: administratorId,
  title: 'Patient Checked In',
  message: `Patient ${patientName} is ready`,
  type: 'clinical',
});

// AFTER
await sendNotification({
  hospital_id: hospitalId,
  recipient_id: doctorId,    // ✅ New
  sender_id: administratorId,
  title: 'Patient Checked In',
  message: `Patient ${patientName} is ready`,
  type: 'clinical',
  metadata: {
    patient_id: patientId,
    event_type: 'patient.ready_for_doctor',
    source_role: 'receptionist',
  },
});
```

### 4. Add Unit Tests
Each migrated hook/function should have unit tests:

```typescript
describe('useAppointmentMutations - notifications', () => {
  it('sends canonical recipient_id notification', async () => {
    const spy = vi.spyOn(notificationAdapter, 'sendNotification');
    
    await cancelAppointment(appointmentId);
    
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_id: expect.any(String),  // ✅ Not user_id
        hospital_id: hospitalId,
      })
    );
  });
});
```

### 5. Run Integration Tests
Before merging, run full E2E notification flow tests:

```bash
npm run test:integration -- --grep "notification"
```

### 6. Verify in Staging
Deploy to staging and verify:
- Notifications arrive at correct recipients
- Metadata is present in notification record
- Admin dashboard shows notification history correctly

---

## Migration Dependency Graph

```
1. Adapter & Contracts (DONE)
   ↓
2. useWorkflowOrchestrator (DONE)
   ↓
3. Edge Functions (DONE for workflow-automation, discharge-workflow)
   ├─→ workflow-automation (DONE)
   ├─→ discharge-workflow (DONE)
   └─→ lab-result-publisher (TODO)
   └─→ billing-finalizer (TODO)
   ↓
4. Frontend Hooks (TODO)
   ├─→ useAppointmentMutations (TODO)
   ├─→ useLabResultsNotifications (TODO)
   ├─→ usePrescriptionNotifications (TODO)
   └─→ Dashboard components (TODO)
   ↓
5. Full E2E Test Coverage (TODO)
   ├─→ Cross-role notification chain (TODO)
   ├─→ Metadata audit trail (TODO)
   └─→ Performance baseline (TODO)
```

---

## Rollback Plan

If issues arise during migration:

1. **Adapter fallback is always active** — legacy callers continue to work
2. **Revert specific file** — use git to revert a single hook/function
3. **Database migration** — notification records are immutable; no cleanup needed
4. **Monitor deprecation logs** — track which callers still use `user_id`:
   ```bash
   # View deprecation warnings
   tail -f /var/log/supabase/functions/notification-adapter.log | grep "deprecated"
   ```

---

## Success Criteria

- [ ] 100% of callers migrated to `recipient_id`
- [ ] Zero deprecation warnings in logs after cutover
- [ ] All E2E tests pass with canonical payload format
- [ ] Notification delivery SLA (< 5s) maintained
- [ ] Audit trail includes metadata for all notifications
- [ ] Cross-hospital notification isolation verified (RLS tests pass)

---

## Owners & Timeline

| Component | Owner | Status | ETA |
|-----------|-------|--------|-----|
| Adapter & Contracts | Platform | ✅ Complete | — |
| Workflow automation | Workflow | ✅ Complete | — |
| Discharge workflow | Workflow | ✅ Complete | — |
| Frontend hooks | Frontend |  ⏳ TODO | Week 2 |
| Lab notifications | Lab | ⏳ TODO | Week 3 |
| Billing notifications | Billing | ⏳ TODO | Week 3 |
| E2E validation | QA | ⏳ TODO | Week 4 |
| Production cutover | PTL | ⏳ TODO | Week 4 |

---

## Troubleshooting

### "user_id is undefined" error
**Cause:** Caller not providing either `user_id` or `recipient_id`  
**Fix:** Add recipient context check to caller:
```typescript
if (!doctorId) {
  console.error('Cannot send notification: recipient not identified');
  return;
}
```

### Notifications not arriving
**Cause:** `hospital_id` mismatch between sender and adapter  
**Fix:** Verify `hospital_id` comes from user context (useAuth):
```typescript
const { hospital } = useAuth();
// Pass hospital.id to all notification calls
```

### Metadata not appearing in audit log
**Cause:** Metadata object not included in payload  
**Fix:** Always add metadata:
```typescript
metadata: {
  patient_id: patientId,
  event_type: event.type,
  source_role: userRole,
}
```

---

## References

- [Notification Adapter Implementation](src/services/notificationAdapter.ts)
- [Workflow Contracts & Audit Context](src/lib/workflow/contracts.ts)
- [HIPAA Compliance Guide](docs/HIPAA_COMPLIANCE.md)
- [Workflow Integration Master Plan](docs/WORKFLOW_INTEGRATION_MASTER_PLAN.md)
