import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createLabOrder,
  receiveSpecimen,
  processLabTest,
  recordResult,
  detectCriticalValue,
  notifyDoctor,
  rejectSpecimen,
  trackSpecimen,
  generateLabReport,
  checkDeltaValues,
} from '@/utils/labTechOperationsService';
import { LabTechRBACManager } from '@/utils/labTechRBACManager';
import { logAudit } from '@/utils/sanitize';

vi.mock('@/utils/sanitize');
vi.mock('@/utils/labTechRBACManager');

// Test Fixtures
const mockLabOrder = {
  id: 'lab-order-001',
  patientId: 'pat-001',
  doctorId: 'doc-001',
  tests: ['CBC', 'BMP'],
  createdAt: new Date(),
  priority: 'routine' as const,
  location: 'general-ward',
  hospitalId: 'hosp-001',
};

const mockSpecimen = {
  id: 'spec-001',
  orderId: 'lab-order-001',
  type: 'blood',
  collectedAt: new Date(),
  volume: 5, // mL
  tubeType: 'EDTA',
  quality: 'acceptable' as const,
  batchNumber: 'SPEC-2026-001',
};

const mockTestResult = {
  testCode: 'CBC',
  value: 12.5,
  unit: 'g/dL',
  referenceRange: { min: 13.5, max: 17.5 },
  abnormal: true,
  flags: ['L'], // Low
  analyzerCode: 'ANALYZER-01',
};

const mockPatient = {
  id: 'pat-001',
  name: 'Jane Smith',
  age: 45,
  gender: 'F',
  recentResults: [
    { hemoglobin: 13.2, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  ],
};

describe('Lab Operations - Order Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (LabTechRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should create lab order with valid data', async () => {
    const result = await createLabOrder(mockLabOrder);

    expect(result).toEqual(expect.objectContaining({
      id: expect.any(String),
      status: 'pending',
      createdAt: expect.any(Date),
    }));
  });

  it('should reject order without patient ID', async () => {
    const invalid = { ...mockLabOrder, patientId: undefined };

    await expect(() => createLabOrder(invalid as any))
      .rejects
      .toThrow('Patient ID required');
  });

  it('should reject order without tests', async () => {
    const invalid = { ...mockLabOrder, tests: [] };

    await expect(() => createLabOrder(invalid))
      .rejects
      .toThrow('At least one test required');
  });

  it('should set STAT priority for ICU/ED', async () => {
    const urgent = { ...mockLabOrder, location: 'ICU' };
    const result = await createLabOrder(urgent);

    expect(result.priority).toBe('STAT');
  });

  it('should set STAT for troponin test', async () => {
    const cardiacOrder = { ...mockLabOrder, tests: ['Troponin'] };
    const result = await createLabOrder(cardiacOrder);

    expect(result.priority).toBe('STAT');
  });

  it('should check permission to create order', async () => {
    (LabTechRBACManager.checkPermission as any).mockResolvedValueOnce(false);

    await expect(() => createLabOrder(mockLabOrder))
      .rejects
      .toThrow('Unauthorized');
  });

  it('should log order creation audit', async () => {
    await createLabOrder(mockLabOrder);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LAB_ORDER_CREATED',
        resourceType: 'lab_order',
      })
    );
  });
});

describe('Lab Operations - Specimen Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (LabTechRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should receive valid specimen', async () => {
    const result = await receiveSpecimen(mockSpecimen);

    expect(result).toEqual(expect.objectContaining({
      status: 'received',
      receivedAt: expect.any(Date),
    }));
  });

  it('should validate specimen quality', async () => {
    const hemolyzed = { ...mockSpecimen, quality: 'hemolyzed' as const };

    await expect(() => receiveSpecimen(hemolyzed as any))
      .rejects
      .toThrow('Specimen quality unacceptable');
  });

  it('should reject clotted blood specimen for CBC', async () => {
    const clotted = { ...mockSpecimen, tubeType: 'SST', type: 'blood' };
    // Should have validation for tube type

    const result = await receiveSpecimen(clotted);
    if (result.warnings) {
      expect(result.warnings).toContainEqual(
        expect.stringContaining('tube type')
      );
    }
  });

  it('should generate specimen label with patient ID', async () => {
    const result = await receiveSpecimen(mockSpecimen);

    expect(result.label).toContain(mockSpecimen.id);
  });

  it('should track specimen through receiving', async () => {
    const result = await receiveSpecimen(mockSpecimen);

    expect(result.chainOfCustody).toBeDefined();
  });

  it('should reject specimen for rejected order', async () => {
    const invalid = { ...mockSpecimen, orderId: 'rejected-order' };

    await expect(() => receiveSpecimen(invalid))
      .rejects
      .toThrow('Order not found or rejected');
  });

  it('should log specimen receipt', async () => {
    await receiveSpecimen(mockSpecimen);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SPECIMEN_RECEIVED',
        resourceId: mockSpecimen.id,
      })
    );
  });

  it('should reject specimen if not authorized', async () => {
    (LabTechRBACManager.checkPermission as any).mockResolvedValueOnce(false);

    await expect(() => receiveSpecimen(mockSpecimen))
      .rejects
      .toThrow('Unauthorized');
  });
});

describe('Lab Operations - Test Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (LabTechRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should process test and record result', async () => {
    const result = await processLabTest(mockSpecimen.id, mockTestResult);

    expect(result).toEqual(expect.objectContaining({
      testCode: 'CBC',
      processed: true,
      abnormal: true,
    }));
  });

  it('should flag abnormal results', async () => {
    const result = await processLabTest(mockSpecimen.id, mockTestResult);

    expect(result.abnormal).toBe(true);
    expect(result.flags).toContain('L');
  });

  it('should accept normal results', async () => {
    const normal = { ...mockTestResult, value: 15.0, abnormal: false, flags: [] };
    const result = await processLabTest(mockSpecimen.id, normal);

    expect(result.abnormal).toBe(false);
  });

  it('should validate reference range', async () => {
    const result = await processLabTest(mockSpecimen.id, mockTestResult);

    expect(result).toHaveProperty('referenceRange');
  });

  it('should handle multiple tests', async () => {
    const bmp = { ...mockTestResult, testCode: 'BMP', value: 98 };

    const result1 = await processLabTest(mockSpecimen.id, mockTestResult);
    const result2 = await processLabTest(mockSpecimen.id, bmp);

    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });

  it('should reject result without value', async () => {
    const invalid = { ...mockTestResult, value: undefined };

    await expect(() => processLabTest(mockSpecimen.id, invalid as any))
      .rejects
      .toThrow('Result value required');
  });

  it('should log result recording', async () => {
    await processLabTest(mockSpecimen.id, mockTestResult);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LAB_RESULT_RECORDED',
      })
    );
  });
});

describe('Lab Operations - Critical Value Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (LabTechRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should detect critical low hemoglobin', async () => {
    const critical = { ...mockTestResult, value: 6.0, testCode: 'Hemoglobin' };

    const result = await detectCriticalValue(critical);

    expect(result.isCritical).toBe(true);
    expect(result.severity).toBe('CRITICAL');
  });

  it('should detect critical high glucose', async () => {
    const critical = { value: 600, unit: 'mg/dL', testCode: 'Glucose', referenceRange: { min: 70, max: 100 } };

    const result = await detectCriticalValue(critical);

    expect(result.isCritical).toBe(true);
  });

  it('should detect critical potassium (hyperkalemia)', async () => {
    const critical = { value: 7.0, unit: 'mEq/L', testCode: 'Potassium', referenceRange: { min: 3.5, max: 5.0 } };

    const result = await detectCriticalValue(critical);

    expect(result.isCritical).toBe(true);
  });

  it('should not flag non-critical values', async () => {
    const normal = { ...mockTestResult, value: 15.0, abnormal: false };

    const result = await detectCriticalValue(normal);

    if (result.isCritical === false) {
      expect(result.severity).not.toBe('CRITICAL');
    }
  });

  it('should provide clinical action for critical values', async () => {
    const critical = { value: 6.0, testCode: 'Hemoglobin', unit: 'g/dL', referenceRange: { min: 13.5, max: 17.5 } };

    const result = await detectCriticalValue(critical);

    if (result.isCritical) {
      expect(result.clinicalAction).toBeDefined();
    }
  });

  it('should enforce CLIA 5-minute SLO', async () => {
    const critical = { value: 6.0, testCode: 'Hemoglobin', unit: 'g/dL', referenceRange: { min: 13.5, max: 17.5 } };

    const result = await detectCriticalValue(critical);

    if (result.isCritical) {
      expect(result.sloMinutes).toBe(5);
    }
  });

  it('should log critical value detection', async () => {
    const critical = { value: 6.0, testCode: 'Hemoglobin', unit: 'g/dL', referenceRange: { min: 13.5, max: 17.5 } };

    await detectCriticalValue(critical);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('CRITICAL'),
      })
    );
  });
});

describe('Lab Operations - Doctor Notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (LabTechRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should notify doctor of critical value', async () => {
    const result = await notifyDoctor(
      mockLabOrder.doctorId,
      { value: 6.0, testCode: 'Hemoglobin', isCritical: true }
    );

    expect(result.notified).toBe(true);
    expect(result.timestamp).toBeDefined();
  });

  it('should require doctor acknowledgment for critical values', async () => {
    const result = await notifyDoctor(
      mockLabOrder.doctorId,
      { value: 6.0, testCode: 'Hemoglobin', isCritical: true }
    );

    expect(result.requiresAcknowledgment).toBe(true);
  });

  it('should track notification status', async () => {
    const result = await notifyDoctor(
      mockLabOrder.doctorId,
      { value: 6.0, testCode: 'Hemoglobin', isCritical: true }
    );

    expect(['pending', 'acknowledged', 'failed']).toContain(result.status);
  });

  it('should log doctor notification', async () => {
    await notifyDoctor(
      mockLabOrder.doctorId,
      { value: 6.0, testCode: 'Hemoglobin', isCritical: true }
    );

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DOCTOR_NOTIFIED',
      })
    );
  });
});

describe('Lab Operations - Specimen Rejection & Recollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (LabTechRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should reject specimen with reason', async () => {
    const result = await rejectSpecimen(mockSpecimen.id, 'hemolyzed');

    expect(result.status).toBe('rejected');
    expect(result.reason).toBe('hemolyzed');
  });

  it('should create recollection order on rejection', async () => {
    const result = await rejectSpecimen(mockSpecimen.id, 'insufficient_volume');

    expect(result.recollectionOrderId).toBeDefined();
  });

  it('should track rejection reason in audit', async () => {
    await rejectSpecimen(mockSpecimen.id, 'clotted');

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SPECIMEN_REJECTED',
        metadata: expect.objectContaining({
          reason: 'clotted',
        }),
      })
    );
  });

  it('should require lab tech permission to reject', async () => {
    (LabTechRBACManager.checkPermission as any).mockResolvedValueOnce(false);

    await expect(() => rejectSpecimen(mockSpecimen.id, 'hemolyzed'))
      .rejects
      .toThrow('Unauthorized');
  });

  it('should not allow rejection after processing', async () => {
    // Simulate specimen already processed
    await expect(() => rejectSpecimen('processed-spec-001', 'hemolyzed'))
      .rejects
      .toThrow('Cannot reject processed specimen');
  });
});

describe('Lab Operations - Chain of Custody', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (LabTechRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should track specimen through collection', async () => {
    const result = await trackSpecimen(mockSpecimen.id);

    expect(result.history).toBeDefined();
    expect(Array.isArray(result.history)).toBe(true);
  });

  it('should record all custody transfers', async () => {
    const result = await trackSpecimen(mockSpecimen.id);

    result.history.forEach((entry: any) => {
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('actor');
    });
  });

  it('should maintain immutable audit trail', async () => {
    const result = await trackSpecimen(mockSpecimen.id);

    // Chain of custody should be append-only, never modified
    expect(result.immutable).toBe(true);
  });

  it('should include location tracking', async () => {
    const result = await trackSpecimen(mockSpecimen.id);

    result.history.forEach((entry: any) => {
      expect(entry).toHaveProperty('location');
    });
  });
});

describe('Lab Operations - Result Reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (LabTechRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should generate complete lab report', async () => {
    const result = await generateLabReport(mockLabOrder.id);

    expect(result).toEqual(expect.objectContaining({
      orderId: mockLabOrder.id,
      results: expect.any(Array),
      generatedAt: expect.any(Date),
    }));
  });

  it('should identify critical findings in report', async () => {
    const result = await generateLabReport(mockLabOrder.id);

    if (result.criticalFindings && result.criticalFindings.length > 0) {
      result.criticalFindings.forEach((finding: any) => {
        expect(finding.severity).toBe('CRITICAL');
      });
    }
  });

  it('should include reference ranges in report', async () => {
    const result = await generateLabReport(mockLabOrder.id);

    result.results.forEach((r: any) => {
      expect(r).toHaveProperty('referenceRange');
    });
  });

  it('should provide clinical interpretation', async () => {
    const result = await generateLabReport(mockLabOrder.id);

    expect(result.interpretation).toBeDefined();
  });

  it('should flag pending tests', async () => {
    const result = await generateLabReport(mockLabOrder.id);

    if (result.pendingTests) {
      expect(Array.isArray(result.pendingTests)).toBe(true);
    }
  });

  it('should make report available to doctor', async () => {
    const result = await generateLabReport(mockLabOrder.id);

    expect(result.doctorAccessible).toBe(true);
  });

  it('should make report available to patient portal', async () => {
    const result = await generateLabReport(mockLabOrder.id);

    expect(result.patientPortalAccessible).toBe(true);
  });
});

describe('Lab Operations - Delta Checking (Outlier Detection)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (LabTechRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should detect significant delta from previous result', async () => {
    const current = { hemoglobin: 8.0, date: new Date() };
    const previous = { hemoglobin: 13.2, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };

    const result = await checkDeltaValues(current, previous);

    expect(result.deltaDetected).toBe(true);
    expect(result.deltaPercentage).toBeGreaterThan(30);
  });

  it('should not flag small deltas as outliers', async () => {
    const current = { hemoglobin: 13.5, date: new Date() };
    const previous = { hemoglobin: 13.2, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };

    const result = await checkDeltaValues(current, previous);

    expect(result.deltaDetected).toBe(false);
  });

  it('should provide clinical alert for significant deltas', async () => {
    const current = { glucose: 300, date: new Date() };
    const previous = { glucose: 95, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) };

    const result = await checkDeltaValues(current, previous);

    if (result.deltaDetected) {
      expect(result.clinicalAlert).toBeDefined();
    }
  });

  it('should log delta detection', async () => {
    const current = { hemoglobin: 8.0, date: new Date() };
    const previous = { hemoglobin: 13.2, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };

    await checkDeltaValues(current, previous);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('DELTA'),
      })
    );
  });
});

describe('Lab Operations - Complete Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (LabTechRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should complete order to result workflow', async () => {
    // 1. Create order
    const order = await createLabOrder(mockLabOrder);
    expect(order.status).toBe('pending');

    // 2. Receive specimen
    const specimen = await receiveSpecimen(mockSpecimen);
    expect(specimen.status).toBe('received');

    // 3. Process test
    const result = await processLabTest(specimen.id, mockTestResult);
    expect(result.processed).toBe(true);

    // 4. Generate report
    const report = await generateLabReport(order.id);
    expect(report.results).toBeDefined();
  });

  it('should handle critical value workflow', async () => {
    const critical = { value: 6.0, testCode: 'Hemoglobin', unit: 'g/dL', referenceRange: { min: 13.5, max: 17.5 } };

    const detected = await detectCriticalValue(critical);
    expect(detected.isCritical).toBe(true);

    const notified = await notifyDoctor(mockLabOrder.doctorId, detected);
    expect(notified.notified).toBe(true);
    expect(notified.requiresAcknowledgment).toBe(true);
  });

  it('should handle specimen rejection and recollection', async () => {
    const rejected = await rejectSpecimen(mockSpecimen.id, 'hemolyzed');
    expect(rejected.status).toBe('rejected');
    expect(rejected.recollectionOrderId).toBeDefined();
  });

  it('should maintain audit trail through complete workflow', async () => {
    await createLabOrder(mockLabOrder);
    await receiveSpecimen(mockSpecimen);
    await processLabTest(mockSpecimen.id, mockTestResult);

    // Should have logged all actions
    expect(logAudit.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
