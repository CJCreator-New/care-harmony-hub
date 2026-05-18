// @ts-nocheck
import { logAudit } from './sanitize';

// ─── Mock State Management ──────────────────────────────────────────────────
// In-memory stores for mock data persistence across function calls
const admittedPatients = new Map<string, any>();
const wardOccupancy = new Map<string, number>(); // wardId → occupancyCount
const patientAcuityHistory = new Map<string, string[]>(); // patientId → [levels]
const levels = ['Low', 'Medium', 'High', 'Critical'];

// ─── Ward Management Service ─────────────────────────────────────────────

export async function admitPatient(
  patient: any,
  wardId: string,
  admissionType: string,
  reason: string
): Promise<any> {
  // Check if ward is at capacity (full-ward is always full)
  if (wardId === 'full-ward') {
    throw new Error('Ward is at full capacity');
  }

  const bedNumber = `bed-${Math.floor(Math.random() * 100)}`;
  const admissionId = `admit_${Date.now()}`;

  // Store patient data for later lookup (e.g., on discharge)
  admittedPatients.set(patient.id, patient);
  
  // Update ward occupancy tracking
  const currentOccupancy = wardOccupancy.get(wardId) || 0;
  wardOccupancy.set(wardId, currentOccupancy + 1);

  const result = {
    id: admissionId,
    patientId: patient.id,
    wardId,
    bedNumber,
    admissionType,
    admissionReason: reason,
    status: 'admitted',
    admittedAt: new Date(),
    admittedBy: 'system',
    bedOccupied: true,
    primaryNurseId: `nurse_${Math.floor(Math.random() * 1000)}`,
    wardOccupancy: {
      occupied: wardOccupancy.get(wardId) || 1,
      total: 10,
      available: 10 - (wardOccupancy.get(wardId) || 1),
    },
    hospitalId: patient.hospitalId,
  };

  logAudit({
    hospital_id: patient.hospitalId,
    user_id: 'system',
    action: 'PATIENT_ADMITTED',
    resourceType: 'admission',
    entity_id: admissionId,
  });

  return result;
}

export async function transferPatientBed(
  patientId: string,
  newBedNumber: string,
  reason: string
): Promise<any> {
  const transferId = `transfer_${Date.now()}`;

  // Check if bed is occupied (mock logic)
  if (newBedNumber === 'occupied-bed-01') {
    throw new Error('Bed already occupied');
  }

  const result = {
    id: transferId,
    patientId,
    newBedNumber,
    previousBedNumber: `bed-${Math.floor(Math.random() * 100)}`,
    transferReason: reason,
    transferredAt: new Date(),
    transferredBy: 'system',
    previousBedStatus: 'vacant',
    newBedStatus: 'occupied',
    wardOccupancy: {
      occupied: Math.floor(Math.random() * 10) + 1,
      total: 10,
    },
  };

  logAudit({
    hospital_id: 'hosp-001',
    user_id: 'system',
    action: 'BED_TRANSFER',
    entity_id: transferId,
  });

  return result;
}

export async function dischargePatient(
  patientId: string,
  destination: string,
  reason: string
): Promise<any> {
  const dischargeId = `discharge_${Date.now()}`;
  
  // Look up patient name from admitted patients map
  const patient = admittedPatients.get(patientId);
  const patientName = patient?.name || patientId;
  
  // Clean up: remove from admitted map
  admittedPatients.delete(patientId);

  const result = {
    id: dischargeId,
    patientId,
    status: 'discharged',
    dischargedAt: new Date(),
    dischargeReason: reason,
    dischargeDestination: destination,
    bedFreed: true,
    dischargeSummary: `Patient ${patientName} discharged to ${destination}. Reason: ${reason}. Follow-up scheduled.`,
    wardOccupancy: {
      occupied: Math.floor(Math.random() * 10),
      total: 10,
    },
    followUpScheduled: true,
    dischargePrecautions: ['Take medications as prescribed', 'Rest for 2 weeks', 'Follow up in OPD'],
  };

  logAudit({
    hospital_id: 'hosp-001',
    user_id: 'system',
    action: 'PATIENT_DISCHARGED',
    entity_id: dischargeId,
  });

  return result;
}

export async function assignNurse(
  patientId: string,
  nurseId: string,
  role: string = 'primary'
): Promise<any> {
  const assignmentId = `assign_${Date.now()}`;

  // Check for overload (mock: 'overloaded-nurse' is always at capacity)
  if (nurseId === 'overloaded-nurse') {
    throw new Error('Nurse already at maximum patient capacity');
  }

  logAudit({
    hospital_id: 'hosp-001',
    user_id: nurseId,
    action: 'NURSE_ASSIGNED',
    entity_type: 'patient',
    entity_id: patientId,
  });

  return {
    id: assignmentId,
    patientId,
    nurseId,
    role,
    assignedAt: new Date(),
    nurseWorkload: Math.floor(Math.random() * 5) + 1,
    status: 'assigned',
  };
}

export async function recordVitalSigns(
  patientId: string,
  vitals: any
): Promise<any> {
  const recordId = `vital_${Date.now()}`;

  // Analyze vitals for abnormalities
  const alerts: string[] = [];
  let isAbnormal = false;
  let isCritical = false;

  // Temperature checks
  if (vitals.temperature !== undefined) {
    if (vitals.temperature > 39) {
      alerts.push('High temperature');
      isAbnormal = true;
    }
    if (vitals.temperature > 40) {
      alerts.push('Critical fever');
      isCritical = true;
    }
  }

  // Blood pressure checks
  if (vitals.bloodPressure) {
    if (vitals.bloodPressure.systolic > 180 || vitals.bloodPressure.diastolic > 110) {
      alerts.push('Elevated blood pressure');
      isAbnormal = true;
    }
    if (vitals.bloodPressure.systolic > 200 || vitals.bloodPressure.diastolic > 120) {
      alerts.push('Critical hypertension');
      isCritical = true;
    }
  }

  // Heart rate checks
  if (vitals.heartRate !== undefined) {
    if (vitals.heartRate > 120 || vitals.heartRate < 50) {
      alerts.push('Abnormal heart rate');
      isAbnormal = true;
    }
    if (vitals.heartRate > 140) {
      alerts.push('Tachycardia');
      isCritical = true;
    }
  }

  // Oxygen saturation checks
  if (vitals.oxygenSaturation !== undefined) {
    if (vitals.oxygenSaturation < 92) {
      alerts.push('Low oxygen saturation');
      isAbnormal = true;
    }
    if (vitals.oxygenSaturation < 85) {
      alerts.push('Critical hypoxia');
      isCritical = true;
    }
  }

  logAudit({
    hospital_id: 'hosp-001',
    user_id: 'system',
    action: 'record_vital_signs',
    entity_type: 'patient',
    entity_id: patientId,
  });

  return {
    id: recordId,
    patientId,
    ...vitals,
    recordedAt: new Date(),
    status: 'recorded',
    normalRange: !isAbnormal,
    alerts,
    criticalAlert: isCritical,
    requiresImmediateAttention: isCritical,
  };
}

export async function updateClinicalStatus(
  patientId: string,
  status: string,
  details: any
): Promise<any> {
  const updateId = `status_${Date.now()}`;

  logAudit({
    hospital_id: 'hosp-001',
    user_id: 'system',
    action: 'update_clinical_status',
    entity_type: 'patient',
    entity_id: patientId,
  });

  return {
    id: updateId,
    patientId,
    status,
    statusDetails: details,
    lastUpdated: new Date(),
    updatedAt: new Date(),
  };
}

export async function scheduleFollowUp(
  patientId: string,
  followUpOptions: any
): Promise<any> {
  const followUpId = `followup_${Date.now()}`;

  logAudit({
    hospital_id: 'hosp-001',
    user_id: 'system',
    action: 'schedule_followup',
    entity_type: 'patient',
    entity_id: patientId,
  });

  return {
    id: followUpId,
    patientId,
    appointmentDate: followUpOptions.appointmentDate,
    department: followUpOptions.department,
    reason: followUpOptions.reason,
    priority: followUpOptions.priority,
    status: 'scheduled',
  };
}

export async function requestConsultation(
  patientId: string,
  consultationOptions: any
): Promise<any> {
  const consultationId = `consult_${Date.now()}`;

  logAudit({
    hospital_id: 'hosp-001',
    user_id: 'system',
    action: 'request_consultation',
    entity_type: 'patient',
    entity_id: patientId,
  });

  return {
    id: consultationId,
    patientId,
    speciality: consultationOptions.speciality,
    reason: consultationOptions.reason,
    urgency: consultationOptions.urgency,
    status: 'requested',
    requestedAt: new Date(),
  };
}

export async function manageBedOccupancy(wardId: string): Promise<any> {
  const occupied = wardOccupancy.get(wardId) || 0;
  const total = 10;
  const available = Math.max(0, total - occupied);
  
  return {
    wardId,
    totalBeds: total,
    occupied,
    available,
    occupancyRate: occupied / total,
    occupiedBeds: occupied,
    availableBeds: available,
  };
}

export async function trackAcuityLevel(patientId: string): Promise<any> {
  const trackId = `acuity_${Date.now()}`;
  
  // Get previous level for this patient (if any)
  const history = patientAcuityHistory.get(patientId) || [];
  const lastLevel = history[history.length - 1];
  
  // Get a different level than the last one
  let newLevel: string;
  do {
    newLevel = levels[Math.floor(Math.random() * levels.length)];
  } while (newLevel === lastLevel && levels.length > 1);
  
  // Store in history
  history.push(newLevel);
  patientAcuityHistory.set(patientId, history);

  logAudit({
    hospital_id: 'hosp-001',
    user_id: 'system',
    action: 'track_acuity_level',
    entity_type: 'patient',
    entity_id: patientId,
  });

  return {
    id: trackId,
    patientId,
    level: newLevel,
    trackedAt: new Date(),
  };
}

export async function handleEmergencyTransfer(
  patientId: string,
  toWard: string,
  reason: string
): Promise<any> {
  const transferId = `emergency_transfer_${Date.now()}`;
  const newBedNumber = `bed-${Math.floor(Math.random() * 100)}`;
  const mockFromWard = 'ward-01'; // Mock: assume patient was in ward-01

  logAudit({
    hospital_id: 'hosp-001',
    user_id: 'system',
    action: 'EMERGENCY_TRANSFER',
    entity_id: transferId,
  });

  return {
    id: transferId,
    patientId,
    fromWard: mockFromWard,
    toWard,
    newBedNumber,
    reason,
    transferredAt: new Date(),
    priority: 'Emergency',
    status: 'transferred',
  };
}

export async function validateDischargeReadiness(patientId: string): Promise<any> {
  return {
    patientId,
    canDischarge: true,
    checks: [
      { check: 'Vital Signs Stable', status: 'pass' },
      { check: 'Doctor Clearance', status: 'pass' },
      { check: 'Medications Reviewed', status: 'pass' },
      { check: 'Discharge Plan Documented', status: 'pass' },
    ],
    readinessScore: 100,
  };
}
