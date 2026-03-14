/**
 * CareSync HIMS Clinical SLOs (Service Level Objectives)
 * 
 * Defines performance targets for clinical workflows
 * Maps to SLIs (Service Level Indicators) measured by telemetry
 * Drives alerts and dashboard thresholds
 * 
 * Based on healthcare best practices and clinical safety requirements
 */

export interface ClinicalSLO {
  /** Unique identifier */
  id: string;

  /** Display name for dashboards */
  name: string;

  /** Full description */
  description: string;

  /** Critical workflow this SLO protects */
  workflowType:
    | 'patient_registration'
    | 'patient_search'
    | 'consultation'
    | 'prescription'
    | 'lab_order'
    | 'lab_critical_value'
    | 'pharmacy_dispensing'
    | 'appointment'
    | 'vital_recording';

  /** Target latency or rate metric */
  target: {
    /** Type of metric (latency in ms, rate in percentage, count) */
    type: 'latency_ms' | 'rate_percent' | 'count';

    /** Target value */
    value: number;

    /** Unit for display */
    unit: string;

    /** Percentile (e.g., p50, p95, p99) */
    percentile?: 'p50' | 'p95' | 'p99';
  };

  /** Alert thresholds */
  alerts: {
    /** Warning threshold (e.g., 80% of SLO target) */
    warning: {
      value: number;
      unit: string;
    };

    /** Critical threshold (e.g., 100% of SLO target) */
    critical: {
      value: number;
      unit: string;
    };
  };

  /** Roles responsible for this SLO */
  owningRoles: string[];

  /** Whether this is patient-safety critical */
  isPatientSafetyCritical: boolean;

  /** Escalation rules if SLO breached */
  escalation?: {
    channel: 'pagerduty' | 'slack' | 'email' | 'sms';
    notifyRole: string;
    delayMinutes: number;
  };
}

/**
 * Patient Registration SLO
 * Patient walk-in → registration complete
 */
export const PATIENT_REGISTRATION_SLO: ClinicalSLO = {
  id: 'slo.patient.registration',
  name: 'Patient Registration Latency',
  description: 'Time from patient arrival to registration completion',
  workflowType: 'patient_registration',
  target: {
    type: 'latency_ms',
    value: 300000, // 5 minutes
    unit: 'ms',
    percentile: 'p95',
  },
  alerts: {
    warning: { value: 240000, unit: 'ms' }, // 4 min
    critical: { value: 300000, unit: 'ms' }, // 5 min
  },
  owningRoles: ['receptionist', 'admin'],
  isPatientSafetyCritical: false,
};

/**
 * Patient Search SLO
 * Query latency for patient lookup (UHID/name search)
 * Must be <2s for good UX
 */
export const PATIENT_SEARCH_SLO: ClinicalSLO = {
  id: 'slo.patient.search',
  name: 'Patient Search Latency',
  description: 'Time for patient lookup by UHID or name',
  workflowType: 'patient_search',
  target: {
    type: 'latency_ms',
    value: 2000,
    unit: 'ms',
    percentile: 'p95',
  },
  alerts: {
    warning: { value: 1500, unit: 'ms' },
    critical: { value: 2000, unit: 'ms' },
  },
  owningRoles: ['doctor', 'nurse', 'receptionist', 'admin'],
  isPatientSafetyCritical: false,
  escalation: {
    channel: 'slack',
    notifyRole: 'admin',
    delayMinutes: 5,
  },
};

/**
 * Consultation SLO
 * Patient registration → doctor consultation start
 */
export const CONSULTATION_SLO: ClinicalSLO = {
  id: 'slo.consultation.start',
  name: 'Consultation Start Latency',
  description: 'Wait time from patient registration to consultation',
  workflowType: 'consultation',
  target: {
    type: 'latency_ms',
    value: 1800000, // 30 minutes
    unit: 'ms',
    percentile: 'p95',
  },
  alerts: {
    warning: { value: 1500000, unit: 'ms' }, // 25 min
    critical: { value: 1800000, unit: 'ms' }, // 30 min
  },
  owningRoles: ['doctor', 'nurse', 'admin'],
  isPatientSafetyCritical: false,
};

/**
 * Prescription Creation SLO
 * Doctor diagnosis → prescription recorded in system
 */
export const PRESCRIPTION_CREATION_SLO: ClinicalSLO = {
  id: 'slo.prescription.create',
  name: 'Prescription Creation Latency',
  description: 'Time from doctor diagnosis to prescription entry in system',
  workflowType: 'prescription',
  target: {
    type: 'latency_ms',
    value: 300000, // 5 minutes
    unit: 'ms',
    percentile: 'p95',
  },
  alerts: {
    warning: { value: 240000, unit: 'ms' },
    critical: { value: 300000, unit: 'ms' },
  },
  owningRoles: ['doctor', 'nurse'],
  isPatientSafetyCritical: true,
  escalation: {
    channel: 'pagerduty',
    notifyRole: 'doctor',
    delayMinutes: 2,
  },
};

/**
 * Prescription Dispensing SLO (CRITICAL)
 * Prescription creation → pharmacy dispenses medicine
 * Target <15 minutes per healthcare guidelines
 */
export const PRESCRIPTION_DISPENSING_SLO: ClinicalSLO = {
  id: 'slo.prescription.dispense',
  name: 'Prescription Dispensing Latency',
  description: 'Time from prescription creation to pharmacy dispensing',
  workflowType: 'pharmacy_dispensing',
  target: {
    type: 'latency_ms',
    value: 900000, // 15 minutes
    unit: 'ms',
    percentile: 'p95',
  },
  alerts: {
    warning: { value: 720000, unit: 'ms' }, // 12 min
    critical: { value: 900000, unit: 'ms' }, // 15 min
  },
  owningRoles: ['pharmacist', 'admin'],
  isPatientSafetyCritical: true,
  escalation: {
    channel: 'pagerduty',
    notifyRole: 'pharmacist',
    delayMinutes: 1,
  },
};

/**
 * Lab Order SLO
 * Doctor order → lab system receives order
 */
export const LAB_ORDER_SLO: ClinicalSLO = {
  id: 'slo.lab.order',
  name: 'Lab Order Registration Latency',
  description: 'Time from doctor lab order to lab system confirmation',
  workflowType: 'lab_order',
  target: {
    type: 'latency_ms',
    value: 300000, // 5 minutes
    unit: 'ms',
    percentile: 'p95',
  },
  alerts: {
    warning: { value: 240000, unit: 'ms' },
    critical: { value: 300000, unit: 'ms' },
  },
  owningRoles: ['doctor', 'lab_technician', 'admin'],
  isPatientSafetyCritical: false,
};

/**
 * Lab Critical Value Alert SLO (CRITICAL)
 * Lab detects critical value → doctor notified
 * Target <5 minutes per CLIA regulations
 * Patient safety critical - immediate escalation
 */
export const LAB_CRITICAL_VALUE_SLO: ClinicalSLO = {
  id: 'slo.lab.critical_value',
  name: 'Lab Critical Value Alert Latency',
  description: 'Time from critical value detection to doctor notification',
  workflowType: 'lab_critical_value',
  target: {
    type: 'latency_ms',
    value: 300000, // 5 minutes
    unit: 'ms',
    percentile: 'p99', // Strictest percentile for safety
  },
  alerts: {
    warning: { value: 240000, unit: 'ms' }, // 4 min
    critical: { value: 300000, unit: 'ms' }, // 5 min
  },
  owningRoles: ['doctor', 'lab_technician', 'nurse', 'admin'],
  isPatientSafetyCritical: true,
  escalation: {
    channel: 'pagerduty',
    notifyRole: 'doctor',
    delayMinutes: 1,
  },
};

/**
 * Appointment Confirmation SLO
 * Appointment created → notification sent to patient
 */
export const APPOINTMENT_REMINDER_SLO: ClinicalSLO = {
  id: 'slo.appointment.reminder',
  name: 'Appointment Reminder Latency',
  description: 'Time from appointment confirmation to patient reminder sent',
  workflowType: 'appointment',
  target: {
    type: 'latency_ms',
    value: 600000, // 10 minutes
    unit: 'ms',
    percentile: 'p95',
  },
  alerts: {
    warning: { value: 480000, unit: 'ms' }, // 8 min
    critical: { value: 600000, unit: 'ms' }, // 10 min
  },
  owningRoles: ['receptionist', 'admin'],
  isPatientSafetyCritical: false,
};

/**
 * Vital Signs Recording SLO
 * Nurse records vital → data persisted in EMR
 */
export const VITAL_RECORDING_SLO: ClinicalSLO = {
  id: 'slo.vital.record',
  name: 'Vital Signs Recording Latency',
  description: 'Time from nurse entry to vital signs saved in EMR',
  workflowType: 'vital_recording',
  target: {
    type: 'latency_ms',
    value: 5000, // 5 seconds
    unit: 'ms',
    percentile: 'p95',
  },
  alerts: {
    warning: { value: 4000, unit: 'ms' },
    critical: { value: 5000, unit: 'ms' },
  },
  owningRoles: ['nurse', 'admin'],
  isPatientSafetyCritical: true,
  escalation: {
    channel: 'slack',
    notifyRole: 'nurse',
    delayMinutes: 1,
  },
};

/**
 * All SLOs indexed by ID
 */
export const ALL_SLOS: Map<string, ClinicalSLO> = new Map([
  [PATIENT_REGISTRATION_SLO.id, PATIENT_REGISTRATION_SLO],
  [PATIENT_SEARCH_SLO.id, PATIENT_SEARCH_SLO],
  [CONSULTATION_SLO.id, CONSULTATION_SLO],
  [PRESCRIPTION_CREATION_SLO.id, PRESCRIPTION_CREATION_SLO],
  [PRESCRIPTION_DISPENSING_SLO.id, PRESCRIPTION_DISPENSING_SLO],
  [LAB_ORDER_SLO.id, LAB_ORDER_SLO],
  [LAB_CRITICAL_VALUE_SLO.id, LAB_CRITICAL_VALUE_SLO],
  [APPOINTMENT_REMINDER_SLO.id, APPOINTMENT_REMINDER_SLO],
  [VITAL_RECORDING_SLO.id, VITAL_RECORDING_SLO],
]);

/**
 * Get all patient-safety critical SLOs
 */
export function getCriticalSLOs(): ClinicalSLO[] {
  return Array.from(ALL_SLOS.values()).filter((slo) => slo.isPatientSafetyCritical);
}

/**
 * Get SLOs for a specific role
 */
export function getSLOsByRole(role: string): ClinicalSLO[] {
  return Array.from(ALL_SLOS.values()).filter((slo) => slo.owningRoles.includes(role));
}

/**
 * Get SLOs for a specific workflow
 */
export function getSLOsByWorkflow(workflowType: string): ClinicalSLO[] {
  return Array.from(ALL_SLOS.values()).filter((slo) => slo.workflowType === workflowType);
}

/**
 * Check if metric meets SLO
 */
export function checkSLOBreached(
  slοId: string,
  measuredValue: number
): { breached: boolean; severity: 'none' | 'warning' | 'critical' } {
  const slo = ALL_SLOS.get(slοId);
  if (!slo) {
    return { breached: false, severity: 'none' };
  }

  if (measuredValue >= slo.alerts.critical.value) {
    return { breached: true, severity: 'critical' };
  }

  if (measuredValue >= slo.alerts.warning.value) {
    return { breached: true, severity: 'warning' };
  }

  return { breached: false, severity: 'none' };
}

/**
 * Get escalation rule for SLO breach
 */
export function getEscalationRule(sloId: string) {
  const slo = ALL_SLOS.get(sloId);
  return slo?.escalation || null;
}

export default {
  ALL_SLOS,
  getCriticalSLOs,
  getSLOsByRole,
  getSLOsByWorkflow,
  checkSLOBreached,
  getEscalationRule,
};
