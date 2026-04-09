# Domain Expert Checklist

Use this checklist to validate **medical accuracy** before finalizing your BRD.

## Clinical Workflow Validity

- [ ] **Workflow steps make sense medically** (correct order, nothing missing?)
- [ ] **Doctor has authority** to perform all specified actions (e.g., only doctors can prescribe, not nurses)
- [ ] **Time assumptions realistic** (Can a doctor really review 100 lab results in 5 minutes?)
- [ ] **Escalation paths clear** (If patient condition worsens, who gets notified?)

## Patient Safety & Guardrails

- [ ] **Dangerous combinations prevented**: Drug-drug interactions, drug-allergy conflicts?
- [ ] **Abnormal values flagged**: Vital signs outside normal range auto-alert?
- [ ] **Age-specific rules enforced**: Pediatric dosing different from adult?
- [ ] **Contraindications caught**: Patient conditions/medications that prevent a treatment?
- [ ] **Double-checks in place**: High-risk actions (discharge, major prescriptions) require verification?

## Medical Data & Ranges

- [ ] **Normal lab ranges accurate**: (e.g., glucose <100 is normal, >126 is diabetic?)
- [ ] **Vital signs ranges correct**: (heart rate 60-100 bpm; BP <120/80 normal?)
- [ ] **Drug dosages realistic**: (pediatric, adult, elderly ranges correct?)
- [ ] **Units consistent**: (All measurements in SI units? Or facility standard?)
- [ ] **Decimal precision appropriate**: (Vital signs: 1 decimal, lab results: 2-4 decimals?)

**Reference**: CareSync HIMS uses the following clinical standards:
- Lab result ranges: Validated against LabCorp & Quest values
- Vital signs: Per CDC/WHO standards
- Drug database: Integrated with FDA/DrugBank data
- Pediatric dosing: Fried & Clark formulas, adjusted for body surface area

## Role Management & Supervision

- [ ] **Adequate supervision**: Junior doctors don't work unsupervised? Orders reviewed?
- [ ] **Specialist requirements**: Are certain orders only for board-certified specialists?
- [ ] **Delegation clarity**: Can nurses carry out doctor orders? In what scenarios?
- [ ] **Approval chains**: Who approves high-cost procedures? High-risk medications?

## Common Errors & Prevention

**Medication Errors Pre-Check**
- [ ] Drug name verified (brand vs. generic?)
- [ ] Dose calculated correctly (weight-based dosing for peds?)
- [ ] Unit correct (mg vs. mcg confusion = 1000x error!)
- [ ] Route specified (IV vs. oral?)
- [ ] Frequency unambiguous ("twice daily" not "BID")
- [ ] Drug-disease contraindications caught (e.g., ACE inhibitors in pregnancy?)

**Lab Order Pre-Check**
- [ ] Patient fasting status considered (for lipids, glucose)
- [ ] Timing appropriate (repeat CBC in 1 day or 1 week?)
- [ ] Specimen type specified (serum vs. plasma, EDTA tube color?)
- [ ] Patient preparation documented (e.g., "no caffeine 24 hr before")

**Discharge Pre-Check**
- [ ] All open orders closed or transferred
- [ ] Prescriptions written before discharge
- [ ] Follow-up appointment scheduled
- [ ] Patient education complete
- [ ] Billing finalized

## Workflow Edge Cases

- [ ] **Allergy discovered during treatment**: Can it be documented & prescription adjusted?
- [ ] **Patient transferred to different ward**: Do orders follow? Are access rules updated?
- [ ] **Lab equipment down**: Fallback manual process defined?
- [ ] **Doctor unavailable for signature**: Deputy/attending can sign?
- [ ] **Patient refuses treatment**: Is refusal documented? Legal framework?
- [ ] **Patient is minor**: Who gives consent? Different workflow?
- [ ] **Organ transplant/critical case**: Escalation paths to senior doctors?

## Compliance & Record-Keeping

- [ ] **Audit trail sufficient**: Who did what, when, why is documented?
- [ ] **Corrections allowed**: Can a lab value be amended if initially entered wrong?
- [ ] **Deletion restricted**: Records marked "void" not deleted; reason logged?
- [ ] **Signature requirement met**: Prescriptions, diagnostic orders signed by authorized user?
- [ ] **Retention met**: Records kept for required time (7 years for Rx, 3 years for lab, etc.)
- [ ] **Consent documented**: Patient consent for sensitive procedures?

## Communication & Alerts

- [ ] **Critical value alerts**: Dangerously high/low lab results trigger immediate notification?
- [ ] **Allergy alerts visible**: Before every prescription entry?
- [ ] **Drug interaction alerts**: Checked in real-time during order entry?
- [ ] **Notification recipients correct**: Right person gets the right alert?
- [ ] **False alert rate acceptable**: <5% false positives to maintain clinical trust?

## Examples from CareSync HIMS

### Lab Result Approval
- ✅ **Correct**: Only board-certified doctors can approve; results outside normal range auto-flag
- ✅ **Correct**: Lab tech cannot modify doctor's approval; approval is immutable in audit log
- ❌ **Incorrect**: Allowing pharmacist to approve lab results (wrong role)
- ❌ **Incorrect**: Allowing modification of approved results without new approval signature

### Prescription Signing
- ✅ **Correct**: System verifies drug exists in formulary; dose is within range; patient has no allergies
- ✅ **Correct**: E-signature stored with cryptographic verification; immutable in audit trail
- ❌ **Incorrect**: Allowing unsigned prescriptions sent to pharmacy (legal/liability issue)
- ❌ **Incorrect**: Allowing post-dispensing modification of signed prescription

### Vital Signs Entry
- ✅ **Correct**: System validates ranges (BP <250/<150 is alert trigger; HR <40 or >150 is alert)
- ✅ **Correct**: Abnormal vitals trigger automatic notification to nurse
- ❌ **Incorrect**: Accepting BP of 300/200 without alert (missed hypertensive crisis)
- ❌ **Incorrect**: No notification when patient's temperature spikes to 40.5°C (missed sepsis risk)

---

## Sign-Off

After reviewing all items above:

- [ ] **Clinical lead approval**: [Name, Date]
- [ ] **Domain expert validation**: [Name, Date]
- [ ] **No showstoppers identified**: Proceed with BRD handoff to engineering

---

**Questions?** Contact Chief Medical Officer or Head of Clinical Operations.
