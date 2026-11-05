/**
 * Tests for Hospital Scoping Utility
 * 
 * Validates that hospital_id is always included in database queries
 * HIPAA-mandated multi-tenant data isolation
 */

import { describe, it, expect } from 'vitest';
import {
  withHospitalScoping,
  withHospitalScopingParam,
  validateHospitalContext,
  validateQueryResult,
  extractHospitalContext,
} from '../src/utils/hospitalScoping';

describe('Hospital Scoping Utility', () => {
  const hospitalId = '550e8400-e29b-41d4-a716-446655440000';

  describe('withHospitalScoping', () => {
    it('should add hospital_id to SELECT query without WHERE clause', () => {
      const sql = 'SELECT * FROM patients';
      const result = withHospitalScoping(sql, hospitalId);
      expect(result).toBe(`SELECT * FROM patients WHERE hospital_id = '${hospitalId}'`);
    });

    it('should add hospital_id as AND condition to existing WHERE clause', () => {
      const sql = 'SELECT * FROM patients WHERE id = $1';
      const result = withHospitalScoping(sql, hospitalId);
      expect(result).toContain(`hospital_id = '${hospitalId}'`);
      expect(result).toContain('AND');
    });

    it('should handle UPDATE queries', () => {
      const sql = 'UPDATE patients SET name = $1 WHERE id = $2';
      const result = withHospitalScoping(sql, hospitalId);
      expect(result).toContain(`hospital_id = '${hospitalId}'`);
      expect(result).toContain('AND');
    });

    it('should handle DELETE queries', () => {
      const sql = 'DELETE FROM patients WHERE id = $1';
      const result = withHospitalScoping(sql, hospitalId);
      expect(result).toContain(`hospital_id = '${hospitalId}'`);
      expect(result).toContain('AND');
    });

    it('should throw error if hospitalId is missing', () => {
      const sql = 'SELECT * FROM patients';
      expect(() => withHospitalScoping(sql, '')).toThrow(
        'Hospital ID is required for query scoping'
      );
    });

    it('should preserve ORDER BY and LIMIT clauses', () => {
      const sql = 'SELECT * FROM patients WHERE status = $1 ORDER BY created_at DESC LIMIT 10';
      const result = withHospitalScoping(sql, hospitalId);
      expect(result).toContain('ORDER BY created_at DESC');
      expect(result).toContain('LIMIT 10');
      expect(result).toContain(`hospital_id = '${hospitalId}'`);
    });
  });

  describe('withHospitalScopingParam', () => {
    it('should add hospital_id as parameterized query ($N)', () => {
      const sql = 'SELECT * FROM patients WHERE id = $1';
      const result = withHospitalScopingParam(sql, 2);
      expect(result).toContain('$2');
      expect(result).toContain('hospital_id = $2');
    });

    it('should handle multiple existing parameters', () => {
      const sql = 'SELECT * FROM patients WHERE id = $1 AND status = $2';
      const result = withHospitalScopingParam(sql, 3);
      expect(result).toContain('hospital_id = $3');
    });

    it('should throw error if parameter index is invalid', () => {
      const sql = 'SELECT * FROM patients';
      expect(() => withHospitalScopingParam(sql, 0)).toThrow('Invalid hospital ID parameter index');
      expect(() => withHospitalScopingParam(sql, -1)).toThrow('Invalid hospital ID parameter index');
    });
  });

  describe('validateHospitalContext', () => {
    it('should accept valid hospital context', () => {
      const context = {
        hospitalId,
        userId: '123',
        role: 'doctor' as const,
      };
      expect(() => validateHospitalContext(context)).not.toThrow();
    });

    it('should throw error if context is missing', () => {
      expect(() => validateHospitalContext(null)).toThrow('Hospital context is required');
      expect(() => validateHospitalContext(undefined)).toThrow('Hospital context is required');
    });

    it('should throw error if hospitalId is missing', () => {
      const context = {
        hospitalId: '',
        userId: '123',
        role: 'doctor' as const,
      };
      expect(() => validateHospitalContext(context)).toThrow('Valid hospital ID is required');
    });

    it('should throw error if userId is missing', () => {
      const context = {
        hospitalId,
        userId: '',
        role: 'doctor' as const,
      };
      expect(() => validateHospitalContext(context)).toThrow('User ID is required');
    });
  });

  describe('validateQueryResult', () => {
    it('should accept results with matching hospital_id', () => {
      const data = { id: '123', hospital_id: hospitalId, name: 'John' };
      expect(() => validateQueryResult(data, hospitalId)).not.toThrow();
    });

    it('should accept arrays with matching hospital_id', () => {
      const data = [
        { id: '1', hospital_id: hospitalId, name: 'John' },
        { id: '2', hospital_id: hospitalId, name: 'Jane' },
      ];
      expect(() => validateQueryResult(data, hospitalId)).not.toThrow();
    });

    it('should throw error if hospital_id does not match', () => {
      const differentHospitalId = '550e8400-e29b-41d4-a716-446655440099';
      const data = { id: '123', hospital_id: differentHospitalId, name: 'John' };
      
      expect(() => validateQueryResult(data, hospitalId)).toThrow(
        'Data validation failure: Query result contains unexpected hospital data'
      );
    });

    it('should handle null data gracefully', () => {
      expect(() => validateQueryResult(null, hospitalId)).not.toThrow();
      expect(() => validateQueryResult(undefined, hospitalId)).not.toThrow();
    });

    it('should detect cross-hospital data leak attempt', () => {
      const hackedData = [
        { id: '1', hospital_id: hospitalId, name: 'John' },
        { id: '999', hospital_id: 'other-hospital', name: 'Hacker Patient' },
      ];

      expect(() => validateQueryResult(hackedData, hospitalId)).toThrow(
        'Data validation failure'
      );
    });
  });

  describe('extractHospitalContext', () => {
    it('should extract hospital context from request.user', () => {
      const req = {
        user: {
          id: 'user-123',
          hospital_id: hospitalId,
          role: 'doctor',
        },
      };

      const context = extractHospitalContext(req);
      expect(context).not.toBeNull();
      expect(context?.hospitalId).toBe(hospitalId);
      expect(context?.userId).toBe('user-123');
    });

    it('should return null if user is missing', () => {
      const req = {};
      const context = extractHospitalContext(req);
      expect(context).toBeNull();
    });

    it('should return null if hospital_id is missing', () => {
      const req = {
        user: {
          id: 'user-123',
          role: 'doctor',
        },
      };

      const context = extractHospitalContext(req);
      expect(context).toBeNull();
    });

    it('should extract from nested context', () => {
      const req = {
        context: {
          user: {
            id: 'user-123',
            hospital_id: hospitalId,
            role: 'doctor',
          },
        },
      };

      const context = extractHospitalContext(req);
      expect(context?.hospitalId).toBe(hospitalId);
    });
  });

  describe('Real-world scenario tests', () => {
    it('Scenario: Patient lookup with hospital scoping', () => {
      // Doctor A from Hospital X queries for patient
      const baseQuery = 'SELECT id, name, dob FROM patients WHERE id = $1';
      const scopedQuery = withHospitalScopingParam(baseQuery, 2);
      
      // Query should now require hospital_id parameter
      expect(scopedQuery).toContain('hospital_id = $2');
      
      // Simulated execution with correct parameters
      const params = ['patient-123', hospitalId];
      expect(params).toHaveLength(2);
      expect(params[1]).toBe(hospitalId);
    });

    it('Scenario: Prevent cross-hospital patient access (data leak attempt)', () => {
      const hackerHospitalId = 'attacker-hospital-id';
      const patientData = {
        id: 'patient-123',
        hospital_id: 'legitimate-hospital', // Different hospital
        name: 'John Doe',
      };

      // Validation catches the leak
      expect(() => {
        validateQueryResult(patientData, hackerHospitalId);
      }).toThrow();
    });

    it('Scenario: Bulk patient update with hospital isolation', () => {
      const bulkUpdateSql = `
        UPDATE patients 
        SET status = $1, updated_at = $2 
        WHERE status = $3
      `;

      const scopedSql = withHospitalScopingParam(bulkUpdateSql, 4);
      
      // Even bulk operations are now hospital-scoped
      expect(scopedSql).toContain('hospital_id = $4');
      
      // This prevents accidental updates to other hospitals' data
      const params = ['active', new Date().toISOString(), 'pending', hospitalId];
      expect(params).toHaveLength(4);
    });
  });
});
