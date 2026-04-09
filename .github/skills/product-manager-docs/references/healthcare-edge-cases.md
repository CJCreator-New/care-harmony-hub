# Healthcare Edge Cases & Failure Modes

Comprehensive list of edge cases and failure scenarios to consider when designing healthcare workflows.

## Patient-Related Edge Cases

### Demographics & Status

- [ ] **Deceased patient**: System should prevent new orders; show alert "Patient deceased 2023-05-15"
- [ ] **Inactive patient**: Patient marked inactive; can orders still be placed? (Usually yes, but flag it)
- [ ] **Transferred patient**: Patient moved to different hospital; access revoked for old hospital staff?
- [ ] **Duplicate records**: How to handle if patient discovered in system twice? Merge mechanism?
- [ ] **Invalid/expired ID**: Fake ID or expired driver's license; how to verify?

### Minor Patients & Proxy Consent

- [ ] **Pediatric dosing**: System applies age-adjusted drug doses (not adult doses)
- [ ] **Emancipated minor**: 16-year-old consents themselves; no parental permission needed
- [ ] **Parent/guardian required**: System prevents minor from consenting to certain procedures
- [ ] **No legal guardian on file**: What happens if treating minor whose guardian is unreachable?

### Special Populations

- [ ] **Pregnant patient**: Certain drugs/imaging contraindicated; alerts fired?
- [ ] **Nursing mother**: Some drugs passed to infant via breast milk; documented?
- [ ] **Immunocompromised**: Different normal ranges; empiric antibiotics without culture?
- [ ] **Dialysis patient**: Medications dosed by kidney function; alerts if normal dose given?
- [ ] **Transplant recipient**: On immunosuppressants; restricted visiting hours?

### Allergy & Reaction History

- [ ] **No known allergies**: System assumes safe; but patient may have undisclosed allergy
- [ ] **Unknown allergy**: Patient has reaction during hospitalization; system records new allergy
- [ ] **Severe reaction previously documented**: System BLOCKS that drug at order entry (auto-reject)
- [ ] **Delayed reaction**: Anaphylaxis 48 hours after antibiotic; hard to connect
- [ ] **False positive**: Patient thinks they're allergic but tested negative; workflow to clear flag?

---

## Medication & Prescribing Edge Cases

### Drug Interactions & Contraindications

- [ ] **Drug-drug interaction**: Patient on warfarin + aspirin = bleeding risk; system? flags
- [ ] **Drug-food interaction**: Grapefruit reduces statin metabolism; patient on grapefruit juice; alert?
- [ ] **Drug-supplement interaction**: Patient on herbal supplement + prescription; documented?
- [ ] **Generic vs. brand name**: Same active ingredient; prescriber asks for specific formulation (why?)
- [ ] **Controlled substance**: Morphine prescribed; system checks if patient has prior history of addiction
- [ ] **Black box warning**: Drug has FDA black box warning (e.g., antipsychotics in elderly); documented & approved?

### Dosing Extremes

- [ ] **Pediatric dosing too low**: Adult dose given to child = ineffective
- [ ] **Pediatric dosing too high**: Adult dose given to child = toxicity
- [ ] **Renal adjustment needed**: Patient has kidney disease; standard dose causes toxicity (e.g., gentamicin)
- [ ] **Hepatic adjustment needed**: Patient has liver disease; standard dose causes toxicity (e.g., acetaminophen)
- [ ] **Obesity dosing**: Heavy patient; some drugs dosed by weight; correct calculation?
- [ ] **Elderly patient**: Age-related metabolism changes; lower doses sometimes needed
- [ ] **Drug overdose prescribed**: Doctor fat-fingers "500 mg" instead of "50 mg"; pharmacist catches?
- [ ] **Zero dose**: Prescription for drug with 0 mg/dose; system blocks?

### Frequency & Duration

- [ ] **"As needed" (PRN) prescriptions**: No maximum frequency set; patient takes drug every 30 min instead of Q6H
- [ ] **Indefinite prescriptions**: "Lisinopril daily for life" — no end date; OK for chronic conditions?
- [ ] **Too many refills**: Prescription for 12 refills = 13 months supply; insurance may deny
- [ ] **Duplicate prescriptions**: Patient has 2 identical prescriptions for same drug; takes both?
- [ ] **Expired prescriptions**: Rx issued 6 months ago; patient filled it yesterday (expired by state law)
- [ ] **Weekend/holiday considerations**: Prescription written Friday for Mon start; OK?

### Route & Form Issues

- [ ] **Wrong route**: Tablet prescribed for NPO (nothing by mouth) patient; should be IV
- [ ] **Patient cannot swallow**: Tablet prescribed for stroke patient with dysphagia; need liquid
- [ ] **Injection site**: IM vs. IV confusion = wrong absorption rate
- [ ] **Tablet splitting**: Cannot split extended-release tablets; system alerts?
- [ ] **Compounding needed**: Standard formulation not available; compound from powder?

---

## Lab Order & Result Edge Cases

### Pre-Analytical Errors

- [ ] **Wrong patient specimen**: Swapped samples in lab; result assigned to wrong patient
- [ ] **Fasting state not confirmed**: Lipid panel ordered; patient ate 2 hours ago (affects results)
- [ ] **Specimen hemolyzed**: Red blood cells burst during collection; result invalid; re-draw needed
- [ ] **Specimen clotted**: Wrong tube used; cannot run coagulation studies; re-draw needed
- [ ] **Specimen lost in transit**: Courier loses sample; patient has to return for re-draw
- [ ] **Test ordered but not done**: Lab still has order but specimen never submitted

### Analytical Errors

- [ ] **Machine malfunction**: Analyzer down; results delayed 4 hours; how to communicate?
- [ ] **Quality control failed**: QC results out of range; test run invalidated; re-do?
- [ ] **Reagent expired**: Using expired reagent shortcut; results unreliable
- [ ] **Calibration drift**: Machine slowly drifting off calibration; results increasingly wrong

### Clinical Interpretation Edge Cases

- [ ] **Result abnormal but patient asymptomatic**: Glucose 450 mg/dL but no symptoms; real or lab error?
- [ ] **Result normal but patient symptomatic**: Chest pain but EKG normal; admit for stress test?
- [ ] **Trending abnormal**: Creatinine creeping up over 3 tests; kidney declining
- [ ] **Delta check fails**: Result wildly different from patient's baseline (e.g., glucose 50 yesterday, 400 today); likely error
- [ ] **Age-specific normal range**: Glucose <100 normal for adult; <60 normal for neonate
- [ ] **Pregnancy-specific range**: Some tests have different normal ranges for pregnant patients
- [ ] **Critical value not flagged**: Result is life-threatening (K+ = 7.5) but no alert sent

### Post-Analytical Issues

- [ ] **Delayed result release**: Result ready but doctor not notified until next day
- [ ] **Result modified after release**: Doctor realizes error in report (typo: patient age 3 instead of 30); can it be amended without full re-review?
- [ ] **Physician never reviews result**: 7-year-old result sitting in system pending approval; statute of limitation expired?
- [ ] **Patient views abnormal result first**: Patient sees result in portal before doctor reviews; anxiety beforedoctor has context

---

## Billing & Insurance Edge Cases

### Coverage & Authorization

- [ ] **Prior authorization not obtained**: Procedure done without pre-auth; insurance denies; patient billed
- [ ] **High-cost procedure, wrong auth code**: Auth obtained for procedure A; patient received procedure B (higher cost); mismatch
- [ ] **Insurance terminated**: Patient's coverage lapsed yesterday; procedure done today; who pays?
- [ ] **Dual insurance**: Patient has primary + secondary insurance; how to coordinate billing?
- [ ] **Worker's comp vs. health insurance**: Injury at work; worker's comp should pay, not health insurance
- [ ] **Medicaid vs. Medicare**: Dual eligible (age 65+); which pays first?

### Coverage Limits

- [ ] **Annual deductible**: Patient hasn't met $2K deductible; service not covered; patient owes full amount
- [ ] **Out-of-pocket maximum**: Patient reached $6K OOP max this year; services now fully covered
- [ ] **Lifetime limit exceeded**: Patient already used lifetime max of $1M; dying of cancer; no more coverage
- [ ] **Network status unclear**: Provider in-network or out-of-network? Billing different; patient disputes
- [ ] **Denied for medical necessity**: Procedure denied because "not medically necessary per insurance guidelines"

### Coordination of Benefits

- [ ] **How to sequence payments**: If patient has 2 insurance plans, one should be primary, other secondary
- [ ] **Both insurances deny**: "Your other insurance should pay"; no one pays; patient appeals
- [ ] **Coordination of benefits agreement**: If overlap, each pays percentage; must not exceed 100%

### Claim Submission & Denial

- [ ] **Claim submitted incomplete**: Missing diagnosis code; insurance denies for incompleteness
- [ ] **Diagnosis code incorrect**: Submitted ICD-10 for knee pain; procedure was for shoulder; denial
- [ ] **Billing code mismatch**: Charged CPT code A; insurance says service rendered was code B; underpayment
- [ ] **Claim lost by insurance**: Claim submitted 60 days ago; insurance says never received; patient owes full amount
- [ ] **Duplicate claim submitted**: Same claim submitted twice; paid twice; overpayment must be refunded
- [ ] **Appeals process**: Claim denied; patient wants to appeal; What's the timeline and process?

### No Insurance / Uninsured Patients

- [ ] **Uninsured patient**: Cannot pay full $5K bill; hospital has charity care? Payment plan?
- [ ] **Undocumented immigrant**: May not have SSN; how to register?
- [ ] **Bad debt**: Patient ignores collection notices; becomes bad debt; write-off?

---

## System & Infrastructure Edge Cases

### Downtime Scenarios

- [ ] **Database down**: Cannot access patient records; paper charts as fallback?
- [ ] **Network down**: Clinic offline; prescriptions written on paper; how to reconcile when system back up?
- [ ] **Lab system down**: Cannot send orders to lab; orders queued; when lab restarts, which orders send first?
- [ ] **Pharmacy system down**: Cannot dispense prescriptions; written on paper; manual reconciliation nightmare

### Concurrency Issues

- [ ] **Simultaneous edits**: Two doctors editing same patient's medication list; last one wins? Conflict dialog?
- [ ] **Race condition**: Prescription approval simultaneously requested by 2 doctors; approved twice?
- [ ] **Double-submission**: User clicks "Submit" twice; creates 2 orders instead of 1; duplication bug

### Audit & Compliance

- [ ] **Audit trail gaps**: System crash during critical procedure; audit log incomplete; forensic nightmare
- [ ] **PHI accidentally logged**: Error message dumps patient name + SSN to error log; data breach
- [ ] **Retention deadline**: Legal holds lab result for 7 years; after 7 years, auto-deleted; proper procedure?
- [ ] **Regulatory audit**: Auditor requests all changes to patient record 2023-01-01 to 2023-01-31; system provides? Can tamper be detected?

---

## Communication & Notification Edge Cases

### Notification Delivery

- [ ] **Email address wrong**: Notification bounces; healthcare provider never notified
- [ ] **SMS timeout**: Sent SMS; recipient never gets message (network issues); how to retry?
- [ ] **Alert fatigue**: System sends 100+ daily alerts; clinician ignores all; critical alert missed
- [ ] **Wrong recipient notified**: System sent notification to wrong doctor (name similarity)
- [ ] **Notification race condition**: Prescription signed; notification sent but prescription status = "Pending" still (not yet updated to "Signed")

### Escalation

- [ ] **No response within SLA**: Critical value not acknowledged within 1 hour; who escalates?
- [ ] **Escalation loop**: Escalates to manager, manager escalates to director, director escalates to CEO; overhead
- [ ] **After-hours alert**: Lab critical value at 2 AM; on-call doctor unreachable; what then?

---

## Workflow State Machine Edge Cases

### State Transitions

- [ ] **Invalid transition**: Prescription in "Picked Up" state; system receives "Sign" request; should reject
- [ ] **Transition race condition**: Pharmacist marking as dispensed while doctor recalls; conflicting states
- [ ] **Stuck state**: Prescription in "Pending" state for 6 months; no one remembers why; system should flag

### Rollback Scenarios

- [ ] **Accidental order**: Prescription created by mistake; can it be deleted or must be marked void?
- [ ] **Wrong patient**: Order created for John Smith; should have been Jane Doe; recall/void?
- [ ] **System error reversal**: Billing charged twice; can system reverse the duplicate charge?

---

## Third-Party Integration Failures

- [ ] **Lab equipment offline**: System expects result from external analyzer; never arrives; order stuck?
- [ ] **API timeout**: Calling insurance API to verify coverage; API down; timeout at 30s; what to do?
- [ ] **Data format incompatibility**: Partner lab sends result in unexpected XML format; system errors
- [ ] **Authentication token expired**: API call fails because auth token expired; automatic refresh?
- [ ] **Rate limiting**: Too many API calls; 3rd party throttles; requests queued?

---

## Clinical Decision Support & AI

- [ ] **False positive alert**: Drug interaction alert fires but actually safe; clinician ignores alert; truly dangerous alert later missed
- [ ] **False negative**: Drug interaction exists but not in database; no alert; patient has adverse event
- [ ] **Outdated guideline**: Recommendation based on 2015 guideline; 2024 guideline says different; clinical staff unaware

---

## Checklist for BRD Authors

Before finalizing your BRD, identify which edge cases apply:

- [ ] **Patient-related**: Pediatric, elderly, special populations, allergy discovery, status changes?
- [ ] **Medication**: Interactions, contraindications, dosing extremes, frequency, routes?
- [ ] **Lab**: Pre-analytical, analytical, clinical interpretation, critical values, result modification?
- [ ] **Billing**: Prior auth, coverage, denials, coordination of benefits, uninsured patients?
- [ ] **System**: Downtime, concurrency, audit gaps, PHI protection?
- [ ] **Communication**: Notification delivery, escalation, SLAs?
- [ ] **Workflow**: State transitions, rollbacks, stuck states?
- [ ] **Integration**: API failures, timeouts, format mismatches?

For each relevant scenario, document in BRD:
1. **What happens?** (description)
2. **What's the impact?** (patient safety, workflow, compliance)
3. **What's the mitigation?** (prevention, detection, recovery)

---

**Example BRD Excerpt**:

> **Edge Case**: Prescription for controlled substance (morphine) prescribed to patient with opioid use disorder history.
> 
> **Mitigation**: (1) System maintains patient addiction/substance abuse history. (2) When prescribing opioid, system alerts doctor with patient's history. (3) Doctor must acknowledge alert and document medical necessity. (4) Pharmacy can also check history and query prescriber if concerned. (5) Audit trail records decision.

---

**Questions?** Review past incidents database for patterns, or consult Chief Medical Officer.
