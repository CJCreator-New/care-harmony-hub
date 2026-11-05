import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PatientService } from '../src/services/patient';
import { connectDatabase, closeDatabase } from '../src/config/database';
import { query } from '../src/config/database';

// Mock external dependencies
vi.mock('../src/config/redis', () => ({
  setCache: vi.fn(),
  getCache: vi.fn(),
  deleteCache: vi.fn(),
}));

vi.mock('../src/config/kafka', () => ({
  publishMessage: vi.fn(),
}));

vi.mock('../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logDatabaseOperation: vi.fn(),
}));

describe('PatientService', () => {
  let patientService: PatientService;
  let testHospitalId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Set up test database connection
    await connectDatabase();

    // Create test data
    testHospitalId = '550e8400-e29b-41d4-a716-446655440000';
    testUserId = '550e8400-e29b-41d4-a716-446655440001';

    patientService = new PatientService();
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await query('DELETE FROM patients WHERE hospital_id = $1', [testHospitalId]);
    } catch (error) {
      // Ignore cleanup errors
    }

    await closeDatabase();
  });

  describe('createPatient', () => {
    it('should create a new patient successfully', async () => {
      const patientData = {
        hospital_id: testHospitalId,
        medical_record_number: 'MRN001',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01T00:00:00.000Z',
        gender: 'male' as const,
        email: 'john.doe@example.com',
        phone: '+1234567890',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zip_code: '12345',
          country: 'USA',
        },
        emergency_contact: {
          name: 'Jane Doe',
          relationship: 'spouse',
          phone: '+1234567891',
        },
        insurance_info: {
          provider: 'Blue Cross',
          policy_number: 'POL001',
          group_number: 'GRP001',
        },
        medical_history: [],
        allergies: [],
        current_medications: [],
        status: 'active' as const,
      };

      const result = await patientService.createPatient({
        ...patientData,
        created_by: testUserId,
        updated_by: testUserId,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.hospital_id).toBe(testHospitalId);
      expect(result.medical_record_number).toBe('MRN001');
      expect(result.first_name).toBe('John');
      expect(result.last_name).toBe('Doe');
      expect(result.status).toBe('active');
    });

    it('should throw error for duplicate medical record number', async () => {
      const patientData = {
        hospital_id: testHospitalId,
        medical_record_number: 'MRN001', // Same as previous test
        first_name: 'Jane',
        last_name: 'Smith',
        date_of_birth: '1985-05-15T00:00:00.000Z',
        gender: 'female' as const,
        status: 'active' as const,
      };

      await expect(
        patientService.createPatient({
          ...patientData,
          created_by: testUserId,
          updated_by: testUserId,
        })
      ).rejects.toThrow();
    });
  });

  describe('getPatientById', () => {
    let patientId: string;

    beforeAll(async () => {
      // Create a test patient first
      const patientData = {
        hospital_id: testHospitalId,
        medical_record_number: 'MRN002',
        first_name: 'Alice',
        last_name: 'Johnson',
        date_of_birth: '1975-03-20T00:00:00.000Z',
        gender: 'female' as const,
        status: 'active' as const,
      };

      const result = await patientService.createPatient({
        ...patientData,
        created_by: testUserId,
        updated_by: testUserId,
      });

      patientId = result.id;
    });

    it('should retrieve patient by ID', async () => {
      const result = await patientService.getPatientById(patientId);

      expect(result).toBeDefined();
      expect(result!.id).toBe(patientId);
      expect(result!.first_name).toBe('Alice');
      expect(result!.last_name).toBe('Johnson');
    });

    it('should return null for non-existent patient', async () => {
      const result = await patientService.getPatientById('550e8400-e29b-41d4-a716-446655440999');

      expect(result).toBeNull();
    });
  });

  describe('updatePatient', () => {
    let patientId: string;

    beforeAll(async () => {
      // Create a test patient first
      const patientData = {
        hospital_id: testHospitalId,
        medical_record_number: 'MRN003',
        first_name: 'Bob',
        last_name: 'Wilson',
        date_of_birth: '1980-07-10T00:00:00.000Z',
        gender: 'male' as const,
        status: 'active' as const,
      };

      const result = await patientService.createPatient({
        ...patientData,
        created_by: testUserId,
        updated_by: testUserId,
      });

      patientId = result.id;
    });

    it('should update patient information', async () => {
      const updateData = {
        first_name: 'Robert',
        phone: '+1987654321',
        updated_by: testUserId,
      };

      const result = await patientService.updatePatient(patientId, updateData);

      expect(result).toBeDefined();
      expect(result!.id).toBe(patientId);
      expect(result!.first_name).toBe('Robert');
      expect(result!.phone).toBe('+1987654321');
    });

    it('should return null for non-existent patient', async () => {
      const updateData = {
        first_name: 'Test',
        updated_by: testUserId,
      };

      const result = await patientService.updatePatient('550e8400-e29b-41d4-a716-446655440999', updateData);

      expect(result).toBeNull();
    });
  });

  describe('deletePatient', () => {
    let patientId: string;

    beforeAll(async () => {
      // Create a test patient first
      const patientData = {
        hospital_id: testHospitalId,
        medical_record_number: 'MRN004',
        first_name: 'Carol',
        last_name: 'Brown',
        date_of_birth: '1995-12-05T00:00:00.000Z',
        gender: 'female' as const,
        status: 'active' as const,
      };

      const result = await patientService.createPatient({
        ...patientData,
        created_by: testUserId,
        updated_by: testUserId,
      });

      patientId = result.id;
    });

    it('should soft delete patient', async () => {
      const deleted = await patientService.deletePatient(patientId);

      expect(deleted).toBe(true);

      // Verify patient is marked as deleted
      const result = await patientService.getPatientById(patientId);
      expect(result).toBeNull();
    });

    it('should return false for non-existent patient', async () => {
      const result = await patientService.deletePatient('550e8400-e29b-41d4-a716-446655440999');

      expect(result).toBe(false);
    });
  });

  describe('searchPatients', () => {
    beforeAll(async () => {
      // Create test patients for search
      const patients = [
        {
          hospital_id: testHospitalId,
          medical_record_number: 'SEARCH001',
          first_name: 'David',
          last_name: 'Miller',
          date_of_birth: '1970-01-01T00:00:00.000Z',
          gender: 'male' as const,
          status: 'active' as const,
        },
        {
          hospital_id: testHospitalId,
          medical_record_number: 'SEARCH002',
          first_name: 'Emma',
          last_name: 'Davis',
          date_of_birth: '1985-06-15T00:00:00.000Z',
          gender: 'female' as const,
          status: 'active' as const,
        },
      ];

      for (const patient of patients) {
        await patientService.createPatient({
          ...patient,
          created_by: testUserId,
          updated_by: testUserId,
        });
      }
    });

    it('should search patients by hospital ID', async () => {
      const result = await patientService.searchPatients({
        hospital_id: testHospitalId,
        limit: 10,
        offset: 0,
      });

      expect(result.patients.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.patients[0].hospital_id).toBe(testHospitalId);
    });

    it('should search patients by name', async () => {
      const result = await patientService.searchPatients({
        hospital_id: testHospitalId,
        first_name: 'David',
        limit: 10,
        offset: 0,
      });

      expect(result.patients.length).toBeGreaterThan(0);
      expect(result.patients[0].first_name).toBe('David');
    });

    it('should support pagination', async () => {
      const result = await patientService.searchPatients({
        hospital_id: testHospitalId,
        limit: 2,
        offset: 0,
      });

      expect(result.patients.length).toBeLessThanOrEqual(2);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
    });
  });
});