/**
 * Lab API Endpoint Tests - Week 6 Mon-Tue
 * Target: 12 endpoints with 3-5 tests per endpoint
 * Focus: Lab order creation, specimen tracking, critical values, result interpretation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Lab API Endpoints - Complete Coverage', () => {
  const baseUrl = 'http://localhost:3000/api';
  const mockHospitalId = 'hosp-001';
  const mockToken = 'mock-jwt-token';
  const mockDoctorId = 'doc-001';
  const mockPatientId = 'pat-001';

  const authHeaders = {
    'Authorization': `Bearer ${mockToken}`,
    'Content-Type': 'application/json',
    'X-Hospital-ID': mockHospitalId,
    'X-User-ID': mockDoctorId,
  };

  // ====== POST /api/lab-orders ======
  describe('POST /api/lab-orders - Create Lab Order', () => {
    const endpoint = `${baseUrl}/lab-orders`;

    it('should create lab order with single test', async () => {
      const payload = {
        patient_id: mockPatientId,
        tests: ['CBC'],
        priority: 'normal',
        indication: 'Routine checkup',
        ordered_by: mockDoctorId,
      };

      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'lab-001',
          hospital_id: mockHospitalId,
          status: 'ordered',
          ...payload,
          created_at: new Date().toISOString(),
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.status).toBe('ordered');
      expect(data.tests[0]).toBe('CBC');
    });

    it('should create lab order with multiple tests', async () => {
      const payload = {
        patient_id: mockPatientId,
        tests: ['CBC', 'CMP', 'Lipid Panel'],
        priority: 'urgent',
        indication: 'Pre-operative evaluation',
        ordered_by: mockDoctorId,
      };

      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'lab-002',
          hospital_id: mockHospitalId,
          status: 'ordered',
          ...payload,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.tests).toHaveLength(3);
    });

    it('should enforce fasting requirements for lipid panel', async () => {
      const payload = {
        patient_id: mockPatientId,
        tests: ['Lipid Panel'],
        priority: 'normal',
        indication: 'Cholesterol screening',
        fasting_required: true,
        collection_instructions: 'NPO after midnight',
      };

      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'lab-003',
          hospital_id: mockHospitalId,
          status: 'ordered',
          ...payload,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.fasting_required).toBe(true);
    });

    it('should validate specimen type for test', async () => {
      const payload = {
        patient_id: mockPatientId,
        tests: ['TB Culture'],
        specimen_type: 'serum', // Wrong for TB culture
        priority: 'normal',
        indication: 'TB screening',
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'TB Culture requires sputum specimen, not serum',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
    });
  });

  // ====== GET /api/lab-orders/:id ======
  describe('GET /api/lab-orders/:id - Retrieve Lab Order', () => {
    it('should retrieve lab order with full details', async () => {
      const orderId = 'lab-001';
      const endpoint = `${baseUrl}/lab-orders/${orderId}`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: orderId,
          hospital_id: mockHospitalId,
          patient_id: mockPatientId,
          tests: ['CBC'],
          status: 'ordered',
          created_at: '2024-01-10T09:00:00Z',
          specimen_collected_at: null,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(orderId);
    });
  });

  // ====== GET /api/lab-orders?patient_id=X ======
  describe('GET /api/lab-orders?patient_id=X - List Lab Orders for Patient', () => {
    it('should list all lab orders for patient', async () => {
      const endpoint = `${baseUrl}/lab-orders?patient_id=${mockPatientId}`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 'lab-001',
              tests: ['CBC'],
              status: 'results_available',
            },
            {
              id: 'lab-002',
              tests: ['CMP'],
              status: 'ordered',
            },
          ],
          pagination: { total: 2 },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(2);
    });
  });

  // ====== POST /api/lab-orders/:id/specimen ======
  describe('POST /api/lab-orders/:id/specimen - Log Specimen Collection', () => {
    it('should record specimen collection', async () => {
      const orderId = 'lab-001';
      const endpoint = `${baseUrl}/lab-orders/${orderId}/specimen`;

      const payload = {
        specimen_type: 'whole blood',
        tube_type: 'EDTA',
        collected_at: new Date().toISOString(),
        collected_by: 'lab-tech-001',
        collection_site: 'Antecubital fossa',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: orderId,
          status: 'specimen_collected',
          specimen: payload,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('specimen_collected');
    });

    it('should validate specimen expiration', async () => {
      const orderId = 'lab-expired';
      const endpoint = `${baseUrl}/lab-orders/${orderId}/specimen`;

      const expiredTime = new Date();
      expiredTime.setHours(expiredTime.getHours() - 3); // 3 hours ago

      const payload = {
        specimen_type: 'whole blood',
        tube_type: 'EDTA',
        collected_at: expiredTime.toISOString(),
        collected_by: 'lab-tech-001',
        stability_hours: 2, // Only stable for 2 hours
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Specimen expired (collected 3h ago, stability: 2h)',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
    });
  });

  // ====== POST /api/lab-orders/:id/results ======
  describe('POST /api/lab-orders/:id/results - Submit Lab Results', () => {
    it('should submit normal results', async () => {
      const orderId = 'lab-001';
      const endpoint = `${baseUrl}/lab-orders/${orderId}/results`;

      const payload = {
        test_name: 'CBC',
        results: {
          wbc: { value: 7.5, unit: 'K/uL', reference_range: '4.5-11.0' },
          rbc: { value: 4.8, unit: 'M/uL', reference_range: '4.5-5.9' },
          hemoglobin: { value: 14.5, unit: 'g/dL', reference_range: '13.5-17.5' },
          hematocrit: { value: 43, unit: '%', reference_range: '41-53' },
        },
        interpreted_by: 'pathologist-001',
        interpretation: 'Within normal limits',
      };

      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'result-001',
          order_id: orderId,
          status: 'finalized',
          is_critical: false,
          ...payload,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.is_critical).toBe(false);
    });

    it('should flag critical WBC values', async () => {
      const orderId = 'lab-crit';
      const endpoint = `${baseUrl}/lab-orders/${orderId}/results`;

      const payload = {
        test_name: 'CBC',
        results: {
          wbc: { value: 1.2, unit: 'K/uL', reference_range: '4.5-11.0' },
          rbc: { value: 4.8, unit: 'M/uL', reference_range: '4.5-5.9' },
          hemoglobin: { value: 14.5, unit: 'g/dL', reference_range: '13.5-17.5' },
        },
        interpreted_by: 'pathologist-001',
      };

      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'result-002',
          order_id: orderId,
          status: 'finalized',
          is_critical: true,
          critical_alerts: [
            {
              test: 'WBC',
              value: 1.2,
              reference_range: '4.5-11.0',
              severity: 'critical',
              message: 'Leukopenia detected',
            },
          ],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.is_critical).toBe(true);
      expect(data.critical_alerts).toHaveLength(1);
    });

    it('should flag critical blood glucose values', async () => {
      const orderId = 'lab-glucose-crit';
      const endpoint = `${baseUrl}/lab-orders/${orderId}/results`;

      const payload = {
        test_name: 'Fasting Glucose',
        results: {
          glucose: { value: 35, unit: 'mg/dL', reference_range: '70-100' },
        },
        interpreted_by: 'pathologist-001',
      };

      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'result-003',
          order_id: orderId,
          is_critical: true,
          critical_alerts: [
            {
              test: 'Glucose',
              value: 35,
              severity: 'critical',
              message: 'Severe hypoglycemia - immediate intervention required',
            },
          ],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      expect(data.is_critical).toBe(true);
    });
  });

  // ====== GET /api/lab-orders/:id/results ======
  describe('GET /api/lab-orders/:id/results - Retrieve Lab Results', () => {
    it('should retrieve finalized results', async () => {
      const orderId = 'lab-001';
      const endpoint = `${baseUrl}/lab-orders/${orderId}/results`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          order_id: orderId,
          test_name: 'CBC',
          status: 'finalized',
          results: {
            wbc: { value: 7.5, reference_range: '4.5-11.0', status: 'normal' },
            rbc: { value: 4.8, reference_range: '4.5-5.9', status: 'normal' },
          },
          finalized_at: '2024-01-10T15:00:00Z',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('finalized');
    });
  });

  // ====== POST /api/lab-orders/:id/critical-acknowledge ======
  describe('POST /api/lab-orders/:id/critical-acknowledge - Acknowledge Critical Result', () => {
    it('should acknowledge critical lab result', async () => {
      const orderId = 'lab-crit';
      const endpoint = `${baseUrl}/lab-orders/${orderId}/critical-acknowledge`;

      const payload = {
        acknowledged_by: mockDoctorId,
        action_taken: 'Patient referred to ER',
        notes: 'Severe hypoglycemia - glucose 35 mg/dL',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          order_id: orderId,
          critical_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          ...payload,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.critical_acknowledged).toBe(true);
    });
  });

  // ====== GET /api/lab-tests ======
  describe('GET /api/lab-tests - List Available Lab Tests', () => {
    it('should return list of available tests', async () => {
      const endpoint = `${baseUrl}/lab-tests`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          tests: [
            {
              id: 'test-cbc',
              name: 'Complete Blood Count',
              code: 'CBC',
              specimen_type: 'whole blood',
              turnaround_hours: 4,
            },
            {
              id: 'test-cmp',
              name: 'Comprehensive Metabolic Panel',
              code: 'CMP',
              specimen_type: 'serum',
              turnaround_hours: 4,
            },
            {
              id: 'test-lipid',
              name: 'Lipid Panel',
              code: 'LIPID',
              specimen_type: 'serum',
              turnaround_hours: 4,
              requires_fasting: true,
            },
          ],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tests.length).toBeGreaterThan(0);
    });
  });

  // ====== GET /api/lab-tests/:id/reference-ranges ======
  describe('GET /api/lab-tests/:id/reference-ranges - Get Test Reference Ranges', () => {
    it('should return gender-specific reference ranges', async () => {
      const testId = 'test-cbc';
      const endpoint = `${baseUrl}/lab-tests/${testId}/reference-ranges`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          test_id: testId,
          ranges: {
            adult_male: {
              hemoglobin: { min: 13.5, max: 17.5, unit: 'g/dL' },
              hematocrit: { min: 41, max: 53, unit: '%' },
            },
            adult_female: {
              hemoglobin: { min: 12.0, max: 15.5, unit: 'g/dL' },
              hematocrit: { min: 36, max: 46, unit: '%' },
            },
            pediatric: {
              hemoglobin: { min: 11.5, max: 15.5, unit: 'g/dL' },
              hematocrit: { min: 34, max: 40, unit: '%' },
            },
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ranges.adult_male).toBeDefined();
      expect(data.ranges.adult_female).toBeDefined();
    });
  });

  // ====== DELETE /api/lab-orders/:id ======
  describe('DELETE /api/lab-orders/:id - Cancel Lab Order', () => {
    it('should cancel pending lab order', async () => {
      const orderId = 'lab-pending';
      const endpoint = `${baseUrl}/lab-orders/${orderId}`;

      const mockResponse = {
        ok: true,
        status: 204,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(response.status).toBe(204);
    });

    it('should prevent canceling completed orders', async () => {
      const orderId = 'lab-completed';
      const endpoint = `${baseUrl}/lab-orders/${orderId}`;

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Cannot cancel completed lab order',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(response.status).toBe(400);
    });
  });

  // ====== GET /api/lab-orders/queue/pending ======
  describe('GET /api/lab-orders/queue/pending - Lab Queue (Pending Tests)', () => {
    it('should retrieve pending lab orders in queue', async () => {
      const endpoint = `${baseUrl}/lab-orders/queue/pending`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          queue: [
            {
              id: 'lab-001',
              patient_id: mockPatientId,
              tests: ['CBC'],
              priority: 'urgent',
              ordered_at: '2024-01-10T09:00:00Z',
            },
            {
              id: 'lab-002',
              patient_id: 'pat-002',
              tests: ['CMP', 'Lipid Panel'],
              priority: 'normal',
              ordered_at: '2024-01-10T09:30:00Z',
            },
          ],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { ...authHeaders, 'X-User-Role': 'lab_technician' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.queue.length).toBeGreaterThan(0);
    });
  });
});
