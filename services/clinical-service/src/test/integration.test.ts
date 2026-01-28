import { describe, it, expect } from 'vitest';
import { ClinicalService } from '../services/clinical';
import { config } from '../config/config';

// Mock external dependencies to prevent actual connections
vi.mock('../src/config/config', () => ({
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

vi.mock('../src/config/environment', () => ({
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
    expect(config.database).toBeDefined();
    expect(config.redis).toBeDefined();
    expect(config.kafka).toBeDefined();
    expect(config.encryption).toBeDefined();
  });
});