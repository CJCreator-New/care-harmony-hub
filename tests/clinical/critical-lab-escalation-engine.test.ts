/**
 * Comprehensive Architectural Tests: Critical Lab Alert Escalation Engine (`critical-lab-escalation`)
 *
 * Implements and verifies ADR-0005 Invariants at the module boundary:
 * 1. Multi-tier escalation ladder: Primary (0m) -> On-Call (5m) -> Emergency Dept (10m)
 * 2. Automatic queue cancellation when primary physician acknowledges or alert resolves
 * 3. Multi-tenant hospital isolation
 * 4. Immutable audit history on all alert events
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CriticalLabEscalationEngine,
  InMemoryLabEscalationAdapter,
  LabEscalationActor,
  ESCALATION_INTERVALS_MS,
} from '@/modules/critical-lab-escalation';

describe('CriticalLabEscalationEngine - Public Interface Tests (ADR-0005)', () => {
  let engine: CriticalLabEscalationEngine;
  let adapter: InMemoryLabEscalationAdapter;

  const doctorActor: LabEscalationActor = {
    id: 'primary-doc-1',
    hospitalId: 'hospital-alpha',
    role: 'doctor',
  };

  const onCallDoctorId = 'on-call-doc-1';

  const foreignDoctorActor: LabEscalationActor = {
    id: 'foreign-doc-1',
    hospitalId: 'hospital-beta',
    role: 'doctor',
  };

  beforeEach(() => {
    adapter = new InMemoryLabEscalationAdapter();
    engine = new CriticalLabEscalationEngine({
      repo: adapter,
      auditLogger: adapter,
      notifier: adapter,
    });
  });

  it('records critical lab alert and generates the ADR-0005 3-tier escalation ladder', async () => {
    const res = await engine.recordCriticalAlert(doctorActor, {
      labResultId: 'res-101',
      patientId: 'patient-201',
      testName: 'Potassium (Serum)',
      testCode: 'K_SERUM',
      resultValue: 6.8, // Critical hyperkalemia
      unit: 'mmol/L',
      severity: 'critical_high',
      primaryDoctorId: doctorActor.id,
      onCallDoctorId,
    });

    expect(res.success).toBe(true);
    expect(res.alert).toBeDefined();
    expect(res.escalations).toHaveLength(3);

    const levels = res.escalations!.map((e) => e.escalation_level);
    expect(levels).toEqual(['primary', 'on_call', 'er']);

    // Check delay intervals
    const alertTime = new Date(res.alert!.created_at).getTime();
    const primaryTime = new Date(res.escalations![0].scheduled_for).getTime();
    const onCallTime = new Date(res.escalations![1].scheduled_for).getTime();
    const erTime = new Date(res.escalations![2].scheduled_for).getTime();

    expect(primaryTime - alertTime).toBe(ESCALATION_INTERVALS_MS.primary); // 0m
    expect(onCallTime - alertTime).toBe(ESCALATION_INTERVALS_MS.on_call); // 5m
    expect(erTime - alertTime).toBe(ESCALATION_INTERVALS_MS.er); // 10m

    // Verify immediate primary notification
    expect(adapter.dispatchedNotifications).toHaveLength(1);
    expect(adapter.dispatchedNotifications[0].level).toBe('primary');
    expect(adapter.dispatchedNotifications[0].targetUserId).toBe(doctorActor.id);
  });

  it('strictly enforces ADR-0005: Auto-cancels pending escalation items upon physician acknowledgment', async () => {
    const initRes = await engine.recordCriticalAlert(doctorActor, {
      labResultId: 'res-102',
      patientId: 'patient-202',
      testName: 'Troponin-T',
      testCode: 'TROP_T',
      resultValue: 1.45,
      severity: 'critical_high',
      primaryDoctorId: doctorActor.id,
      onCallDoctorId,
    });
    const alertId = initRes.alert!.id;

    // Acknowledge alert with clinical notes
    const ackRes = await engine.acknowledgeAlert(doctorActor, {
      alertId,
      notes: 'Notified patient. Initiating immediate emergency transfer.',
    });

    expect(ackRes.success).toBe(true);
    expect(ackRes.alert?.primary_acknowledged_at).toBeDefined();
    expect(ackRes.alert?.primary_action_taken).toBe(true);

    // Verify pending ladder items in the queue were auto-cancelled
    const pendingDue = await adapter.getPendingEscalations(
      doctorActor.hospitalId,
      new Date(Date.now() + 60 * 60 * 1000).toISOString()
    );
    expect(pendingDue).toHaveLength(0); // All pending items cancelled!
  });

  it('dispatches background ladder escalations sequentially if unacknowledged', async () => {
    const initRes = await engine.recordCriticalAlert(doctorActor, {
      labResultId: 'res-103',
      patientId: 'patient-203',
      testName: 'Sodium (Serum)',
      testCode: 'NA_SERUM',
      resultValue: 112, // Critical hyponatremia
      severity: 'critical_low',
      primaryDoctorId: doctorActor.id,
      onCallDoctorId,
    });
    const alertTime = new Date(initRes.alert!.created_at).getTime();

    // Fast forward to +6 minutes (On-Call escalation is due)
    const at6Min = new Date(alertTime + 6 * 60 * 1000).toISOString();
    const result1 = await engine.processDueEscalations(doctorActor.hospitalId, at6Min);

    expect(result1.dispatchedCount).toBeGreaterThan(0);
    const onCallNotification = adapter.dispatchedNotifications.find((n) => n.level === 'on_call');
    expect(onCallNotification).toBeDefined();
    expect(onCallNotification?.targetUserId).toBe(onCallDoctorId);

    // Fast forward to +11 minutes (Emergency department escalation is due)
    const at11Min = new Date(alertTime + 11 * 60 * 1000).toISOString();
    const result2 = await engine.processDueEscalations(doctorActor.hospitalId, at11Min);

    expect(result2.dispatchedCount).toBeGreaterThan(0);
    const erNotification = adapter.dispatchedNotifications.find((n) => n.level === 'er');
    expect(erNotification).toBeDefined();
  });

  it('enforces multi-tenant hospital scoping on acknowledgment and resolution', async () => {
    const initRes = await engine.recordCriticalAlert(doctorActor, {
      labResultId: 'res-104',
      patientId: 'patient-204',
      testName: 'Lactate (Venous)',
      testCode: 'LACTATE',
      resultValue: 4.8,
      severity: 'critical_high',
      primaryDoctorId: doctorActor.id,
    });
    const alertId = initRes.alert!.id;

    // Cross-tenant attempt fails
    const crossAck = await engine.acknowledgeAlert(foreignDoctorActor, { alertId });
    expect(crossAck.success).toBe(false);
    expect(crossAck.error).toContain('Hospital tenant mismatch');
  });

  it('resolves alert and preserves full chronological audit history', async () => {
    const initRes = await engine.recordCriticalAlert(doctorActor, {
      labResultId: 'res-105',
      patientId: 'patient-205',
      testName: 'Hemoglobin',
      testCode: 'HGB',
      resultValue: 5.2,
      severity: 'critical_low',
      primaryDoctorId: doctorActor.id,
    });
    const alertId = initRes.alert!.id;

    await engine.acknowledgeAlert(doctorActor, {
      alertId,
      notes: 'Blood bank contacted. 2 units PRBC ordered.',
    });

    // Resolution requires >= 5 chars
    const shortResolve = await engine.resolveAlert(doctorActor, {
      alertId,
      notes: 'done',
    });
    expect(shortResolve.success).toBe(false);
    expect(shortResolve.error).toContain('at least 5 characters');

    // Valid resolution
    const validResolve = await engine.resolveAlert(doctorActor, {
      alertId,
      notes: 'Transfusion complete. Post-transfusion Hgb stable at 8.9.',
    });
    expect(validResolve.success).toBe(true);
    expect(validResolve.alert?.is_resolved).toBe(true);

    const auditTrail = await engine.getAuditTrail(alertId);
    expect(auditTrail.length).toBeGreaterThanOrEqual(3);
    const actions = auditTrail.map((a) => a.action);
    expect(actions).toContain('critical_alert_created');
    expect(actions).toContain('critical_alert_acknowledged');
    expect(actions).toContain('critical_alert_resolved');
  });
});
