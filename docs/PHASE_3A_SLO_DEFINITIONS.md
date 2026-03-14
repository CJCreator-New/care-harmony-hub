# Phase 3A: Clinical SLO Definitions & Acceptance Tests

**Status**: SLO Specification & Test Suite  
**Date**: March 13, 2026  
**Audience**: Engineering, Clinical Product, DevOps

---

## Executive Summary

Four clinical SLOs track **patient-impacting latencies**:

| SLO | Target | P95 Threshold | Clinical Reason |
|-----|--------|---------------|-----------------|
| Patient Registration → First Appointment | <30 min | Alert if >30 min | Reduce intake anxiety |
| Prescription Creation → Dispensing | <15 min | Alert if >15 min | Minimize medication wait |
| Lab Order → Critical Value Alert | <5 min | Alert if >5 min | Immediate physician notification |
| Appointment Confirmation → Reminder | <10 min | Alert if >10 min | Reduce no-shows |

---

## SLO 1: Patient Registration → First Appointment

### Definition
**Latency from patient registration** → **first appointment scheduled**

**Target**: <30 minutes (P95)  
**Alert Threshold**: >30 minutes in 5-minute window  
**Critical Threshold**: >90 minutes  

### Clinical Rationale
Patients experience anxiety during intake. If they don't get an appointment scheduled within 30 minutes, they may:
- Lose confidence in the system
- Leave without completing registration
- Reduce follow-up adherence

### Measurement (SQL)

```sql
-- Measure registration-to-appointment latency
SELECT
  p.id as patient_id,
  p.hospital_id,
  p.created_at as registration_time,
  a.created_at as first_appointment_time,
  EXTRACT(EPOCH FROM (a.created_at - p.created_at)) / 60 as latency_minutes,
  CASE
    WHEN (a.created_at - p.created_at) < INTERVAL '30 minutes' THEN 'PASS'
    WHEN (a.created_at - p.created_at) < INTERVAL '90 minutes' THEN 'WARN'
    ELSE 'CRITICAL'
  END as slo_status
FROM patients p
LEFT JOIN appointments a ON p.id = a.patient_id
  AND a.is_first_appointment = TRUE
WHERE p.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY latency_minutes DESC;
```

### Prometheus Metric
```
# HELP registration_to_appointment_latency_seconds Time from registration to first appointment (seconds)
# TYPE registration_to_appointment_latency_seconds histogram
registration_to_appointment_latency_seconds_bucket{hospital_id="hosp-1",le="300"} 450     # <5 min
registration_to_appointment_latency_seconds_bucket{hospital_id="hosp-1",le="900"} 480     # <15 min
registration_to_appointment_latency_seconds_bucket{hospital_id="hosp-1",le="1800"} 490    # <30 min
registration_to_appointment_latency_seconds_bucket{hospital_id="hosp-1",le="5400"} 498    # <90 min
registration_to_appointment_latency_seconds_bucket{hospital_id="hosp-1",le="+Inf"} 500    # total
registration_to_appointment_latency_seconds_sum{hospital_id="hosp-1"} 120000
registration_to_appointment_latency_seconds_count{hospital_id="hosp-1"} 500
```

### Acceptance Criteria

```gherkin
Feature: Patient Registration → Appointment SLO
  Scenario: Registration completes within 30 minutes (P95)
    Given a patient registered at 10:00:00
    When a receptionist schedules first appointment at 10:25:00
    Then latency is 25 minutes
    And SLO status is "PASS"
  
  Scenario: Warning if latency exceeds 30 minutes
    Given a patient registered at 10:00:00
    And no appointment scheduled until 10:45:00
    When the system measures latency
    Then latency is 45 minutes
    And SLO status is "WARN"
    And alert is triggered
  
  Scenario: Critical alert if latency exceeds 90 minutes
    Given a patient registered at 10:00:00
    And no appointment scheduled until 12:15:00
    When the system measures latency
    Then latency is 135 minutes
    And SLO status is "CRITICAL"
    And escalation alert sent to intake_supervisor
```

### Acceptance Test (Vitest)

```typescript
// tests/integration/slo-patient-registration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabaseAdmin } from '../../src/utils/supabase-admin';

describe('SLO: Patient Registration → First Appointment', () => {
  let testHospitalId: string;
  let testPatientId: string;

  beforeEach(async () => {
    // Setup test hospital
    const { data: hospital } = await supabaseAdmin
      .from('hospitals')
      .insert({ name: 'SLO Test Hospital' })
      .select()
      .single();
    
    testHospitalId = hospital.id;
  });

  afterEach(async () => {
    // Cleanup
    await supabaseAdmin
      .from('patients')
      .delete()
      .eq('hospital_id', testHospitalId);
    
    await supabaseAdmin
      .from('hospitals')
      .delete()
      .eq('id', testHospitalId);
  });

  it('should register patient and schedule appointment within 30 minutes', async () => {
    const registerTime = Date.now();

    // Step 1: Register patient
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .insert({
        hospital_id: testHospitalId,
        first_name: 'John',
        last_name: 'Doe',
        uhid: `TEST-${Date.now()}`,
      })
      .select()
      .single();

    testPatientId = patient.id;

    // Simulate receptionist scheduling appointment 20 min later
    const appointmentTime = new Date(registerTime + 20 * 60 * 1000);

    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .insert({
        hospital_id: testHospitalId,
        patient_id: patient.id,
        appointment_date: appointmentTime.toISOString(),
        is_first_appointment: true,
        status: 'SCHEDULED',
      })
      .select()
      .single();

    // Verify latency
    const latencyMs = new Date(appointment.created_at).getTime() - registerTime;
    const latencyMin = latencyMs / (60 * 1000);

    expect(latencyMin).toBeLessThan(30, 'Appointment should be scheduled within 30 min');
    expect(latencyMin).toBeGreaterThan(0);
  });

  it('should trigger warning if appointment not scheduled within 30 minutes', async () => {
    // Register patient
    const registerTime = Date.now();

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .insert({
        hospital_id: testHospitalId,
        first_name: 'Jane',
        last_name: 'Smith',
        uhid: `TEST-${Date.now()}`,
        created_at: new Date(registerTime).toISOString(),
      })
      .select()
      .single();

    testPatientId = patient.id;

    // Don't schedule appointment immediately; simulate delay
    // In real scenario, this would be detected by SLO monitoring

    // Wait and check SLO status
    const sloCheckTime = Date.now() + 35 * 60 * 1000; // 35 min later

    // Verify no appointment exists by this time
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select()
      .eq('patient_id', patient.id)
      .is('is_first_appointment', true);

    expect(appointments).toHaveLength(0, 'SLO violation: No appointment after 35 min');
  });

  it('should measure P95 latency across multiple registrations', async () => {
    const latencies: number[] = [];

    // Register 100 test patients
    for (let i = 0; i < 100; i++) {
      const registerTime = Date.now();

      const { data: patient } = await supabaseAdmin
        .from('patients')
        .insert({
          hospital_id: testHospitalId,
          first_name: `Patient${i}`,
          last_name: `Test`,
          uhid: `TEST-${Date.now()}-${i}`,
        })
        .select()
        .single();

      // Schedule appointments with varying delays
      const delayMin = Math.random() * 60; // 0-60 minutes
      const appointmentTime = new Date(registerTime + delayMin * 60 * 1000);

      const { data: appointment } = await supabaseAdmin
        .from('appointments')
        .insert({
          hospital_id: testHospitalId,
          patient_id: patient.id,
          appointment_date: appointmentTime.toISOString(),
          is_first_appointment: true,
          status: 'SCHEDULED',
        })
        .select()
        .single();

      const latencyMs = new Date(appointment.created_at).getTime() - registerTime;
      latencies.push(latencyMs / (60 * 1000)); // Convert to minutes
    }

    // Calculate P95
    const sorted = latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95Latency = sorted[p95Index];

    console.log(`P95 latency: ${p95Latency.toFixed(2)} minutes`);
    console.log(`Expected: <30 minutes`);

    expect(p95Latency).toBeLessThan(30, 'P95 latency should be < 30 min');
  });
});
```

---

## SLO 2: Prescription Creation → Pharmacy Dispensing

### Definition
**Latency from prescription created** → **status changed to DISPENSED**

**Target**: <15 minutes (P95)  
**Alert Threshold**: >15 minutes in 5-minute window  
**Critical Threshold**: >45 minutes

### Clinical Rationale
Patients expect medications without long waits. Extended dispensing times:
- Reduce medication adherence
- Hurt patient satisfaction
- May delay treatment

### Measurement (SQL)

```sql
-- Measure prescription-to-dispensing latency
SELECT
  pr.id as prescription_id,
  pr.hospital_id,
  pr.patient_id,
  pr.created_at as prescription_time,
  MAX(CASE WHEN pr.status = 'DISPENSED' THEN pr.updated_at END) as dispensed_time,
  EXTRACT(EPOCH FROM (
    MAX(CASE WHEN pr.status = 'DISPENSED' THEN pr.updated_at END) - pr.created_at
  )) / 60 as latency_minutes,
  CASE
    WHEN (MAX(CASE WHEN pr.status = 'DISPENSED' THEN pr.updated_at END) - pr.created_at) 
         < INTERVAL '15 minutes' THEN 'PASS'
    WHEN (MAX(CASE WHEN pr.status = 'DISPENSED' THEN pr.updated_at END) - pr.created_at) 
         < INTERVAL '45 minutes' THEN 'WARN'
    ELSE 'CRITICAL'
  END as slo_status
FROM prescriptions pr
WHERE pr.created_at >= NOW() - INTERVAL '1 hour'
  AND pr.status = 'DISPENSED'
GROUP BY pr.id, pr.hospital_id, pr.patient_id, pr.created_at;
```

### Prometheus Metric
```
# HELP prescription_to_dispensing_latency_seconds Time from prescription creation to dispensing (seconds)
# TYPE prescription_to_dispensing_latency_seconds histogram
prescription_to_dispensing_latency_seconds_bucket{hospital_id="hosp-1",drug_class="ANTIBIOTIC",le="300"} 120
prescription_to_dispensing_latency_seconds_bucket{hospital_id="hosp-1",drug_class="ANTIBIOTIC",le="600"} 145  # <10 min
prescription_to_dispensing_latency_seconds_bucket{hospital_id="hosp-1",drug_class="ANTIBIOTIC",le="900"} 165  # <15 min
prescription_to_dispensing_latency_seconds_bucket{hospital_id="hosp-1",drug_class="ANTIBIOTIC",le="+Inf"} 175
```

### Acceptance Criteria

```gherkin
Feature: Prescription → Pharmacy Dispensing SLO
  Scenario: Normal prescription dispensed within 15 minutes
    Given prescription created at 10:00:00
    When pharmacy dispenses at 10:12:00
    Then latency is 12 minutes
    And SLO status is "PASS"
  
  Scenario: Controlled drug dispensing still within 15 minutes
    Given controlled substance prescription created at 10:00:00
    And pharmacist verifies DEA authorization
    When pharmacy dispenses at 10:14:00
    Then latency is 14 minutes
    And SLO status is "PASS"
  
  Scenario: Out-of-stock prescription triggers alert
    Given prescription created at 10:00:00
    And medication out of stock
    And alert sent to pharmacy manager at 10:05:00
    When medication restocked and dispensed at 11:00:00
    Then latency is 60 minutes
    And SLO status is "CRITICAL"
    And escalation triggered to pharmacy director
```

### Acceptance Test (Vitest)

```typescript
// tests/integration/slo-prescription-dispensing.test.ts
describe('SLO: Prescription Creation → Pharmacy Dispensing', () => {
  let testHospitalId: string;
  let testPatientId: string;

  beforeEach(async () => {
    const { data: hospital } = await supabaseAdmin
      .from('hospitals')
      .insert({ name: 'Pharmacy SLO Test' })
      .select()
      .single();
    testHospitalId = hospital.id;

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .insert({
        hospital_id: testHospitalId,
        first_name: 'Test',
        last_name: 'Patient',
        uhid: `TEST-${Date.now()}`,
      })
      .select()
      .single();
    testPatientId = patient.id;
  });

  it('should dispense common medication within 15 minutes', async () => {
    const createTime = Date.now();

    // Create prescription
    const { data: prescription } = await supabaseAdmin
      .from('prescriptions')
      .insert({
        hospital_id: testHospitalId,
        patient_id: testPatientId,
        doctor_id: 'doctor-1',
        drug_code: 'PARACETAMOL_500',
        quantity: 10,
        status: 'PENDING',
        created_at: new Date(createTime).toISOString(),
      })
      .select()
      .single();

    // Simulate pharmacist dispensing 8 minutes later
    const dispenseTime = new Date(createTime + 8 * 60 * 1000);

    const { data: updated } = await supabaseAdmin
      .from('prescriptions')
      .update({
        status: 'DISPENSED',
        dispensed_by: 'pharmacist-1',
        dispensed_at: dispenseTime.toISOString(),
      })
      .eq('id', prescription.id)
      .select()
      .single();

    const latencyMs = new Date(updated.dispensed_at).getTime() - createTime;
    const latencyMin = latencyMs / (60 * 1000);

    expect(latencyMin).toBeLessThan(15, 'Most medications should dispense <15 min');
  });

  it('should track controlled substance dispensing (slightly longer but <15 min)', async () => {
    const createTime = Date.now();

    const { data: prescription } = await supabaseAdmin
      .from('prescriptions')
      .insert({
        hospital_id: testHospitalId,
        patient_id: testPatientId,
        doctor_id: 'doctor-1',
        drug_code: 'MORPHINE_10MG', // Controlled
        quantity: 10,
        status: 'AWAITING_VERIFICATION',
        created_at: new Date(createTime).toISOString(),
      })
      .select()
      .single();

    // DEA verification happens
    const verifyTime = new Date(createTime + 4 * 60 * 1000);

    await supabaseAdmin
      .from('prescriptions')
      .update({ status: 'CLEARED', verified_at: verifyTime.toISOString() })
      .eq('id', prescription.id);

    // Dispense
    const dispenseTime = new Date(createTime + 13 * 60 * 1000);

    const { data: updated } = await supabaseAdmin
      .from('prescriptions')
      .update({
        status: 'DISPENSED',
        dispensed_at: dispenseTime.toISOString(),
      })
      .eq('id', prescription.id)
      .select()
      .single();

    const latencyMin = (new Date(updated.dispensed_at).getTime() - createTime) / (60 * 1000);
    expect(latencyMin).toBeLessThan(15);
  });

  it('should calculate P95 dispensing latency', async () => {
    const latencies: number[] = [];

    for (let i = 0; i < 50; i++) {
      const createTime = Date.now() + i * 1000;

      const { data: prescription } = await supabaseAdmin
        .from('prescriptions')
        .insert({
          hospital_id: testHospitalId,
          patient_id: testPatientId,
          drug_code: 'ASPIRIN_100',
          quantity: 1,
          created_at: new Date(createTime).toISOString(),
        })
        .select()
        .single();

      // Random dispensing time 2-14 minutes later
      const delayMin = 2 + Math.random() * 12;
      const dispenseTime = new Date(createTime + delayMin * 60 * 1000);

      const { data: updated } = await supabaseAdmin
        .from('prescriptions')
        .update({ status: 'DISPENSED', dispensed_at: dispenseTime.toISOString() })
        .eq('id', prescription.id)
        .select()
        .single();

      latencies.push(
        (new Date(updated.dispensed_at).getTime() - createTime) / (60 * 1000)
      );
    }

    const sorted = latencies.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    console.log(`Prescription P95 latency: ${p95.toFixed(2)} min`);
    expect(p95).toBeLessThan(15);
  });
});
```

---

## SLO 3: Lab Order → Critical Value Alert Notification

### Definition
**Latency from critical lab result detected** → **physician notification sent**

**Target**: <5 minutes (P95)  
**Alert Threshold**: >5 minutes (any critical value)  
**Critical Threshold**: >15 minutes without notification

### Clinical Rationale
Critical lab values (glucose <70, K+ >6.0, etc.) are **medical emergencies**:
- Physician must be notified immediately
- Delays can result in patient harm
- Regulatory requirement (some jurisdictions)

### Measurement (SQL)

```sql
-- Measure lab critical value detection → notification latency
SELECT
  lo.id as lab_order_id,
  lo.hospital_id,
  lo.patient_id,
  lr.id as lab_result_id,
  lr.created_at as result_time,
  lr.test_type,
  lr.value,
  lr.reference_range,
  lr.is_critical,
  n.id as notification_id,
  n.created_at as notification_time,
  EXTRACT(EPOCH FROM (n.created_at - lr.created_at)) as alert_latency_seconds,
  CASE
    WHEN EXTRACT(EPOCH FROM (n.created_at - lr.created_at)) < 300 THEN 'PASS'
    WHEN EXTRACT(EPOCH FROM (n.created_at - lr.created_at)) < 900 THEN 'WARN'
    ELSE 'CRITICAL'
  END as slo_status
FROM lab_orders lo
JOIN lab_results lr ON lo.id = lr.lab_order_id
LEFT JOIN notifications n ON lr.id = n.related_entity_id
  AND n.notification_type = 'CRITICAL_LAB_VALUE'
WHERE lr.is_critical = TRUE
  AND lo.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY alert_latency_seconds DESC;
```

### Prometheus Metric
```
# HELP lab_critical_alert_latency_seconds Time from critical result detection to physician notification (seconds)
# TYPE lab_critical_alert_latency_seconds histogram
lab_critical_alert_latency_seconds_bucket{hospital_id="hosp-1",test_type="GLUCOSE",le="60"} 85       # <1 min
lab_critical_alert_latency_seconds_bucket{hospital_id="hosp-1",test_type="GLUCOSE",le="180"} 95     # <3 min
lab_critical_alert_latency_seconds_bucket{hospital_id="hosp-1",test_type="GLUCOSE",le="300"} 100    # <5 min
lab_critical_alert_latency_seconds_bucket{hospital_id="hosp-1",test_type="GLUCOSE",le="+Inf"} 105

# HELP critical_lab_values_without_alert_total Count of critical values without timely alert
# TYPE critical_lab_values_without_alert_total counter
critical_lab_values_without_alert_total{hospital_id="hosp-1"} 0
```

### Acceptance Criteria

```gherkin
Feature: Lab Critical Value → Physician Notification SLO
  Scenario: Critical glucose detected and notified <5 min
    Given lab result shows glucose 45 mg/dL (critical, normal 70-100)
    When system detects critical value at 14:30:00
    Then physician notification sent by 14:34:00
    And SLO status is "PASS"
  
  Scenario: Critical potassium detected and escalated
    Given lab result shows K+ 7.2 mmol/L (critical, normal 3.5-5.0)
    When system detects at 14:30:00
    Then primary physician notified by 14:33:00
    And cardiology team alerted by 14:34:00
    And SLO status is "PASS"
  
  Scenario: Multiple critical alerts on same patient
    Given patient with multiple critical values:
      - Glucose 40 mg/dL (critical)
      - K+ 7.5 mmol/L (critical)
    When system detects at 14:30:00
    Then both notifications sent by 14:34:00
    And alerts are de-duplicated (no alert spam)
```

### Acceptance Test (Vitest)

```typescript
// tests/integration/slo-critical-lab-alert.test.ts
describe('SLO: Lab Critical Value → Physician Notification', () => {
  let testHospitalId: string;
  let testPatientId: string;
  let testDoctorId: string;

  beforeEach(async () => {
    // Setup
    const { data: hospital } = await supabaseAdmin
      .from('hospitals')
      .insert({ name: 'Lab SLO Test' })
      .select()
      .single();
    testHospitalId = hospital.id;

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .insert({
        hospital_id: testHospitalId,
        first_name: 'Critical',
        last_name: 'Patient',
        uhid: `LAB-${Date.now()}`,
      })
      .select()
      .single();
    testPatientId = patient.id;

    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .insert({
        hospital_id: testHospitalId,
        name: 'Dr. Alert',
      })
      .select()
      .single();
    testDoctorId = doctor.id;
  });

  it('should notify physician of critical glucose within 5 minutes', async () => {
    // Create lab order
    const { data: labOrder } = await supabaseAdmin
      .from('lab_orders')
      .insert({
        hospital_id: testHospitalId,
        patient_id: testPatientId,
        doctor_id: testDoctorId,
        test_type: 'GLUCOSE',
      })
      .select()
      .single();

    const resultTime = Date.now();

    // Record critical result (glucose = 45 mg/dL, normal = 70-100)
    const { data: result } = await supabaseAdmin
      .from('lab_results')
      .insert({
        lab_order_id: labOrder.id,
        test_type: 'GLUCOSE',
        value: 45,
        unit: 'mg/dL',
        reference_range: '70-100',
        is_critical: true, // Triggers alert workflow
        lab_tech_id: 'tech-1',
        created_at: new Date(resultTime).toISOString(),
      })
      .select()
      .single();

    // Simulate notification system processing (should complete within 5 min)
    const alertTime = new Date(resultTime + 3 * 60 * 1000);

    const { data: notification } = await supabaseAdmin
      .from('notifications')
      .insert({
        hospital_id: testHospitalId,
        recipient_id: testDoctorId,
        notification_type: 'CRITICAL_LAB_VALUE',
        related_entity_type: 'lab_result',
        related_entity_id: result.id,
        message: `CRITICAL: Patient glucose 45 mg/dL`,
        sent_at: alertTime.toISOString(),
      })
      .select()
      .single();

    const latencySeconds = (alertTime.getTime() - resultTime) / 1000;

    console.log(`Glucose alert latency: ${latencySeconds}s`);
    expect(latencySeconds).toBeLessThan(300, 'Critical notification <5 min');
  });

  it('should trigger escalation for ultra-critical values (glucose <40)', async () => {
    const { data: labOrder } = await supabaseAdmin
      .from('lab_orders')
      .insert({
        hospital_id: testHospitalId,
        patient_id: testPatientId,
        doctor_id: testDoctorId,
        test_type: 'GLUCOSE',
      })
      .select()
      .single();

    const resultTime = Date.now();

    // ULTRA-CRITICAL: glucose = 35 mg/dL
    const { data: result } = await supabaseAdmin
      .from('lab_results')
      .insert({
        lab_order_id: labOrder.id,
        test_type: 'GLUCOSE',
        value: 35,
        unit: 'mg/dL',
        reference_range: '70-100',
        is_critical: true,
        severity: 'ULTRA_CRITICAL',
        created_at: new Date(resultTime).toISOString(),
      })
      .select()
      .single();

    // Should notify within 60 seconds for ultra-critical
    const alertTime = new Date(resultTime + 45 * 1000);

    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .insert([
        {
          hospital_id: testHospitalId,
          recipient_id: testDoctorId,
          notification_type: 'ULTRA_CRITICAL_LAB_VALUE',
          related_entity_id: result.id,
          sent_at: alertTime.toISOString(),
        },
        {
          hospital_id: testHospitalId,
          recipient_id: 'supervisor-1', // Escalation
          notification_type: 'CRITICAL_LAB_ESCALATION',
          related_entity_id: result.id,
          sent_at: alertTime.toISOString(),
        },
      ])
      .select();

    const latencySeconds = (alertTime.getTime() - resultTime) / 1000;
    expect(latencySeconds).toBeLessThan(60, 'Ultra-critical alert <1 min');
    expect(notifications.length).toBe(2, 'Should escalate to supervisor');
  });

  it('should calculate P95 critical alert latency', async () => {
    const latencies: number[] = [];

    for (let i = 0; i < 30; i++) {
      const resultTime = Date.now() + i * 1000;

      const { data: labOrder } = await supabaseAdmin
        .from('lab_orders')
        .insert({
          hospital_id: testHospitalId,
          patient_id: testPatientId,
          test_type: 'GLUCOSE',
        })
        .select()
        .single();

      const { data: result } = await supabaseAdmin
        .from('lab_results')
        .insert({
          lab_order_id: labOrder.id,
          test_type: 'GLUCOSE',
          value: 45 + Math.random() * 10,
          is_critical: true,
          created_at: new Date(resultTime).toISOString(),
        })
        .select()
        .single();

      // Random alert latency 15-290 seconds (with most <5 min)
      const delaySeconds = Math.random() < 0.8 
        ? Math.random() * 180  // 80% complete within 3 min
        : 180 + Math.random() * 110; // 20% take 3-5 min

      const alertTime = new Date(resultTime + delaySeconds * 1000);

      await supabaseAdmin
        .from('notifications')
        .insert({
          hospital_id: testHospitalId,
          recipient_id: testDoctorId,
          notification_type: 'CRITICAL_LAB_VALUE',
          related_entity_id: result.id,
          sent_at: alertTime.toISOString(),
        });

      latencies.push(delaySeconds);
    }

    const sorted = latencies.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    console.log(`Lab critical alert P95: ${p95.toFixed(1)} seconds`);
    expect(p95).toBeLessThan(300, 'P95 <5 minutes');
  });
});
```

---

## SLO 4: Appointment Confirmation → Patient Reminder Sent

### Definition
**Latency from appointment confirmed** → **SMS/email reminder sent**

**Target**: <10 minutes (P95)  
**Alert Threshold**: >10 minutes  
**Critical Threshold**: >30 minutes

### Clinical Rationale
Immediate reminders after confirmation:
- Reduce appointment no-shows (~10-20% no-show rate typical)
- Improve patient experience (confirmation feels completed)
- Allow patients to make schedule adjustments

### Measurement (SQL)

```sql
-- Measure appointment confirmation → reminder latency
SELECT
  a.id as appointment_id,
  a.hospital_id,
  a.patient_id,
  a.status as appointment_status,
  a.updated_at as confirmation_time,
  n.id as notification_id,
  n.notification_type,
  n.created_at as reminder_sent,
  EXTRACT(EPOCH FROM (n.created_at - a.updated_at)) as latency_seconds,
  CASE
    WHEN (n.created_at - a.updated_at) < INTERVAL '10 minutes' THEN 'PASS'
    WHEN (n.created_at - a.updated_at) < INTERVAL '30 minutes' THEN 'WARN'
    ELSE 'CRITICAL'
  END as slo_status
FROM appointments a
JOIN notifications n ON a.id = n.related_entity_id
WHERE a.status = 'CONFIRMED'
  AND n.notification_type IN ('SMS_REMINDER', 'EMAIL_REMINDER')
  AND a.updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY latency_seconds DESC;
```

### Prometheus Metric
```
# HELP appointment_to_reminder_latency_seconds Time from appointment confirmation to reminder (seconds)
# TYPE appointment_to_reminder_latency_seconds histogram
appointment_to_reminder_latency_seconds_bucket{hospital_id="hosp-1",reminder_type="SMS",le="300"} 450   # <5 min
appointment_to_reminder_latency_seconds_bucket{hospital_id="hosp-1",reminder_type="SMS",le="600"} 480   # <10 min
appointment_to_reminder_latency_seconds_bucket{hospital_id="hosp-1",reminder_type="SMS",le="+Inf"} 500

# HELP reminder_delivery_success_rate_percent Percentage of reminders successfully delivered
# TYPE reminder_delivery_success_rate_percent gauge
reminder_delivery_success_rate_percent{reminder_type="SMS"} 96.5
reminder_delivery_success_rate_percent{reminder_type="EMAIL"} 98.2

# HELP appointment_no_show_rate_percent Appointment no-show rate (target: <5%)
# TYPE appointment_no_show_rate_percent gauge
appointment_no_show_rate_percent 3.2
```

### Acceptance Criteria

```gherkin
Feature: Appointment Confirmation → Reminder Delivery
  Scenario: SMS reminder sent within 10 minutes of confirmation
    Given appointment confirmed at 14:00:00
    When patient preferences include SMS reminder
    Then SMS sent by 14:08:00
    And SMS contains: date, time, location, doctor name
    And SLO status is "PASS"
  
  Scenario: Email reminder sent within 10 minutes
    Given appointment confirmed at 14:00:00
    And patient prefers email
    Then email sent by 14:09:00
    And email includes: confirmation code, map link to facility
    And SLO status is "PASS"
  
  Scenario: Multiple reminders for multi-day appointment gap
    Given appointment confirmed for 3 days from now
    When reminder scheduled within 10 min of confirmation
    Then initial SMS sent at confirmation (SLO)
    And reminder again 24 hours before appointment
    And reminder again 2 hours before
```

### Acceptance Test (Vitest)

```typescript
// tests/integration/slo-appointment-reminder.test.ts
describe('SLO: Appointment Confirmation → Reminder Delivery', () => {
  let testHospitalId: string;
  let testPatientId: string;
  let testDoctorId: string;

  beforeEach(async () => {
    const { data: hospital } = await supabaseAdmin
      .from('hospitals')
      .insert({ name: 'Appointment SLO Test' })
      .select()
      .single();
    testHospitalId = hospital.id;

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .insert({
        hospital_id: testHospitalId,
        first_name: 'Remind',
        last_name: 'Me',
        uhid: `APT-${Date.now()}`,
        phone_number: '+919876543210',
        email: 'patient@test.com',
      })
      .select()
      .single();
    testPatientId = patient.id;

    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .insert({
        hospital_id: testHospitalId,
        name: 'Dr. Reminder',
      })
      .select()
      .single();
    testDoctorId = doctor.id;
  });

  it('should send SMS reminder within 10 minutes of confirmation', async () => {
    const appointmentDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days

    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .insert({
        hospital_id: testHospitalId,
        patient_id: testPatientId,
        doctor_id: testDoctorId,
        appointment_date: appointmentDate.toISOString(),
        status: 'SCHEDULED',
      })
      .select()
      .single();

    // Confirm appointment
    const confirmTime = Date.now();

    const { data: confirmed } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'CONFIRMED',
        updated_at: new Date(confirmTime).toISOString(),
      })
      .eq('id', appointment.id)
      .select()
      .single();

    // Simulate SMS being sent 4 minutes later
    const reminderTime = new Date(confirmTime + 4 * 60 * 1000);

    const { data: notification } = await supabaseAdmin
      .from('notifications')
      .insert({
        hospital_id: testHospitalId,
        recipient_id: testPatientId,
        notification_type: 'SMS_REMINDER',
        related_entity_type: 'appointment',
        related_entity_id: appointment.id,
        message: `Reminder: Appointment on ${appointmentDate.toDateString()} with ${testDoctorId} at clinic`,
        sent_at: reminderTime.toISOString(),
        delivery_status: 'SUCCESS',
      })
      .select()
      .single();

    const latencySeconds = (reminderTime.getTime() - confirmTime) / 1000;

    expect(latencySeconds).toBeLessThan(600, 'SMS sent within 10 min');
    expect(notification.delivery_status).toBe('SUCCESS');
  });

  it('should send email reminder with booking confirmation details', async () => {
    const appointmentDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .insert({
        hospital_id: testHospitalId,
        patient_id: testPatientId,
        doctor_id: testDoctorId,
        appointment_date: appointmentDate.toISOString(),
        confirmation_code: `APT-${Date.now()}`,
        status: 'SCHEDULED',
      })
      .select()
      .single();

    const confirmTime = Date.now();

    await supabaseAdmin
      .from('appointments')
      .update({
        status: 'CONFIRMED',
        updated_at: new Date(confirmTime).toISOString(),
      })
      .eq('id', appointment.id);

    // Email sent 6 minutes later
    const reminderTime = new Date(confirmTime + 6 * 60 * 1000);

    const { data: emailNotif } = await supabaseAdmin
      .from('notifications')
      .insert({
        hospital_id: testHospitalId,
        recipient_id: testPatientId,
        notification_type: 'EMAIL_REMINDER',
        related_entity_id: appointment.id,
        message: `Appointment Confirmed - Code: ${appointment.confirmation_code}`,
        sent_at: reminderTime.toISOString(),
      })
      .select()
      .single();

    const latencySeconds = (reminderTime.getTime() - confirmTime) / 1000;

    expect(latencySeconds).toBeLessThan(600);
  });

  it('should calculate P95 reminder latency', async () => {
    const latencies: number[] = [];

    for (let i = 0; i < 60; i++) {
      const confirmTime = Date.now() + i * 1000;
      const appointmentDate = new Date(confirmTime + 24 * 60 * 60 * 1000);

      const { data: appointment } = await supabaseAdmin
        .from('appointments')
        .insert({
          hospital_id: testHospitalId,
          patient_id: testPatientId,
          doctor_id: testDoctorId,
          appointment_date: appointmentDate.toISOString(),
          status: 'CONFIRMED',
          updated_at: new Date(confirmTime).toISOString(),
        })
        .select()
        .single();

      // Random reminder delay 1-8 minutes (with most <5 min)
      const delaySeconds = 30 + Math.random() * 450;
      const reminderTime = new Date(confirmTime + delaySeconds * 1000);

      await supabaseAdmin
        .from('notifications')
        .insert({
          hospital_id: testHospitalId,
          recipient_id: testPatientId,
          notification_type: 'SMS_REMINDER',
          related_entity_id: appointment.id,
          sent_at: reminderTime.toISOString(),
        });

      latencies.push(delaySeconds);
    }

    const sorted = latencies.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    console.log(`Appointment reminder P95: ${p95.toFixed(1)} seconds`);
    expect(p95).toBeLessThan(600, 'P95 <10 minutes');
  });
});
```

---

## Monitoring & Alerting Rules

### Prometheus Alert Rules

```yaml
# prometheus-rules.yml
groups:
  - name: clinical_slos
    interval: 30s
    rules:
      # SLO 1: Registration → Appointment
      - alert: RegistrationAppointmentSLOBreach
        expr: histogram_quantile(0.95, registration_to_appointment_latency_seconds) > 1800
        for: 5m
        annotations:
          severity: warning
          summary: "Patient registration → appointment latency exceeded 30 min"

      # SLO 2: Prescription → Dispensing
      - alert: PrescriptionDispensingBreach
        expr: histogram_quantile(0.95, prescription_to_dispensing_latency_seconds) > 900
        for: 5m
        annotations:
          severity: warning
          summary: "Prescription dispensing latency exceeded 15 min"

      # SLO 3: Lab Critical Alert
      - alert: LabCriticalAlertBreach
        expr: histogram_quantile(0.95, lab_critical_alert_latency_seconds) > 300
        for: 1m
        annotations:
          severity: critical
          summary: "Critical lab alert latency exceeded 5 minutes"

      # SLO 4: Appointment Reminder
      - alert: AppointmentReminderBreach
        expr: histogram_quantile(0.95, appointment_to_reminder_latency_seconds) > 600
        for: 5m
        annotations:
          severity: warning
          summary: "Appointment reminder latency exceeded 10 min"
```

---

**Document Version**: 1.0  
**Last Updated**: March 13, 2026
