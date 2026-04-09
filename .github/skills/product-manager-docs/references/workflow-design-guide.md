# Workflow Design Guide

Comprehensive guide for designing multi-role clinical workflows in CareSync HIMS.

## When to Use

- Designing workflows involving 2+ roles
- Planning approval chains or conditional branches
- Defining notifications and escalations
- Handling rejection/retry scenarios

## Core Principles

1. **Single Responsibility**: Each role has clear, distinct responsibilities
2. **State Transitions**: Every step has a defined trigger and resulting state
3. **No Ambiguity**: "What happens if X rejects Y?" must be answered
4. **Error Paths**: Every failure has a recovery path (retry, escalate, cancel)
5. **Audit Trail**: Every state change is logged (actor, action, timestamp, reason)

## Template: Multi-Role Workflow

### Workflow: [Name]
**Roles Involved**: [Doctor, Nurse, Pharmacist, etc.]  
**Trigger**: [What starts this workflow?]  
**Success Outcome**: [Final state when complete]  

#### State Diagram
```
[Start] → [State 1: Created] → [State 2: Approved] → [State 3: Complete]
            ↓                     ↓
            [Rejected] → [Revision] → [Resubmitted]
```

#### Step-by-Step Flowchart

| Step | Actor | Action | Trigger | Next State | Notes |
|------|-------|--------|---------|-----------|-------|
| 1 | Doctor | Create order (patient, drug, dose) | Manual button click | "Draft" | Prescription is mutable at this stage |
| 2 | Doctor | Review interactions, allergies | System validation complete | "Ready for Sign" | Auto-flags any contraindications |
| 3 | Doctor | Sign prescription (1-click e-sig) | Doctor confirms | "Signed" | Immutable; logged to audit trail |
| 4 | System | Notify pharmacy + patient | Signature recorded | "Pending Dispense" | Real-time SMS/email |
| 5 | Pharmacist | Review prescription, verify inventory | Notification received | "In Stock" or "Out of Stock" | Pharmacist executes within 1 hour SLA |
| 6 | Pharmacist | Dispense & log lot number | Physical medication dispensed | "Dispensed" | Patient can now pick up |
| 7 | Patient | Pickup prescription | Patient arrives at pharmacy | "Picked Up" | Workflow complete |

#### Branch: Rejection by Pharmacist

| Step | Actor | Action | Trigger | Next State | Notes |
|------|-------|--------|---------|-----------|-------|
| 5a | Pharmacist | Click "Reject" (reason mandatory) | Inventory unavailable OR safety concern | "Rejected" | Doctor notified; patient notified |
| 5b | Doctor | Receive notification of rejection | Email + in-app alert | "Review Rejection" | Doctor decides: modify, cancel, or retry |
| 5c | Doctor | Either (a) modify dose/drug, (b) cancel | Doctor action | Back to Step 2 (if modified) or "Cancelled" (if cancel) | Modification triggers new signature |

#### Notifications

| Recipient | Event | Channel | Timeline | Content |
|-----------|-------|---------|----------|---------|
| Pharmacist | Prescription signed | In-app + Email | Immediate | Rx for [Patient], [Drug] [Dose], by Dr. [Name] |
| Patient | Pharmacy ready | SMS + Email | After dispensing | "Your prescription for [Drug] is ready for pickup" |
| Doctor | Rejection | In-app alert + Email | On reject | "Rx for [Patient] rejected: [Reason]" + link to modify |

---

## Example 1: Lab Result Approval Workflow

### Actors
- **Lab Tech**: Enters test results
- **Doctor**: Approves results and acts on them
- **Patient**: Receives notification of results

### States
```
[Ordered] → [Sample Collected] → [Testing] → [Result Entered] → [Pending Approval]
                                                                      ↓
                                                              [Approved by Doctor]
                                                                      ↓
                                                            [Notification Sent]
                                                                      ↓
                                                              [Complete]
```

### Key Rules

- **Who can approve?** Only board-certified physicians
- **Abnormal flags**: Results outside normal range automatically flagged (red alert)
- **Critical values**: Results >3σ from normal trigger immediate phone call to doctor
- **Modification window**: Doctor can view but not modify approved results; changes require full re-approval
- **Retention**: Results kept for 7 years (legal requirement)

### Workflow Steps

1. **Lab Tech enters result** (e.g., glucose = 185 mg/dL)
   - System checks normal range: 70–100 = ABNORMAL
   - Status: "Pending Approval" (auto-flagged red)

2. **System notifies doctor**
   - Alert: "Abnormal result for [Patient]: [Test] = [Value] (normal: [Range])"
   - Flag color: RED (abnormal), YELLOW (mild abnormal), GREEN (normal)

3. **Doctor reviews & approves**
   - Doctor clicks "Approve"; signature recorded with timestamp
   - System compares to prior results (trending up/down?)
   - Doctor notes action taken (e.g., "Contacted patient; advised to recheck in 1 week", "Referred to endocrinology")

4. **Result notification sent to patient**
   - Patient sees: "[Test] result available. View in patient portal"
   - Normal results: Standard message
   - Abnormal results: "You have an abnormal result. Doctor [Name] has reviewed it and left instructions."

5. **Audit log records**
   ```
   Lab entry: [2026-04-08 10:30] Lab tech [John Smith] entered glucose = 185
   System flag: [2026-04-08 10:30] ABNORMAL (normal: 70-100)
   Approval: [2026-04-08 10:45] Dr. [Jane Doe] approved, notes: "Recheck in 1 week"
   Patient notification: [2026-04-08 10:46] SMS sent
   ```

---

## Example 2: Multi-Approval Workflow (High-Cost Procedure)

### Scenario: Elective surgery authorization

**Roles**: Doctor, Surgeon, Hospital CFO, Patient

### States & Condition

```
[Surgeon orders] 
  → [Awaiting Authorization]
    ├─→ If cost <$5K → [Approved by Doctor]
    ├─→ If cost $5K-$25K → [Awaiting CFO approval]
    └─→ If cost >$25K → [Awaiting both Doctor & Board approval]
      → [Approved]
      → [Patient consents] (signature)
      → [Scheduled]
      → [Complete]
```

### Details

| Step | Actor | Condition | Action | Approval Time SLA | Escalation If Delayed |
|------|-------|-----------|--------|---|---|
| 1 | Surgeon | Any order | Submit surgery order with estimated cost | — | — |
| 2 | System | Cost <$5K | Automatically approve (low-risk) | — | — |
| 2b | Doctor | Cost $5-25K | Review + approve/reject | 24 hours | CFO escalate |
| 2c | CFO + Board | Cost >$25K | Joint approval required | 48 hours | CEO escalate |
| 3 | Patient | Order approved | Review consent form + sign electronically | N/A | Staff calls patient |
| 4 | Hospital | All approvals + consent | Schedule operating room + notify surgeon | — | — |

---

## Common Anti-Patterns (What NOT to Do)

❌ **Missing error path**: "If approval times out, then... [nothing]"  
✅ **Fix**: Define escalation: "If no approval in 24h, notify manager and escalate to VP"

❌ **Ambiguous actor**: "The team approves the request"  
✅ **Fix**: "The Department Head approves; if absent >4h, the Deputy Head approves"

❌ **State not tracked**: "Pharmacist fills prescription" (but no DB state update)  
✅ **Fix**: System updates state to "Dispensed", records actor + timestamp

❌ **No failure recovery**: "Notification sent to doctor" (but what if email fails?)  
✅ **Fix**: "SMS sent first; if no response in 1h, escalate to department manager"

❌ **Missing audit**: "Doctor approved result"  
✅ **Fix**: Audit log: [timestamp, doctor_id, action, old_value, new_value, reason]

---

## Designing for CareSync Specifics

### Authorization & RLS

All workflow steps must respect Supabase Row-Level Security:
- Doctor can only approve prescriptions for patients in their hospital
- Lab tech can only enter results for assigned tests
- Pharmacist can only dispense from their pharmacy location

### Notifications

- **Real-time**: In-app alerts (TanStack Query subscriptions)
- **Deferred**: Email + SMS (use Edge Functions, background jobs)
- **Critical**: Phone call (Twilio; reserved for critical values)

### Audit Trail

Every action must log:
- `actor_id`, `actor_role`, `action`, `timestamp`, `old_value`, `new_value`, `reason` (if applicable)
- IP address, user agent (for forensics)
- Encrypted, immutable, retained 7 years

### PHI Handling

- All patient data encrypted at rest
- Encryption metadata stored in `encryption_metadata` JSONB
- Logged actions sanitized; no PHI in error messages

---

## Checklist for New Workflows

- [ ] All roles identified; responsibilities clear
- [ ] All states defined; transitions clear
- [ ] All rejection/error paths handled
- [ ] Notifications planned (recipient, event, channel, timing)
- [ ] Approval time SLAs defined
- [ ] Escalation paths if approval delayed
- [ ] RLS permissions enforced per role
- [ ] Audit trail captures all actions
- [ ] PHI handled securely (encrypted, sanitized logging)
- [ ] Edge cases identified and handled (person unavailable, system down, etc.)
- [ ] Clinical safety guardrails in place

---

**Example Workflows Already in CareSync**:
- Appointment scheduling (patient books → receptionist confirms → doctor sees)
- Prescription workflow (doctor orders → pharmacist dispenses → patient pickup)
- Lab ordering (doctor orders → lab tech executes → doctor approves → patient views)
- Billing workflow (encounter finalized → billing codes selected → claim submitted → payment tracked)

Review existing workflows in `/docs/product/workflows/` for implementation details.
