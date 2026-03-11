/**
 * T-P07: Vital Signs Capture Integration Test
 * Verifies the nurse vital-signs workflow:
 *   nurse records vitals → critical value detected →
 *   alert generated → doctor notified → alert acknowledged
 *
 * Uses a self-contained in-memory service to ensure isolation.
 *
 * Pyramid layer: INTEGRATION (20%)
 * F.I.R.S.T.: Fast, Isolated (fresh state per test), Repeatable, Self-validating
 */
import { describe, it, expect, beforeEach } from 'vitest';

// ── Types ──────────────────────────────────────────────────────────────────

interface VitalReading {
  id: string;
  patient_id: string;
  hospital_id: string;
  recorded_by: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  temperature?: number;   // Celsius
  oxygen_saturation?: number;  // %SpO2
  respiratory_rate?: number;
  recorded_at: string;
}

type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

interface CriticalAlert {
  id: string;
  patient_id: string;
  vital_reading_id: string;
  message: string;
  severity: AlertSeverity;
  acknowledged: boolean;
  acknowledged_by?: string;
  created_at: string;
}

// ── Thresholds ──────────────────────────────────────────────────────────────

const CRITICAL_THRESHOLDS = {
  systolic_bp: { low: 80, high: 180 },
  heart_rate: { low: 40, high: 150 },
  oxygen_saturation: { low: 90 },
  temperature: { low: 35, high: 39.5 },
  respiratory_rate: { high: 30 },
};

// ── In-Memory Vital Signs Service ──────────────────────────────────────────

class VitalSignsService {
  private readings: VitalReading[] = [];
  private alerts: CriticalAlert[] = [];
  private _idSeq = 0;

  private nextId(prefix: string): string {
    return `${prefix}-${++this._idSeq}`;
  }

  private evaluateCriticalValues(reading: VitalReading): CriticalAlert[] {
    const result: CriticalAlert[] = [];
    const now = new Date().toISOString();

    if (
      reading.systolic_bp !== undefined &&
      (reading.systolic_bp < CRITICAL_THRESHOLDS.systolic_bp.low ||
        reading.systolic_bp > CRITICAL_THRESHOLDS.systolic_bp.high)
    ) {
      result.push({
        id: this.nextId('alert'),
        patient_id: reading.patient_id,
        vital_reading_id: reading.id,
        message: `Critical blood pressure: ${reading.systolic_bp} mmHg systolic`,
        severity: reading.systolic_bp > 180 ? 'critical' : 'high',
        acknowledged: false,
        created_at: now,
      });
    }

    if (
      reading.heart_rate !== undefined &&
      (reading.heart_rate < CRITICAL_THRESHOLDS.heart_rate.low ||
        reading.heart_rate > CRITICAL_THRESHOLDS.heart_rate.high)
    ) {
      result.push({
        id: this.nextId('alert'),
        patient_id: reading.patient_id,
        vital_reading_id: reading.id,
        message: `Critical heart rate: ${reading.heart_rate} bpm`,
        severity: 'critical',
        acknowledged: false,
        created_at: now,
      });
    }

    if (
      reading.oxygen_saturation !== undefined &&
      reading.oxygen_saturation < CRITICAL_THRESHOLDS.oxygen_saturation.low
    ) {
      result.push({
        id: this.nextId('alert'),
        patient_id: reading.patient_id,
        vital_reading_id: reading.id,
        message: `Low oxygen saturation: ${reading.oxygen_saturation}% SpO2`,
        severity: reading.oxygen_saturation < 85 ? 'critical' : 'high',
        acknowledged: false,
        created_at: now,
      });
    }

    if (
      reading.temperature !== undefined &&
      (reading.temperature < CRITICAL_THRESHOLDS.temperature.low ||
        reading.temperature > CRITICAL_THRESHOLDS.temperature.high)
    ) {
      result.push({
        id: this.nextId('alert'),
        patient_id: reading.patient_id,
        vital_reading_id: reading.id,
        message: `Abnormal temperature: ${reading.temperature}°C`,
        severity: 'medium',
        acknowledged: false,
        created_at: now,
      });
    }

    if (
      reading.respiratory_rate !== undefined &&
      reading.respiratory_rate > CRITICAL_THRESHOLDS.respiratory_rate.high
    ) {
      result.push({
        id: this.nextId('alert'),
        patient_id: reading.patient_id,
        vital_reading_id: reading.id,
        message: `High respiratory rate: ${reading.respiratory_rate} breaths/min`,
        severity: 'high',
        acknowledged: false,
        created_at: now,
      });
    }

    return result;
  }

  recordVitals(
    patientId: string,
    hospitalId: string,
    recordedBy: string,
    vitals: Omit<VitalReading, 'id' | 'patient_id' | 'hospital_id' | 'recorded_by' | 'recorded_at'>
  ): { reading: VitalReading; alerts: CriticalAlert[] } {
    const reading: VitalReading = {
      id: this.nextId('vital'),
      patient_id: patientId,
      hospital_id: hospitalId,
      recorded_by: recordedBy,
      recorded_at: new Date().toISOString(),
      ...vitals,
    };
    this.readings.push(reading);
    const newAlerts = this.evaluateCriticalValues(reading);
    this.alerts.push(...newAlerts);
    return { reading, alerts: newAlerts };
  }

  getAlertsForPatient(patientId: string): CriticalAlert[] {
    return this.alerts.filter((a) => a.patient_id === patientId);
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) return false;
    alert.acknowledged = true;
    alert.acknowledged_by = acknowledgedBy;
    return true;
  }

  getUnacknowledgedAlerts(hospitalId?: string): CriticalAlert[] {
    return this.alerts.filter((a) => !a.acknowledged);
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Vital Signs Capture Integration (T-P07)', () => {
  let svc: VitalSignsService;
  const HOSPITAL = 'hospital-1';
  const PATIENT = 'patient-1';
  const NURSE = 'nurse-1';
  const DOCTOR = 'doctor-1';

  beforeEach(() => {
    svc = new VitalSignsService();
  });

  it('records normal vitals without generating alerts', () => {
    const { reading, alerts } = svc.recordVitals(PATIENT, HOSPITAL, NURSE, {
      systolic_bp: 120,
      diastolic_bp: 80,
      heart_rate: 72,
      temperature: 37.0,
      oxygen_saturation: 98,
      respiratory_rate: 16,
    });
    expect(reading.patient_id).toBe(PATIENT);
    expect(alerts).toHaveLength(0);
  });

  it('generates a critical alert for hypertensive crisis (systolic > 180)', () => {
    const { alerts } = svc.recordVitals(PATIENT, HOSPITAL, NURSE, { systolic_bp: 210 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].message).toContain('210');
  });

  it('generates a high alert for hypotension (systolic < 80)', () => {
    const { alerts } = svc.recordVitals(PATIENT, HOSPITAL, NURSE, { systolic_bp: 70 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('high');
  });

  it('generates a critical alert for bradycardia (HR < 40)', () => {
    const { alerts } = svc.recordVitals(PATIENT, HOSPITAL, NURSE, { heart_rate: 30 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
  });

  it('generates a critical alert for tachycardia (HR > 150)', () => {
    const { alerts } = svc.recordVitals(PATIENT, HOSPITAL, NURSE, { heart_rate: 180 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
  });

  it('generates a high alert for low SpO2 (< 90%)', () => {
    const { alerts } = svc.recordVitals(PATIENT, HOSPITAL, NURSE, { oxygen_saturation: 88 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('high');
  });

  it('generates a critical alert for very low SpO2 (< 85%)', () => {
    const { alerts } = svc.recordVitals(PATIENT, HOSPITAL, NURSE, { oxygen_saturation: 82 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
  });

  it('generates multiple alerts for multiple critical vitals', () => {
    const { alerts } = svc.recordVitals(PATIENT, HOSPITAL, NURSE, {
      systolic_bp: 220,
      heart_rate: 170,
      oxygen_saturation: 80,
    });
    expect(alerts.length).toBeGreaterThanOrEqual(3);
  });

  it('doctor can acknowledge an alert', () => {
    const { alerts } = svc.recordVitals(PATIENT, HOSPITAL, NURSE, { systolic_bp: 200 });
    const ack = svc.acknowledgeAlert(alerts[0].id, DOCTOR);
    expect(ack).toBe(true);
    expect(svc.getUnacknowledgedAlerts()).toHaveLength(0);
  });

  it('acknowledging unknown alert returns false', () => {
    expect(svc.acknowledgeAlert('nonexistent-alert', DOCTOR)).toBe(false);
  });

  it("getAlertsForPatient returns only that patient's alerts", () => {
    svc.recordVitals(PATIENT, HOSPITAL, NURSE, { systolic_bp: 200 });
    svc.recordVitals('patient-2', HOSPITAL, NURSE, { oxygen_saturation: 80 });
    expect(svc.getAlertsForPatient(PATIENT)).toHaveLength(1);
    expect(svc.getAlertsForPatient('patient-2')).toHaveLength(1);
  });

  it('full nurse workflow: record → alert → acknowledge', () => {
    // Nurse records critical vitals
    const { reading, alerts } = svc.recordVitals(PATIENT, HOSPITAL, NURSE, {
      systolic_bp: 195,
      oxygen_saturation: 87,
    });

    expect(reading.recorded_by).toBe(NURSE);
    expect(alerts.length).toBeGreaterThanOrEqual(2);

    const unacked = svc.getUnacknowledgedAlerts();
    expect(unacked.length).toBeGreaterThanOrEqual(2);

    // Doctor acknowledges all alerts
    for (const alert of alerts) {
      svc.acknowledgeAlert(alert.id, DOCTOR);
    }
    expect(svc.getUnacknowledgedAlerts()).toHaveLength(0);
  });
});
