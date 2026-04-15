import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  admitPatient,
  transferPatientBed,
  dischargePatient,
  assignNurse,
  recordVitalSigns,
  updateClinicalStatus,
  scheduleFollowUp,
  requestConsultation,
  manageBedOccupancy,
  trackAcuityLevel,
  handleEmergencyTransfer,
  validateDischargeReadiness,
} from '@/utils/wardManagementService';
import { logAudit } from '@/utils/sanitize';

vi.mock('@/utils/sanitize');

// Test Fixtures
const mockPatient = {
  id: 'pat-001',
  name: 'Rajesh Singh',
  mrn: '00123456',
  age: 65,
  weight: 75,
  height: 170,
  hospitalId: 'hosp-001',
};

const mockWard = {
  id: 'ward-01',
  name: 'ICU Ward',
  hospitalId: 'hosp-001',
  totalBeds: 10,
  bedType: 'ICU',
};

const mockNurse = {
  id: 'nurse-001',
  name: 'Priya Sharma',
  license: 'NMC-54321',
  department: 'ICU',
  hospitalId: 'hosp-001',
};

describe('Ward Management - Patient Admission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should admit patient to ward', async () => {
    const result = await admitPatient(mockPatient, mockWard.id, 'Emergency', 'Post-trauma care needed');

    expect(result).toEqual(expect.objectContaining({
      patientId: mockPatient.id,
      wardId: mockWard.id,
      admissionType: 'Emergency',
      status: 'admitted',
      admittedAt: expect.any(Date),
    }));
  });

  it('should assign bed during admission', async () => {
    const result = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Routine surgery');

    expect(result.bedNumber).toBeDefined();
    expect(result.bedOccupied).toBe(true);
  });

  it('should update ward occupancy on admission', async () => {
    const result = await admitPatient(mockPatient, mockWard.id, 'Emergency', 'Care needed');

    expect(result.wardOccupancy).toBeDefined();
    expect(result.wardOccupancy.occupied).toBeGreaterThan(0);
  });

  it('should reject admission if ward is full', async () => {
    // Assuming ward has max capacity
    await expect(() => admitPatient(mockPatient, 'full-ward', 'Planned', 'Surgery'))
      .rejects
      .toThrow();
  });

  it('should log admission', async () => {
    await admitPatient(mockPatient, mockWard.id, 'Emergency', 'Care needed');

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PATIENT_ADMITTED',
        resourceType: 'admission',
      })
    );
  });

  it('should assign default nurse on admission', async () => {
    const result = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    expect(result.primaryNurseId).toBeDefined();
  });
});

describe('Ward Management - Bed Transfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transfer patient to different bed', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const transfer = await transferPatientBed(admission.patientId, 'bed-05', 'Room upgrade');

    expect(transfer.newBedNumber).toBe('bed-05');
    expect(transfer.transferReason).toBe('Room upgrade');
    expect(transfer.transferredAt).toBeDefined();
  });

  it('should update occupancy on bed transfer', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const transfer = await transferPatientBed(admission.patientId, 'bed-06', 'Clinical requirement');

    expect(transfer.previousBedStatus).toBe('vacant');
    expect(transfer.newBedStatus).toBe('occupied');
  });

  it('should prevent transfer to occupied bed', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    await expect(() => transferPatientBed(admission.patientId, 'occupied-bed-01', 'Transfer'))
      .rejects
      .toThrow('Bed already occupied');
  });

  it('should log bed transfer', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    await transferPatientBed(admission.patientId, 'bed-07', 'Acuity increase');

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BED_TRANSFER',
      })
    );
  });
});

describe('Ward Management - Patient Discharge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should discharge patient from ward', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const discharge = await dischargePatient(admission.patientId, 'Home', 'Fully recovered');

    expect(discharge).toEqual(expect.objectContaining({
      patientId: mockPatient.id,
      status: 'discharged',
      dischargedAt: expect.any(Date),
      dischargeReason: 'Fully recovered',
    }));
  });

  it('should free up bed on discharge', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const discharge = await dischargePatient(admission.patientId, 'Home', 'Recovery complete');

    expect(discharge.bedFreed).toBe(true);
    expect(discharge.wardOccupancy.occupied).toBeLessThan(mockWard.totalBeds);
  });

  it('should validate discharge readiness', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const readiness = await validateDischargeReadiness(admission.patientId);

    expect(readiness).toEqual(expect.objectContaining({
      canDischarge: expect.any(Boolean),
      checks: expect.any(Array),
    }));
  });

  it('should generate discharge summary', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const discharge = await dischargePatient(admission.patientId, 'Discharged', 'Recovered');

    expect(discharge.dischargeSummary).toBeDefined();
    expect(discharge.dischargeSummary).toContain(mockPatient.name);
  });

  it('should schedule follow-up on discharge', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const discharge = await dischargePatient(admission.patientId, 'Discharged', 'Recovered');

    expect(discharge.followUpScheduled).toBe(true);
  });

  it('should log discharge', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    await dischargePatient(admission.patientId, 'Discharged', 'Recovered');

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PATIENT_DISCHARGED',
      })
    );
  });
});

describe('Ward Management - Nurse Assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should assign primary nurse to patient', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const assignment = await assignNurse(admission.patientId, mockNurse.id, 'primary');

    expect(assignment).toEqual(expect.objectContaining({
      patientId: mockPatient.id,
      nurseId: mockNurse.id,
      role: 'primary',
      assignedAt: expect.any(Date),
    }));
  });

  it('should assign secondary nurses as needed', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    await assignNurse(admission.patientId, mockNurse.id, 'primary');

    const secondary = await assignNurse(admission.patientId, 'nurse-002', 'secondary');

    expect(secondary.role).toBe('secondary');
  });

  it('should track nurse-to-patient ratio', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const assignment = await assignNurse(admission.patientId, mockNurse.id, 'primary');

    expect(assignment.nurseWorkload).toBeDefined();
  });

  it('should prevent nurse overload', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    // If nurse already has max patients
    await expect(() => assignNurse(admission.patientId, 'overloaded-nurse', 'primary'))
      .rejects
      .toThrow();
  });

  it('should log nurse assignment', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    await assignNurse(admission.patientId, mockNurse.id, 'primary');

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'NURSE_ASSIGNED',
      })
    );
  });
});

describe('Ward Management - Vital Signs & Clinical Status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should record vital signs', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const vitals = await recordVitalSigns(admission.patientId, {
      temperature: 37.2,
      bloodPressure: { systolic: 120, diastolic: 80 },
      heartRate: 72,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      timestamp: new Date(),
    });

    expect(vitals).toEqual(expect.objectContaining({
      patientId: mockPatient.id,
      temperature: 37.2,
      heartRate: 72,
      recordedAt: expect.any(Date),
    }));
  });

  it('should flag abnormal vital signs', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const vitals = await recordVitalSigns(admission.patientId, {
      temperature: 39.5,
      bloodPressure: { systolic: 180, diastolic: 110 },
      heartRate: 120,
      respiratoryRate: 25,
      oxygenSaturation: 85,
      timestamp: new Date(),
    });

    expect(vitals.normalRange).toBe(false);
    expect(vitals.alerts).toContain('High temperature');
  });

  it('should update clinical status', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    await recordVitalSigns(admission.patientId, {
      temperature: 37.5,
      bloodPressure: { systolic: 120, diastolic: 80 },
      heartRate: 72,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      timestamp: new Date(),
    });

    const status = await updateClinicalStatus(admission.patientId, 'Stable', 'Patient recovering well');

    expect(status).toEqual(expect.objectContaining({
      status: 'Stable',
      lastUpdated: expect.any(Date),
    }));
  });

  it('should alert on critical vital signs', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const vitals = await recordVitalSigns(admission.patientId, {
      temperature: 40.5,
      bloodPressure: { systolic: 200, diastolic: 120 },
      heartRate: 140,
      respiratoryRate: 30,
      oxygenSaturation: 70,
      timestamp: new Date(),
    });

    expect(vitals.criticalAlert).toBe(true);
    expect(vitals.requiresImmediateAttention).toBe(true);
  });
});

describe('Ward Management - Acuity & Clinical Care', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track patient acuity level', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const acuity = await trackAcuityLevel(admission.patientId);

    expect(['Low', 'Medium', 'High', 'Critical']).toContain(acuity.level);
  });

  it('should adjust acuity based on vital signs', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    // Record normal vitals
    await recordVitalSigns(admission.patientId, {
      temperature: 37.2,
      heartRate: 72,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      bloodPressure: { systolic: 120, diastolic: 80 },
      timestamp: new Date(),
    });

    const acuity1 = await trackAcuityLevel(admission.patientId);

    // Record abnormal vitals
    await recordVitalSigns(admission.patientId, {
      temperature: 39.5,
      heartRate: 120,
      respiratoryRate: 28,
      oxygenSaturation: 88,
      bloodPressure: { systolic: 160, diastolic: 100 },
      timestamp: new Date(),
    });

    const acuity2 = await trackAcuityLevel(admission.patientId);

    expect(acuity2.level).not.toBe(acuity1.level);
  });

  it('should handle emergency transfer for critical patients', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const transfer = await handleEmergencyTransfer(admission.patientId, 'ICU', 'Critical deterioration');

    expect(transfer).toEqual(expect.objectContaining({
      patientId: mockPatient.id,
      fromWard: mockWard.id,
      toWard: 'ICU',
      reason: 'Critical deterioration',
      priority: 'Emergency',
    }));
  });

  it('should log emergency transfer', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    await handleEmergencyTransfer(admission.patientId, 'ICU', 'Deterioration');

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EMERGENCY_TRANSFER',
      })
    );
  });
});

describe('Ward Management - Follow-up & Consultations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should schedule follow-up appointment', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const followUp = await scheduleFollowUp(admission.patientId, {
      appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      department: 'Surgery',
      reason: 'Post-op review',
      priority: 'urgent',
    });

    expect(followUp).toEqual(expect.objectContaining({
      patientId: mockPatient.id,
      appointmentDate: expect.any(Date),
      department: 'Surgery',
    }));
  });

  it('should request specialist consultation', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const consult = await requestConsultation(admission.patientId, {
      speciality: 'Cardiology',
      reason: 'Pre-op cardiac clearance',
      urgency: 'high',
    });

    expect(consult).toEqual(expect.objectContaining({
      patientId: mockPatient.id,
      speciality: 'Cardiology',
      status: 'requested',
    }));
  });

  it('should track consultation status', async () => {
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const consult = await requestConsultation(admission.patientId, {
      speciality: 'Cardiology',
      reason: 'Clearance',
      urgency: 'high',
    });

    expect(['requested', 'accepted', 'completed', 'cancelled']).toContain(consult.status);
  });
});

describe('Ward Management - Bed Occupancy & Complete Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track bed occupancy in real-time', async () => {
    const occupancy1 = await manageBedOccupancy(mockWard.id);

    await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');

    const occupancy2 = await manageBedOccupancy(mockWard.id);

    expect(occupancy2.occupied).toBeGreaterThan(occupancy1.occupied);
  });

  it('should complete full admission to discharge workflow', async () => {
    // 1. Admit patient
    const admission = await admitPatient(mockPatient, mockWard.id, 'Planned', 'Surgery');
    expect(admission.status).toBe('admitted');

    // 2. Assign nurse
    await assignNurse(admission.patientId, mockNurse.id, 'primary');

    // 3. Record vitals
    await recordVitalSigns(admission.patientId, {
      temperature: 37.2,
      heartRate: 72,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      bloodPressure: { systolic: 120, dystolic: 80 },
      timestamp: new Date(),
    });

    // 4. Update clinical status
    await updateClinicalStatus(admission.patientId, 'Stable', 'Recovery on track');

    // 5. Schedule follow-up
    await scheduleFollowUp(admission.patientId, {
      appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      department: 'Surgery',
      reason: 'Post-op review',
      priority: 'routine',
    });

    // 6. Discharge patient
    const discharge = await dischargePatient(admission.patientId, 'Discharged', 'Full recovery');
    expect(discharge.status).toBe('discharged');
  });
});
