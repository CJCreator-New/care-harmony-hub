# Usability Audit Report: Critical User Workflows

**System:** AROCORD-HIMS (CareSync Hospital Management System)  
**Audit Date:** January 2025  
**Auditor:** Amazon Q Developer  
**Scope:** Patient Registration, Appointment Scheduling, Prescription Workflow, Lab Order & Results, Discharge Process

---

## Executive Summary

This audit evaluates five critical clinical workflows against usability targets for step count, error handling, data loss prevention, confirmation clarity, user feedback, and workflow guidance. The findings identify moderate usability concerns that, if addressed, could significantly improve clinical efficiency and reduce user frustration.

### Overall Assessment

| Workflow | Target | Actual | Status | Priority |
|----------|--------|--------|--------|----------|
| Patient Registration | < 2 min | ~3-4 min | ⚠️ Needs Improvement | High |
| Appointment Scheduling | < 3 clicks | 8-10 clicks | ❌ Not Met | Medium |
| Prescription Workflow | Clear handoff | Partial | ⚠️ Needs Improvement | Medium |
| Lab Order & Results | Full visibility | Limited | ⚠️ Needs Improvement | Medium-High |
| Discharge Process | Sequential & clear | ✅ Clear | ✅ Meets Target | Low |

---

## Summary Table

| Workflow | Steps | Issues Found | Friction Points | Severity |
|----------|-------|--------------|-----------------|----------|
| **Patient Registration** | 4 tabs (Personal → Contact → Medical → Insurance) + Submit | ✅ Tab validation guards<br>⚠️ No autosave/draft recovery<br>⚠️ No progress indicator<br>⚠️ No unsaved changes warning on close | Many fields required across 4 tabs; user could lose significant work if session interrupted | **Medium** |
| **Appointment Scheduling** | ~6 fields (Patient, Date, Time, Type, Duration, Priority) + Submit | ✅ Clear field grouping<br>⚠️ No unsaved changes warning<br>⚠️ No form persistence<br>⚠️ Doctor selection optional but unclear if needed | Date picker requires multiple clicks; time slots in long list | **Low** |
| **Prescription Workflow** | Create → Sign → Verify → Dispense | ✅ Drug interaction warnings<br>✅ Allergy conflict detection<br>✅ Clinical safety validation<br>⚠️ No autosave during prescription creation<br>⚠️ Multi-role handoff unclear | Multiple screens; must manually verify each step | **Medium** |
| **Lab Order & Results** | Order → Sample → Process → Result → Approve | ✅ Discard confirmation dialog<br>✅ Patient selection validation<br>⚠️ No status visibility to ordering clinician<br>⚠️ No specimen tracking visible | Status changes not clearly communicated to all stakeholders | **Medium-High** |
| **Discharge Process** | 7 sequential steps (Initiate → Clinical → Nurse → Pharmacy → Billing → Checkout → Finalize) | ✅ Clear timeline visualization<br>✅ Role-based action permissions<br>✅ Real-time status updates<br>⚠️ No indication of estimated time for each step<br>⚠️ Cancel reason required but not validated | Multi-role dependency creates bottlenecks; no parallel processing | **Low-Medium** |

---

## Detailed Findings by Workflow

### 1. Patient Registration & Admission

**Target:** < 2 minutes  
**Actual:** ~3-4 minutes  
**Status:** ⚠️ Needs Improvement

#### Step Count
4 tabbed sections + final submission (~25 form fields total)
- Tab 1: Personal (4 required fields)
- Tab 2: Contact (address + emergency contact)
- Tab 3: Medical (blood type, allergies, conditions)
- Tab 4: Insurance (optional)

#### Issues Identified

| Category | Finding | Severity |
|----------|---------|----------|
| Data Loss Prevention | ❌ No form data persistence - If browser crashes or user navigates away, all data lost | High |
| Data Loss Prevention | ❌ No unsaved changes warning - Modal can be closed without confirmation | High |
| Validation | ✅ Tab validation guards prevent advancing with invalid required fields | Good |
| Error Handling | ⚠️ Auto-navigates to error tab on submit, but errors not visually prominent | Medium |
| Progress Guidance | ⚠️ No progress indicator - User doesn't know how many tabs remain | Low |

#### Error Handling Analysis

**Current Error Messages:**
```
"Something went wrong"
"Registration failed"
"No hospital associated with your account"
```

**Assessment:** 
- Generic messages not actionable
- User doesn't know what to fix or how to recover
- No differentiation between validation errors and system errors

#### Code References

- Component: `src/components/patients/PatientRegistrationModal.tsx`
- Hook: `useSessionStorageForm` exists but **not implemented** for this form

#### Recommendations

1. **Implement draft recovery** - Use existing `useSessionStorageForm` hook for autosave
2. **Add unsaved changes dialog** - Warn user before closing with dirty form
3. **Add progress indicator** - Show "Step 1 of 4" with completion checkmarks
4. **Improve error messages** - Make specific and actionable:
   - ❌ "Registration failed"
   - ✅ "Unable to generate MRN. Please try again or contact support."

---

### 2. Appointment Scheduling

**Target:** < 3 clicks to schedule  
**Actual:** 8-10 clicks minimum  
**Status:** ❌ Not Met

#### Step Count
6 required fields + 2 optional + Submit
1. Select Patient (search + click)
2. Select Date (open calendar + click)
3. Select Time (scroll + click)
4. Select Appointment Type (dropdown)
5. Select Duration (dropdown)
6. Select Priority (dropdown)
7. Optional: Select Doctor
8. Optional: Enter reason/notes
9. Submit

#### Issues Identified

| Category | Finding | Severity |
|----------|---------|----------|
| Data Loss Prevention | ❌ No form persistence - Data lost on navigation | Medium |
| Navigation | ⚠️ Time slot list overwhelming - 26 time slots in single list | Low |
| Clarity | ⚠️ Doctor field optional but unclear if should be selected now or later | Low |
| Layout | ✅ Clear visual hierarchy with logical field grouping | Good |

#### Error Handling Analysis

**Current Implementation:**
- Validation errors shown inline below fields
- Generic error handling via toast notification
- No specific error for scheduling conflicts

#### Code References

- Component: `src/components/appointments/ScheduleAppointmentModal.tsx`
- Simple implementation: `src/components/patient/AppointmentScheduler.tsx`

#### Recommendations

1. **Add "Quick Schedule" mode** - Minimal fields only (Patient + Date/Time + Type)
2. **Implement form persistence** - Use `useSessionStorageForm` hook
3. **Add smart doctor suggestions** - Auto-suggest based on appointment type
4. **Improve time slot UX** - Consider visual timeline instead of dropdown list

---

### 3. Prescription Workflow

**Workflow:** Create → Sign → Verify → Dispense  
**Status:** ⚠️ Needs Improvement

#### Step Count (Variable)

**Create Phase:**
- Search/select medication
- Specify dosage, frequency, duration, route, quantity
- Review clinical warnings
- Save prescription

**Verify Phase:** 1 click (Pharmacist)

**Dispense Phase:** 1 click (Pharmacist)

#### Issues Identified

| Category | Finding | Severity |
|----------|---------|----------|
| Clinical Safety | ✅ Drug interaction warnings implemented | Good |
| Clinical Safety | ✅ Allergy conflict detection with blocking | Good |
| Clinical Safety | ✅ Age-appropriate dosing validation | Good |
| Data Loss Prevention | ❌ No autosave during multi-medication entry | High |
| Handoff Clarity | ⚠️ Status unclear to doctor after creation | Medium |
| Compliance | ⚠️ No explicit electronic signature action | Medium |

#### Error Handling Analysis

**Current Implementation:**
- ✅ Specific error messages for clinical safety issues
- ✅ Toast notifications for success/failure
- ✅ Blocks save on allergy conflicts with clear message

**Example Good Error:**
```
"Allergy Conflict Detected: Amoxicillin conflicts with patient allergy: Penicillin"
```

#### Code References

- Enhanced Form: `src/components/doctor/EnhancedPrescriptionForm.tsx`
- Builder: `src/components/doctor/PrescriptionBuilder.tsx`
- Queue: `src/components/pharmacy/EnhancedPrescriptionQueue.tsx`
- Hook: `src/hooks/usePrescriptions.ts`

#### Recommendations

1. **Add "Save Draft" functionality** - For complex multi-medication prescriptions
2. **Implement explicit "Sign/Approve" action** - Add electronic signature requirement
3. **Add prescription status timeline** - Visible to all stakeholders (doctor, pharmacist, nurse)
4. **Consider parallel verification** - Allow pharmacy to start review while doctor finalizing

---

### 4. Lab Order & Results

**Workflow:** Order → Sample → Process → Result → Approve  
**Status:** ⚠️ Needs Improvement

#### Step Count
5 sequential steps across multiple roles:
1. **Order** - Clinician creates lab order
2. **Sample Collection** - Lab tech collects specimen
3. **Processing** - Lab tech processes sample
4. **Result Entry** - Lab tech enters results
5. **Approval** - Pathologist/supervisor approves

#### Issues Identified

| Category | Finding | Severity |
|----------|---------|----------|
| Data Loss Prevention | ✅ Discard confirmation dialog prevents accidental closure | Good |
| Validation | ✅ Patient selection validation with clear error | Good |
| Visibility | ❌ No specimen collection status visible to ordering clinician | High |
| Safety | ❌ No critical result alerts or escalation | Critical |
| Communication | ⚠️ No notification when results ready for clinician review | Medium |

#### Error Handling Analysis

**Current Implementation:**
- Generic errors with `error.message` displayed
- ✅ Telemetry logging for failed orders
- No specific handling for critical lab values

#### Code References

- Create Modal: `src/components/lab/CreateLabOrderModal.tsx`
- Queue: `src/components/lab/EnhancedLabOrderQueue.tsx`
- Form: `src/components/laboratory/EnhancedLabOrderForm.tsx`
- Hook: `src/hooks/useLabOrders.ts`

#### Recommendations

1. **Add real-time status tracking** - Visible to ordering clinician at all times
2. **Implement critical value alerts** - With escalation protocol
3. **Add result-ready notifications** - Push notification to ordering clinician
4. **Consider specimen tracking** - QR/barcode scanning with status updates

---

### 5. Discharge Process

**Workflow:** 7 sequential steps across 4 roles  
**Status:** ✅ Meets Target

#### Step Count
1. **Initiate** - Doctor starts discharge
2. **Clinical Clearance** - Doctor approves
3. **Nurse Confirmation** - Nurse confirms patient status
4. **Medication Reconciliation** - Pharmacist reviews medications
5. **Financial Clearance** - Billing clears charges
6. **Checkout** - Receptionist processes departure
7. **Finalize** - System completes record

#### Issues Identified

| Category | Finding | Severity |
|----------|---------|----------|
| Visualization | ✅ Clear timeline showing all steps and current position | Good |
| Permissions | ✅ Role-based action controls properly implemented | Good |
| Real-time Updates | ✅ Supabase Realtime for live status changes | Good |
| Expectations | ⚠️ No time estimates for each step | Low |
| Efficiency | ⚠️ All steps must be sequential, no parallel processing | Low |
| Validation | ⚠️ Cancel reason required but not validated for empty input | Low |

#### Error Handling Analysis

**Current Implementation:**
- Specific error messages via toast
- ✅ Complete audit trail for all workflow actions
- ✅ Real-time error propagation via subscriptions

#### Code References

- Card Component: `src/components/discharge/DischargeWorkflowCard.tsx`
- Timeline: `src/components/discharge/DischargeWorkflowTimeline.tsx`
- Hook: `src/hooks/useDischargeWorkflow.ts`
- Queue Components: `DoctorDischargeQueue.tsx`, `NurseDischargeQueue.tsx`, `BillingDischargeQueue.tsx`

#### Recommendations

1. **Add estimated duration** - Show typical time for each step
2. **Enable parallel processing** - Where clinically safe (e.g., financial while pharmacy reviewing)
3. **Validate cancel reason** - Require non-empty reason text
4. **Add discharge checklist** - Items to complete before each step advances

---

## Cross-Cutting Issues

### Error Messages

**Current State:** Mix of specific (clinical safety) and generic (`"Something went wrong"`)

**Issues:**
- Inconsistent specificity across workflows
- Not always actionable
- No recovery suggestions provided

**Recommendation:** Standardize error message format:

```
{
  title: "Specific Error Title",
  description: "What happened and why",
  action: "What the user should do next",
  severity: "error" | "warning" | "info"
}
```

**Example Transformation:**

| Before | After |
|--------|-------|
| "Something went wrong" | "Unable to save patient record. The MRN generation service is temporarily unavailable. Please try again in 30 seconds or contact IT support." |
| "Registration failed" | "Patient registration failed: A patient with MRN 'MRN-001234' already exists. Please verify the patient information or search for the existing record." |

---

### Form Recovery

**Current State:** 
- `useSessionStorageForm` hook exists but not used in critical forms
- No autosave functionality implemented
- Users can lose significant data entry on navigation/error

**Recommendation:** Implement for all forms with > 5 fields:

| Form | Fields | Priority | Status |
|------|--------|----------|--------|
| Patient Registration | 25 | High | Not Implemented |
| Appointment Scheduling | 8 | Medium | Not Implemented |
| Prescription Builder | Variable | High | Not Implemented |
| Lab Order Creation | 6 | Medium | Not Implemented |
| Discharge Initiation | ~3 | Low | Not Needed |

**Implementation Pattern:**
```typescript
const [formData, setFormData, clearSession] = useSessionStorageForm(
  'patient-registration',
  initialFormValues
);

// Clear on successful submit
const onSubmit = async (data) => {
  await savePatient(data);
  clearSession(); // Clear saved draft
  closeModal();
};
```

---

### Offline Handling

**Current State:** No visible offline handling or graceful degradation

**Issues:**
- No offline indicator
- Mutations fail silently or with generic errors
- No retry queue for failed operations

**Recommendation:** Implement offline support:

1. **Visual indicator** - Banner when connection lost
2. **Queue mutations** - Store locally, retry on reconnect
3. **Read-only mode** - Allow viewing cached data while offline
4. **Existing hook available** - `useOfflineSync`, `useOfflineErrorRecovery` exist in codebase

---

### Help & Documentation

**Current State:** 
- No inline help or tooltips
- No guided workflows
- No contextual assistance

**Recommendation:** Add multi-level help system:

1. **Inline tooltips** - Hover help icons for field explanations
2. **Contextual help panels** - Right-side panel with workflow-specific guidance
3. **Guided tours** - First-time user walkthroughs for complex workflows
4. **Help links** - Direct links to relevant documentation sections

**Priority Areas:**
- Clinical workflows (prescription safety warnings, lab critical values)
- Role-specific features (what each role can see/do)
- Error recovery (what to do when operations fail)

---

### Next Steps Guidance

**Current State:** 
- Empty states show "No items" text
- No clear call-to-action
- User must know how to proceed

**Current Example:**
```
"No patients found"
```

**Recommended Pattern:**
```
<div className="empty-state">
  <h3>No appointments scheduled</h3>
  <p>Get started by scheduling your first appointment</p>
  <Button onClick={openScheduleModal}>
    <Plus /> Schedule Appointment
  </Button>
</div>
```

**Apply to:**
- Appointment lists
- Patient lists
- Prescription queue (empty state)
- Lab order queue (empty state)
- Discharge queue (empty state)

---

## Priority Fixes

### High Priority (Implement within 2 weeks)

1. **Implement form persistence for Patient Registration**
   - Use `useSessionStorageForm` hook
   - Highest data entry volume
   - Highest risk of data loss frustration

2. **Add unsaved changes warnings to all modal forms**
   - Patient Registration Modal
   - Schedule Appointment Modal
   - Create Lab Order Modal
   - Prescription Builder

3. **Add critical result alerts for Lab Orders**
   - Patient safety concern
   - Regulatory compliance need

### Medium Priority (Implement within 4 weeks)

4. **Improve error message specificity**
   - Create error message standards
   - Update all generic error messages
   - Add recovery suggestions

5. **Add status visibility for Lab Orders**
   - Clinician-facing status tracking
   - Real-time updates
   - Result-ready notifications

6. **Implement electronic signature for Prescriptions**
   - Explicit "Sign" action
   - Audit trail enhancement
   - Compliance improvement

### Low Priority (Implement within 8 weeks)

7. **Add time estimates to Discharge workflow**
   - Historical average per step
   - Bottleneck identification
   - Process improvement insights

8. **Implement offline handling**
   - Connection status indicator
   - Mutation queue
   - Graceful degradation

9. **Add help system**
   - Inline tooltips
   - Contextual help panels
   - Guided tours

---

## Testing Recommendations

### User Acceptance Testing Scenarios

#### Patient Registration
- [ ] User can complete registration in < 2 minutes
- [ ] User receives warning when closing with unsaved changes
- [ ] Form data persists if browser accidentally closed
- [ ] Clear error messages guide user to fix issues
- [ ] Progress indicator shows completion status

#### Appointment Scheduling
- [ ] User can schedule appointment in < 3 clicks (quick mode)
- [ ] Form data persists across navigation
- [ ] Clear feedback on successful scheduling
- [ ] Time slots easy to navigate and select

#### Prescription Workflow
- [ ] Drug interactions clearly warned before save
- [ ] Allergy conflicts block inappropriate prescriptions
- [ ] Draft saves automatically during complex entry
- [ ] Status visible to all stakeholders

#### Lab Order & Results
- [ ] Clinician can see order status at all times
- [ ] Critical results trigger immediate alerts
- [ ] Result-ready notifications sent automatically
- [ ] Discard confirmation prevents accidental data loss

#### Discharge Process
- [ ] Timeline clearly shows current step
- [ ] Only authorized roles can advance workflow
- [ ] Real-time updates visible to all participants
- [ ] Estimated time for each step displayed

---

## Metrics to Track

### Performance Metrics

| Metric | Target | Current | Measurement Method |
|--------|--------|---------|-------------------|
| Registration completion time | < 2 min | ~3-4 min | Analytics timing |
| Scheduling clicks | < 3 | 8-10 | Click tracking |
| Form abandonment rate | < 5% | Unknown | Funnel analytics |
| Error recovery rate | > 90% | Unknown | Error tracking + success follow-up |
| Time to first appointment | < 5 min | Unknown | Onboarding analytics |

### User Satisfaction Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Task completion rate | > 95% | Success/failure tracking |
| User satisfaction (NPS) | > 40 | Periodic survey |
| Support tickets related to UX | < 5/week | Ticket categorization |
| Training time for new users | < 2 hours | Onboarding tracking |

---

## Appendix: Component Reference

### Key Files Reviewed

| Component | Path | Purpose |
|-----------|------|---------|
| PatientRegistrationModal | `src/components/patients/PatientRegistrationModal.tsx` | Patient registration form |
| ScheduleAppointmentModal | `src/components/appointments/ScheduleAppointmentModal.tsx` | Appointment scheduling |
| EnhancedPrescriptionForm | `src/components/doctor/EnhancedPrescriptionForm.tsx` | Clinical prescription form |
| PrescriptionBuilder | `src/components/doctor/PrescriptionBuilder.tsx` | Medication builder UI |
| EnhancedPrescriptionQueue | `src/components/pharmacy/EnhancedPrescriptionQueue.tsx` | Pharmacy queue |
| CreateLabOrderModal | `src/components/lab/CreateLabOrderModal.tsx` | Lab order creation |
| DischargeWorkflowCard | `src/components/discharge/DischargeWorkflowCard.tsx` | Discharge workflow UI |
| useSessionStorageForm | `src/hooks/useSessionStorageForm.ts` | Form persistence hook |
| usePrescriptions | `src/hooks/usePrescriptions.ts` | Prescription operations |
| useLabOrders | `src/hooks/useLabOrders.ts` | Lab order operations |
| useDischargeWorkflow | `src/hooks/useDischargeWorkflow.ts` | Discharge workflow logic |

---

## Conclusion

The AROCORD-HIMS system demonstrates strong clinical safety features (drug interactions, allergy warnings, role-based access) but requires improvement in user experience fundamentals:

**Strengths:**
- Comprehensive clinical validation
- Role-based workflow controls
- Real-time updates via Supabase
- Clear visualization in discharge workflow

**Areas for Improvement:**
- Form data persistence and recovery
- Specific, actionable error messages
- Status visibility across workflows
- Offline handling and graceful degradation
- Inline help and guidance

**Business Impact:**
- Improved user satisfaction and adoption
- Reduced support burden
- Faster clinical workflows
- Better patient safety through clear communication

---

**Report Version:** 1.0  
**Last Updated:** January 2025  
**Next Review:** After priority fixes implemented
