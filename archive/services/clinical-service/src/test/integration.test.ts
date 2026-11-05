import { describe, it, expect } from 'vitest';
import { ClinicalService } from '../services/clinical';
import { config } from '../config/environment';

describe('Clinical Service Integration', () => {
  it('should instantiate ClinicalService', () => {
    expect(() => {
      const service = new ClinicalService();
      expect(service).toBeDefined();
      expect(typeof service).toBe('object');
    }).not.toThrow();
  });

  it('should have all required methods', () => {
    const service = new ClinicalService() as any;

    // Check that key methods exist (even if mocked)
    expect(typeof service.createConsultation).toBe('function');
    expect(typeof service.getConsultation).toBe('function');
    expect(typeof service.updateConsultation).toBe('function');
    expect(typeof service.createMedicalRecord).toBe('function');
    expect(typeof service.getMedicalRecord).toBe('function');
    expect(typeof service.createWorkflow).toBe('function');
    expect(typeof service.updateWorkflowStep).toBe('function');
    expect(typeof service.getWorkflowByConsultation).toBe('function');
    expect(typeof service.getClinicalGuidelines).toBe('function');
    expect(typeof service.getMedicationRecommendations).toBe('function');
    expect(typeof service.validateClinicalData).toBe('function');
    expect(typeof service.encryptData).toBe('function');
    expect(typeof service.decryptData).toBe('function');
    expect(typeof service.setCache).toBe('function');
    expect(typeof service.getCache).toBe('function');
    expect(typeof service.deleteCache).toBe('function');
    expect(typeof service.publishEvent).toBe('function');
  });

  it('should have proper config structure', () => {
    expect(config).toBeDefined();
    expect(config.DATABASE_URL).toBeDefined();
    expect(config.REDIS_URL).toBeDefined();
    expect(config.KAFKA_BROKERS).toBeDefined();
    expect(config.ENCRYPTION_KEY).toBeDefined();
  });
});