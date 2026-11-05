import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ClinicalService } from '../services/clinical';
import { config } from '../config/config';
import { z } from 'zod';

// Mock external dependencies
vi.mock('../config/config', () => ({
  config: {
    database: {
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'test_user',
      password: 'test_pass',
      ssl: false,
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: undefined,
    },
    kafka: {
      brokers: ['localhost:9092'],
      clientId: 'clinical-service-test',
      groupId: 'clinical-service-test-group',
    },
    encryption: {
      key: 'test-encryption-key-32-chars-long',
      algorithm: 'aes-256-gcm',
    },
  },
}));

// Mock environment to prevent validation errors
vi.mock('../config/environment', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    REDIS_URL: 'redis://localhost:6379',
    KAFKA_BROKERS: 'localhost:9092',
    JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
    ENCRYPTION_KEY: 'test-encryption-key-32-chars-long',
    HOSPITAL_ID: 'test-hospital-123',
    NODE_ENV: 'test',
  },
  config: {
    LOG_LEVEL: 'info',
  },
}));

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(function() {
    return {
      connect: vi.fn().mockResolvedValue({
        query: vi.fn(),
        release: vi.fn(),
      }),
      query: vi.fn().mockResolvedValue({ rows: [] }),
      end: vi.fn(),
      on: vi.fn(),
    };
  }),
}));

vi.mock('redis', () => ({
  createClient: vi.fn().mockReturnValue({
    connect: vi.fn(),
    setEx: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    quit: vi.fn(),
    on: vi.fn(),
  }),
}));

vi.mock('kafkajs', () => ({
  Kafka: vi.fn().mockImplementation(function() {
    return {
      producer: vi.fn().mockReturnValue({
        connect: vi.fn(),
        send: vi.fn(),
        disconnect: vi.fn(),
      }),
      consumer: vi.fn().mockReturnValue({
        connect: vi.fn(),
        subscribe: vi.fn(),
        run: vi.fn(),
        disconnect: vi.fn(),
      }),
    };
  }),
}));

describe('ClinicalService', () => {
  let clinicalService: any;

  beforeEach(async () => {
    clinicalService = new ClinicalService();
  });

  afterEach(async () => {
    // Mock disconnect
  });

  describe('Consultation Management', () => {
    it('should create a consultation', async () => {
      const consultationData = {
        patientId: 'patient-123',
        providerId: 'provider-456',
        type: 'initial' as const,
        priority: 'normal' as const,
        chiefComplaint: 'Headache',
        notes: 'Patient reports severe headache',
        hospitalId: 'hospital-789',
      };

      const result = await clinicalService.createConsultation(consultationData);

      expect(result).toBeDefined();
      expect(clinicalService.createConsultation).toHaveBeenCalledWith(consultationData);
    });

    it('should get consultation by ID', async () => {
      const consultationId = 'consultation-123';
      const result = await clinicalService.getConsultation(consultationId);

      expect(result).toBeDefined();
      expect(clinicalService.getConsultation).toHaveBeenCalledWith(consultationId);
    });

    it('should update consultation', async () => {
      const consultationId = 'consultation-123';
      const updateData = {
        status: 'in_progress' as const,
        notes: 'Updated consultation notes',
      };

      const result = await clinicalService.updateConsultation(consultationId, updateData);

      expect(result).toBeDefined();
      expect(clinicalService.updateConsultation).toHaveBeenCalledWith(consultationId, updateData);
    });

    it('should list consultations with filters', async () => {
      const filters = {
        patientId: 'patient-123',
        status: 'scheduled' as const,
        hospitalId: 'hospital-789',
      };

      const result = await clinicalService.listConsultations(filters);

      expect(Array.isArray(result)).toBe(true);
      expect(clinicalService.listConsultations).toHaveBeenCalledWith(filters);
    });
  });

  describe('Medical Records', () => {
    it('should create a medical record', async () => {
      const recordData = {
        patientId: 'patient-123',
        type: 'progress_note' as const,
        content: 'Patient showing improvement',
        providerId: 'provider-456',
        hospitalId: 'hospital-789',
      };

      const result = await clinicalService.createMedicalRecord(recordData);

      expect(result).toBeDefined();
      expect(clinicalService.createMedicalRecord).toHaveBeenCalledWith(recordData);
    });

    it('should get medical record by ID', async () => {
      const recordId = 'record-123';
      const result = await clinicalService.getMedicalRecord(recordId);

      expect(result).toBeDefined();
      expect(clinicalService.getMedicalRecord).toHaveBeenCalledWith(recordId);
    });

    it('should list medical records for patient', async () => {
      const patientId = 'patient-123';
      const result = await clinicalService.listMedicalRecords(patientId);

      expect(Array.isArray(result)).toBe(true);
      expect(clinicalService.listMedicalRecords).toHaveBeenCalledWith(patientId);
    });
  });

  describe('Workflow Management', () => {
    it('should create a clinical workflow', async () => {
      const workflowData = {
        consultationId: 'consultation-123',
        type: 'standard_consultation' as const,
        steps: [
          {
            id: 'assessment',
            name: 'Patient Assessment',
            order: 1,
            required: true,
            status: 'pending' as const,
          },
          {
            id: 'diagnosis',
            name: 'Diagnosis',
            order: 2,
            required: true,
            status: 'pending' as const,
          },
        ],
        hospitalId: 'hospital-789',
      };

      const result = await clinicalService.createWorkflow(workflowData);

      expect(result).toBeDefined();
      expect(clinicalService.createWorkflow).toHaveBeenCalledWith(workflowData);
    });

    it('should update workflow step', async () => {
      const workflowId = 'workflow-123';
      const stepId = 'assessment';
      const updateData = {
        status: 'completed' as const,
        completedAt: new Date(),
        notes: 'Assessment completed successfully',
      };

      const result = await clinicalService.updateWorkflowStep(workflowId, stepId, updateData);

      expect(result).toBeDefined();
      expect(clinicalService.updateWorkflowStep).toHaveBeenCalledWith(workflowId, stepId, updateData);
    });

    it('should get workflow by consultation ID', async () => {
      const consultationId = 'consultation-123';
      const result = await clinicalService.getWorkflowByConsultation(consultationId);

      expect(result).toBeDefined();
      expect(clinicalService.getWorkflowByConsultation).toHaveBeenCalledWith(consultationId);
    });
  });

  describe('Clinical Decision Support', () => {
    it('should get clinical guidelines', async () => {
      const condition = 'hypertension';
      const result = await clinicalService.getClinicalGuidelines(condition);

      expect(Array.isArray(result)).toBe(true);
      expect(clinicalService.getClinicalGuidelines).toHaveBeenCalledWith(condition);
    });

    it('should get medication recommendations', async () => {
      const condition = 'diabetes';
      const result = await clinicalService.getMedicationRecommendations(condition);

      expect(Array.isArray(result)).toBe(true);
      expect(clinicalService.getMedicationRecommendations).toHaveBeenCalledWith(condition);
    });

    it('should validate clinical data', async () => {
      const data = {
        bloodPressure: '120/80',
        heartRate: 72,
        temperature: 98.6,
      };

      const result = await clinicalService.validateClinicalData(data);

      expect(result).toBeDefined();
      expect(clinicalService.validateClinicalData).toHaveBeenCalledWith(data);
    });
  });

  describe('Encryption', () => {
    it('should encrypt and decrypt data', async () => {
      const sensitiveData = 'This is sensitive patient information';

      const encrypted = await clinicalService.encryptData(sensitiveData);
      const decrypted = await clinicalService.decryptData(encrypted);

      expect(typeof encrypted).toBe('string');
      expect(decrypted).toBe(sensitiveData);
      expect(clinicalService.encryptData).toHaveBeenCalledWith(sensitiveData);
      expect(clinicalService.decryptData).toHaveBeenCalledWith(encrypted);
    });
  });

  describe('Caching', () => {
    it('should cache and retrieve data', async () => {
      const key = 'test-cache-key';
      const data = { message: 'cached data' };

      await clinicalService.setCache(key, data, 300);
      const cached = await clinicalService.getCache(key);

      expect(clinicalService.setCache).toHaveBeenCalledWith(key, data, 300);
      expect(clinicalService.getCache).toHaveBeenCalledWith(key);
    });

    it('should delete cached data', async () => {
      const key = 'test-cache-key';
      const data = { message: 'cached data' };

      await clinicalService.setCache(key, data, 300);
      await clinicalService.deleteCache(key);
      const cached = await clinicalService.getCache(key);

      expect(clinicalService.setCache).toHaveBeenCalledWith(key, data, 300);
      expect(clinicalService.deleteCache).toHaveBeenCalledWith(key);
      expect(clinicalService.getCache).toHaveBeenCalledWith(key);
    });
  });

  describe('Event Publishing', () => {
    it('should publish consultation event', async () => {
      const event = {
        type: 'consultation_created',
        data: { consultationId: 'consultation-123' },
      };

      await clinicalService.publishEvent(event);

      expect(clinicalService.publishEvent).toHaveBeenCalledWith(event);
    });

    it('should publish workflow event', async () => {
      const event = {
        type: 'workflow_step_completed',
        data: { workflowId: 'workflow-123', stepId: 'assessment' },
      };

      await clinicalService.publishEvent(event);

      expect(clinicalService.publishEvent).toHaveBeenCalledWith(event);
    });
  });
});