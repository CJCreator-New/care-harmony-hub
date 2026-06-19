import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LabTechOperationsService } from '@/utils/labTechOperationsService';
import { LabTechRBACManager } from '@/utils/labTechRBACManager';
import { LabTechPermission } from '@/types/labtech';
import type { LabTechUser } from '@/types/labtech';

vi.mock('@/utils/sanitize', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
  sanitizeForLog: vi.fn((x) => x),
}));

const mockLabTechUser: LabTechUser = {
  id: 'tech-001',
  name: 'Lab Technician',
  email: 'tech@hospital.com',
  isActive: true,
  permissions: [
    LabTechPermission.SPECIMEN_RECEIVE,
    LabTechPermission.SPECIMEN_PROCESS,
    LabTechPermission.SPECIMEN_REJECT,
    LabTechPermission.TEST_PERFORM,
    LabTechPermission.TEST_VERIFY,
    LabTechPermission.RESULT_REVIEW,
    LabTechPermission.RESULT_APPROVE,
    LabTechPermission.QC_PERFORM,
    LabTechPermission.QC_REVIEW,
    LabTechPermission.ANALYZER_OPERATE,
    LabTechPermission.ANALYZER_CALIBRATE,
  ],
  hospitalId: 'hosp-001',
  department: 'laboratory',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const restrictedUser: LabTechUser = {
  ...mockLabTechUser,
  permissions: [],
};

describe('LabTechOperationsService', () => {
  let service: LabTechOperationsService;
  let rbacManager: LabTechRBACManager;

  beforeEach(() => {
    vi.clearAllMocks();
    rbacManager = new LabTechRBACManager(mockLabTechUser);
    service = new LabTechOperationsService(rbacManager, 'tech-001', 'hosp-001');
  });

  describe('Specimen Reception', () => {
    it('should receive a specimen with valid data', async () => {
      const specimenData = {
        specimenId: 'spec-001',
        specimenType: 'blood',
        volume: 5,
        unit: 'ml',
        collectionTime: new Date(),
      };

      const result = await service.receiveSpecimen(specimenData);

      expect(result).toMatchObject({
        status: 'received',
        receivedBy: 'tech-001',
        volume: 5,
      });
    });

    it('should throw error if not authorized to receive specimen', async () => {
      const restrictedRbac = new LabTechRBACManager(restrictedUser);
      const restrictedService = new LabTechOperationsService(restrictedRbac, 'tech-002', 'hosp-001');

      const specimenData = {
        specimenId: 'spec-001',
        specimenType: 'blood',
        volume: 5,
      };

      await expect(restrictedService.receiveSpecimen(specimenData)).rejects.toThrow();
    });
  });

  describe('Specimen Validation', () => {
    it('should validate specimen with correct format', async () => {
      const result = await service.validateSpecimen('spec-001');

      expect(result).toMatchObject({
        specimenId: 'spec-001',
        isValid: true,
      });
    });

    it('should throw error if not authorized for validation', async () => {
      const restrictedRbac = new LabTechRBACManager(restrictedUser);
      const restrictedService = new LabTechOperationsService(restrictedRbac, 'tech-002', 'hosp-001');

      await expect(restrictedService.validateSpecimen('spec-001')).rejects.toThrow();
    });
  });

  describe('Specimen Processing', () => {
    it('should process specimen when authorized', async () => {
      const result = await service.processSpecimen('spec-001');

      expect(result).toMatchObject({
        specimenId: 'spec-001',
        status: 'processing',
      });
    });

    it('should throw error if not authorized to process', async () => {
      const restrictedRbac = new LabTechRBACManager(restrictedUser);
      const restrictedService = new LabTechOperationsService(restrictedRbac, 'tech-002', 'hosp-001');

      await expect(restrictedService.processSpecimen('spec-001')).rejects.toThrow();
    });
  });

  describe('Test Performance', () => {
    it('should perform test on specimen', async () => {
      const testData = {
        specimenId: 'spec-001',
        testType: 'CBC',
        requestedBy: 'doc-001',
      };

      const result = await service.performTest(testData);

      expect(result).toMatchObject({
        testId: expect.any(String),
        specimenId: 'spec-001',
        testType: 'CBC',
        status: 'in_progress',
      });
    });

    it('should throw error if not authorized to perform test', async () => {
      const restrictedRbac = new LabTechRBACManager(restrictedUser);
      const restrictedService = new LabTechOperationsService(restrictedRbac, 'tech-002', 'hosp-001');

      await expect(restrictedService.performTest({
        specimenId: 'spec-001',
        testType: 'CBC',
      })).rejects.toThrow();
    });
  });

  describe('Result Recording', () => {
    it('should record test result', async () => {
      const resultData = {
        testId: 'test-001',
        specimenId: 'spec-001',
        values: { wbc: 7.5, rbc: 4.8 },
        referenceRange: { wbc: '4.5-11.0', rbc: '4.5-5.9' },
      };

      const result = await service.recordResult(resultData);

      expect(result).toMatchObject({
        testId: 'test-001',
        status: 'completed',
      });
    });
  });

  describe('Critical Value Detection', () => {
    it('should detect critical values', async () => {
      const criticalData = {
        testId: 'test-001',
        value: 2.0,
        criticalLow: 3.0,
        criticalHigh: 10.0,
        parameter: 'hemoglobin',
      };

      const result = await service.handleCriticalResult(criticalData);

      expect(result).toMatchObject({
        isCritical: true,
        alertTriggered: true,
      });
    });

    it('should not trigger alert for normal values', async () => {
      const normalData = {
        testId: 'test-002',
        value: 7.0,
        criticalLow: 3.0,
        criticalHigh: 10.0,
        parameter: 'hemoglobin',
      };

      const result = await service.handleCriticalResult(normalData);

      expect(result).toMatchObject({
        isCritical: false,
      });
    });
  });

  describe('Specimen Rejection', () => {
    it('should reject specimen with documented reason', async () => {
      const rejectionData = {
        specimenId: 'spec-001',
        reason: 'hemolysis',
        notes: 'Specimen appears hemolyzed',
      };

      const result = await service.rejectSpecimen(rejectionData);

      expect(result).toMatchObject({
        specimenId: 'spec-001',
        status: 'rejected',
        reason: 'hemolysis',
      });
    });

    it('should throw error if not authorized to reject', async () => {
      const restrictedRbac = new LabTechRBACManager(restrictedUser);
      const restrictedService = new LabTechOperationsService(restrictedRbac, 'tech-002', 'hosp-001');

      await expect(restrictedService.rejectSpecimen({
        specimenId: 'spec-001',
        reason: 'hemolysis',
      })).rejects.toThrow();
    });
  });

  describe('Quality Control', () => {
    it('should perform QC checks', async () => {
      const qcData = {
        analyzerId: 'analyzer-01',
        qcType: 'internal',
        parameters: { accuracy: 98.5, precision: 99.2 },
      };

      const result = await service.performQC(qcData);

      expect(result).toMatchObject({
        analyzerId: 'analyzer-01',
        qcStatus: expect.stringMatching(/passed|completed/),
      });
    });

    it('should throw error if not authorized for QC', async () => {
      const restrictedRbac = new LabTechRBACManager(restrictedUser);
      const restrictedService = new LabTechOperationsService(restrictedRbac, 'tech-002', 'hosp-001');

      await expect(restrictedService.performQC({
        analyzerId: 'analyzer-01',
        qcType: 'internal',
      })).rejects.toThrow();
    });
  });

  describe('RBAC Integration', () => {
    it('should verify permission enforcement across all operations', async () => {
      const restrictedRbac = new LabTechRBACManager(restrictedUser);
      const restrictedService = new LabTechOperationsService(restrictedRbac, 'tech-002', 'hosp-001');

      await expect(restrictedService.receiveSpecimen({ specimenId: 'spec-001' })).rejects.toThrow();
      await expect(restrictedService.processSpecimen('spec-001')).rejects.toThrow();
      await expect(restrictedService.performTest({ testId: 'test-001' })).rejects.toThrow();
    });
  });
});
