# Phase 2B: Quick Reference Card

**Status:** ✅ COMPLETE | **Date:** March 13, 2026 | **Files:** 7 | **Lines:** 2,810

---

## 🚀 Quick Start

### 1. Add Amendment Button (30 min)
```typescript
import { AmendmentModal } from '@/components/audit/AmendmentModal';
import { useState } from 'react';

{hasRole('doctor') && prescription?.status === 'approved' && (
  <Button onClick={() => setAmendmentOpen(true)}>Edit Dosage</Button>
)}

<AmendmentModal
  isOpen={amendmentOpen}
  onClose={() => setAmendmentOpen(false)}
  prescriptionId={prescriptionId}
  items={prescription?.items}
  patientName={patient?.name}
/>
```

### 2. Show Amendment Timeline (20 min)
```typescript
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';

<ForensicTimeline prescriptionId={prescriptionId} />
```

### 3. Show Pharmacist Alerts (30 min)
```typescript
import { useAmendmentAlert } from '@/hooks/useAmendmentAlert';

const { unreviewedAlerts } = useAmendmentAlert({
  enabled: profile?.primary_role === 'pharmacist',
});

{unreviewedAlerts.map(alert => (
  <AlertCard key={alert.id} alert={alert} />
))}
```

### 4. Hook Up Real-Time (15 min)
```typescript
// In App.tsx
import { useAmendmentAlert } from '@/hooks/useAmendmentAlert';

export function App() {
  useAmendmentAlert({ enabled: true }); // Auto-enables for pharmacists
  return <...>
}
```

---

## 📦 Deliverables

| File | Lines | Purpose |
|------|-------|---------|
| `useForensicQueries.ts` | 285 | Amendment chain queries |
| `useAmendmentAlert.ts` | 295 | Real-time alert hook |
| `AmendmentModal.tsx` | 420 | Amendment form component |
| `ForensicTimeline.tsx` | 405 | Timeline viewer component |
| `useAmendmentPhase2B.test.ts` | 665 | Test suite (20+ tests) |
| `PHASE_2B_INTEGRATION_GUIDE.md` | 495 | Integration steps |
| `PHASE_2B_COMPONENT_EXAMPLES.md` | 650 | Code examples |

---

## 🔌 Hook API

### `usePrescriptionAmendmentChain(prescriptionId)`
```typescript
const { data, isLoading, error } = usePrescriptionAmendmentChain('rx_123');

data: PrescriptionAmendmentRecord[]
  ├─ sequence_number
  ├─ audit_id
  ├─ event_time (UTC)
  ├─ actor_email
  ├─ action_type ('CREATE', 'APPROVE', 'AMEND', etc.)
  ├─ dosage_before/after
  ├─ change_reason
  └─ amendment_justification
```

### `useAmendmentAlert(options)`
```typescript
const {
  unreviewedAlerts,
  allAlerts,
  acknowledgeAlert,
  clearAlert,
  dismissAllAlerts,
  isSubscribed,
} = useAmendmentAlert({
  enabled: true,
  onAlertReceived: (alert) => {},
  showToasts: true,
  messageFormatter: (alert) => `Dr. ${alert.doctor_name} amended Rx...`,
});

unreviewedAlerts: AmendmentAlert[]
  ├─ prescription_id
  ├─ doctor_name
  ├─ dosage_before/after
  ├─ change_reason
  ├─ amendment_justification
  ├─ timestamp
  └─ reviewed: boolean
```

### `useAuditQuery(options)`
```typescript
const { data } = useAuditQuery({
  entityType: 'prescription',
  entityId: 'rx_123',
  actorRole: 'doctor',
  actionType: 'AMEND',
  dateFrom: new Date(...),
  dateTo: new Date(...),
});

data: AuditLogEntry[] (filtered audit records)
```

---

## 📋 Component Props

### `<AmendmentModal />`
```typescript
<AmendmentModal
  isOpen={boolean}
  onClose={() => {}}
  prescriptionId={string}
  items={PrescriptionItem[]}
  patientName={string}
  onAmendmentSuccess={(amendmentId) => {}}
/>
```

### `<ForensicTimeline />`
```typescript
<ForensicTimeline
  prescriptionId={string}
  showOwnOnly={boolean} // Doctor sees own only
/>
```

---

## 🧪 Test

```bash
# Unit tests
npm run test:unit -- --grep "Phase 2B"

# Integration tests
npm run test:integration -- --grep "amendment"

# All audit tests
npm run test:unit -- --grep "audit|amendment"
```

---

## 🔒 Security

| Item | Check |
|------|-------|
| RLS | Hospital_id scoping on all queries ✅ |
| Immutable | UPDATE/DELETE blocked on audit tables ✅ |
| No API Changes | All existing endpoints unchanged ✅ |
| No Schema Changes | Phase 2A migrations sufficient ✅ |
| RPC Only | Amendment via RPC function ✅ |
| Read-Only | Frontend is immutable consumer ✅ |

---

## ⚙️ RPC Functions (Phase 2A)

Called by Phase 2B components:

```sql
amend_prescription_dosage(
  p_prescription_id UUID,
  p_item_id UUID,
  p_old_dosage TEXT,
  p_new_dosage TEXT,
  p_old_quantity INT,
  p_new_quantity INT,
  p_amendment_reason TEXT,
  p_amendment_justification TEXT,
  p_amending_doctor_id UUID
) RETURNS UUID
```

```sql
get_prescription_amendment_chain(p_prescription_id UUID)
  RETURNS TABLE(sequence_number INT, audit_id UUID, ...)
```

---

## 📡 Real-Time Channel

```typescript
supabase
  .channel(`amendment_alerts_${hospital_id}`)
  .on('postgres_changes', { 
    event: 'UPDATE', 
    schema: 'public', 
    table: 'prescriptions' 
  }, payload => {...})
  .subscribe()
```

---

## 🎯 Common Patterns

### Show Amendment Only to Doctors with Approved Prescription
```typescript
{hasRole('doctor') && prescription?.status === 'approved' && (
  <Button onClick={() => setAmendmentOpen(true)}>Edit Dosage</Button>
)}
```

### Doctor Sees Own Amendments Only
```typescript
<ForensicTimeline prescriptionId={id} showOwnOnly={true} />
```

### Admin Sees All Amendments
```typescript
<ForensicTimeline prescriptionId={id} showOwnOnly={false} />
```

### Pharmacist Gets Real-Time Alerts
```typescript
const { unreviewedAlerts } = useAmendmentAlert({
  enabled: profile?.primary_role === 'pharmacist',
});
```

### Refresh Timeline After Amendment
```typescript
<AmendmentModal
  onAmendmentSuccess={() => {
    // Auto-refreshes via query invalidation (manual refresh not needed)
  }}
/>
```

---

## 📊 Data Flow

```
Amendment Submission:
  Doctor edits dosage
  → AmendmentModal.onSubmit()
  → amend_prescription_dosage() RPC
  → audit_log entry created (action_type='AMEND')
  → Toast: "Amendment submitted"
  → ForensicTimeline refetched
  → Pharmacist gets Realtime alert

Alert Handling:
  Doctor amends prescription
  → RPC publishes to Realtime channel
  → useAmendmentAlert receives notification
  → Toast fires: "Dr. Smith amended Rx..."
  → Pharmacist clicks "Review"
  → Navigate to prescription detail
  → See full ForensicTimeline
  → Acknowledge alert (dismiss)
```

---

## 🚨 Troubleshooting

### "Amendment modal doesn't appear"
- Check: `hasRole('doctor')` returns true
- Check: `prescription.status === 'approved'`
- Check: `items` prop is not empty

### "Real-time alerts not arriving"
- Check: Supabase Realtime enabled in project
- Check: Browser console for subscription errors
- Check: Prescription table has amendment fields

### "Timeline shows no amendments"
- Check: Phase 2A shifts deployed
- Check: `get_prescription_amendment_chain()` RPC exists
- Check: Hospital_id matches current user

### "RLS rejection: not authorized"
- Check: User's hospital_id matches prescription's hospital_id
- Check: `hospital_id` parameter included in all queries

---

## 📚 Full Docs

- **Integration Guide:** `docs/PHASE_2B_INTEGRATION_GUIDE.md`
- **Component Examples:** `docs/PHASE_2B_COMPONENT_EXAMPLES.md`
- **Delivery Summary:** `docs/PHASE_2B_DELIVERY_SUMMARY.md`
- **Phase 2A Guide:** `docs/PHASE_2A_IMPLEMENTATION_GUIDE.md`

---

## ✅ Checklist

- [ ] Phase 2A migrations deployed
- [ ] Amendment button added to prescription detail
- [ ] ForensicTimeline wired in
- [ ] Pharmacist dashboard shows amendment alerts
- [ ] Real-time hook enabled in App.tsx
- [ ] Unit tests passing: `npm run test:unit -- --grep "Phase 2B"`
- [ ] E2E test: Doctor amend → Pharmacist alert → Timeline refresh
- [ ] CSV export works in ForensicTimeline
- [ ] RLS enforcement verified (cross-hospital query blocked)

---

**Phase 2B is production-ready. Integration takes ~3-4 hours.**

Questions? See docs or run: `npm run test:unit -- --grep "Phase 2B"`
