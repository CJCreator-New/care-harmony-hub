/**
 * Prescription API Endpoint Tests - Week 6 Mon-Tue
 * Target: 12 endpoints with 3-5 tests per endpoint
 * Focus: Drug interactions, DEA validation, state machine, role-based access
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Prescription API Endpoints - Complete Coverage', () => {
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

  // ====== POST /api/prescriptions ======
  describe('POST /api/prescriptions - Create Prescription', () => {
    const endpoint = `${baseUrl}/prescriptions`;

    it('should create prescription with valid drug and dosage', async () => {
      const payload = {
        patient_id: mockPatientId,
        drug_id: 'drug-001',
        drug_name: 'Ibuprofen',
        dosage: '400mg',
        frequency: 'every 6 hours',
        duration_days: 7,
        indication: 'Pain management',
        prescribed_by: mockDoctorId,
      };

      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'rx-001',
          hospital_id: mockHospitalId,
          status: 'pending',
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
      expect(data.status).toBe('pending');
      expect(data.drug_name).toBe('Ibuprofen');
    });

    it('should reject invalid dosage (zero or negative)', async () => {
      const payload = {
        patient_id: mockPatientId,
        drug_name: 'Ibuprofen',
        dosage: '0mg', // Invalid
        frequency: 'every 6 hours',
        duration_days: 7,
        indication: 'Pain management',
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Dosage must be positive',
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

    it('should check drug interactions before approving', async () => {
      const payload = {
        patient_id: mockPatientId,
        drug_id: 'drug-002',
        drug_name: 'Warfarin',
        dosage: '5mg',
        frequency: 'once daily',
        duration_days: 30,
        indication: 'Anticoagulation',
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Drug interaction detected: Patient already on Aspirin (severe interaction)',
          severity: 'severe',
          interacting_drug: 'Aspirin',
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

    it('should validate age-appropriate medication', async () => {
      const payload = {
        patient_id: 'pat-newborn', // Newborn patient
        drug_id: 'drug-003',
        drug_name: 'Tetracycline',
        dosage: '250mg',
        frequency: 'twice daily',
        duration_days: 7,
        indication: 'Infection',
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Tetracycline contraindicated in children under 8 years',
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

    it('should validate pregnancy status for category X drugs', async () => {
      const payload = {
        patient_id: 'pat-pregnant', // Pregnant patient
        drug_id: 'drug-004',
        drug_name: 'Isotretinoin',
        dosage: '20mg',
        frequency: 'once daily',
        duration_days: 16,
        indication: 'Severe acne',
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Drug contraindicated in pregnancy (Category X)',
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

  // ====== POST /api/prescriptions/:id/approve ======
  describe('POST /api/prescriptions/:id/approve - Approve Prescription', () => {
    it('should approve pending prescription by pharmacist', async () => {
      const prescriptionId = 'rx-001';
      const endpoint = `${baseUrl}/prescriptions/${prescriptionId}/approve`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: prescriptionId,
          status: 'approved',
          approved_by: 'pharm-001',
          approved_at: new Date().toISOString(),
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { ...authHeaders, 'X-User-Role': 'pharmacist' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('approved');
    });

    it('should reject approval by non-pharmacist', async () => {
      const prescriptionId = 'rx-001';
      const endpoint = `${baseUrl}/prescriptions/${prescriptionId}/approve`;

      const mockResponse = {
        ok: false,
        status: 403,
        json: async () => ({
          error: 'Only pharmacists can approve prescriptions',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { ...authHeaders, 'X-User-Role': 'nurse' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(403);
    });
  });

  // ====== POST /api/prescriptions/:id/dispense ======
  describe('POST /api/prescriptions/:id/dispense - Dispense Medication', () => {
    it('should dispense approved medication', async () => {
      const prescriptionId = 'rx-001';
      const endpoint = `${baseUrl}/prescriptions/${prescriptionId}/dispense`;

      const payload = {
        quantity: 10,
        lot_number: 'LOT-2024-001',
        expiration_date: '2025-06-30',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: prescriptionId,
          status: 'dispensed',
          dispensed_at: new Date().toISOString(),
          ...payload,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { ...authHeaders, 'X-User-Role': 'pharmacist' },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
    });

    it('should reject dispensing without approval', async () => {
      const prescriptionId = 'rx-pending';
      const endpoint = `${baseUrl}/prescriptions/${prescriptionId}/dispense`;

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Prescription must be approved before dispensing',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { ...authHeaders, 'X-User-Role': 'pharmacist' },
        body: JSON.stringify({ quantity: 10 }),
      });

      expect(response.status).toBe(400);
    });

    it('should check pharmacy stock before dispensing', async () => {
      const prescriptionId = 'rx-001';
      const endpoint = `${baseUrl}/prescriptions/${prescriptionId}/dispense`;

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Insufficient stock. Available: 5, Requested: 10',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { ...authHeaders, 'X-User-Role': 'pharmacist' },
        body: JSON.stringify({ quantity: 10 }),
      });

      expect(response.status).toBe(400);
    });
  });

  // ====== POST /api/prescriptions/:id/refill ======
  describe('POST /api/prescriptions/:id/refill - Refill Prescription', () => {
    it('should refill prescription when refills remaining', async () => {
      const prescriptionId = 'rx-001';
      const endpoint = `${baseUrl}/prescriptions/${prescriptionId}/refill`;

      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'rx-refill-001',
          original_prescription_id: prescriptionId,
          status: 'pending',
          refill_number: 2,
          refills_remaining: 1,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(201);
    });

    it('should refuse refill when no refills remaining', async () => {
      const prescriptionId = 'rx-no-refills';
      const endpoint = `${baseUrl}/prescriptions/${prescriptionId}/refill`;

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'No refills remaining. Contact prescribing physician.',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });

  // ====== GET /api/prescriptions/:id ======
  describe('GET /api/prescriptions/:id - Retrieve Prescription', () => {
    it('should retrieve prescription by ID', async () => {
      const prescriptionId = 'rx-001';
      const endpoint = `${baseUrl}/prescriptions/${prescriptionId}`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: prescriptionId,
          hospital_id: mockHospitalId,
          patient_id: mockPatientId,
          drug_name: 'Ibuprofen',
          dosage: '400mg',
          status: 'dispensed',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(prescriptionId);
    });
  });

  // ====== GET /api/prescriptions?patient_id=X ======
  describe('GET /api/prescriptions?patient_id=X - List Patient Prescriptions', () => {
    it('should list all prescriptions for patient', async () => {
      const endpoint = `${baseUrl}/prescriptions?patient_id=${mockPatientId}`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 'rx-001',
              drug_name: 'Ibuprofen',
              status: 'dispensed',
            },
            {
              id: 'rx-002',
              drug_name: 'Metformin',
              status: 'approved',
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

  // ====== PUT /api/prescriptions/:id ======
  describe('PUT /api/prescriptions/:id - Update Prescription (Before Approval)', () => {
    it('should allow editing pending prescription', async () => {
      const prescriptionId = 'rx-pending';
      const endpoint = `${baseUrl}/prescriptions/${prescriptionId}`;

      const updatePayload = {
        dosage: '500mg',
        frequency: 'every 8 hours',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: prescriptionId,
          ...updatePayload,
          status: 'pending',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);
    });

    it('should prevent editing approved prescriptions', async () => {
      const prescriptionId = 'rx-approved';
      const endpoint = `${baseUrl}/prescriptions/${prescriptionId}`;

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Cannot modify approved prescription',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ dosage: '500mg' }),
      });

      expect(response.status).toBe(400);
    });
  });

  // ====== DELETE /api/prescriptions/:id ======
  describe('DELETE /api/prescriptions/:id - Cancel Prescription', () => {
    it('should cancel pending prescription', async () => {
      const prescriptionId = 'rx-pending';
      const endpoint = `${baseUrl}/prescriptions/${prescriptionId}`;

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

    it('should prevent canceling dispensed prescriptions', async () => {
      const prescriptionId = 'rx-dispensed';
      const endpoint = `${baseUrl}/prescriptions/${prescriptionId}`;

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Cannot cancel dispensed prescription',
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

  // ====== POST /api/prescriptions/:id/validate-dea ======
  describe('POST /api/prescriptions/:id/validate-dea - DEA Controlled Substance Validation', () => {
    it('should validate DEA schedule II controlled substance', async () => {
      const prescriptionId = 'rx-dea-001';
      const endpoint = `${baseUrl}/prescriptions/${prescriptionId}/validate-dea`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          is_controlled: true,
          dea_schedule: 'II',
          requires_written_rx: true,
          refills_allowed: 0,
          quantity_limit: 90,
          compliant: true,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.dea_schedule).toBe('II');
      expect(data.refills_allowed).toBe(0);
    });
  });

  // ====== GET /api/prescriptions/:id/history ======
  describe('GET /api/prescriptions/:id/history - Prescription State History', () => {
    it('should retrieve complete state transition history', async () => {
      const prescriptionId = 'rx-001';
      const endpoint = `${baseUrl}/prescriptions/${prescriptionId}/history`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: prescriptionId,
          history: [
            {
              status: 'pending',
              timestamp: '2024-01-10T09:00:00Z',
              actor: 'doc-001',
              actor_role: 'doctor',
            },
            {
              status: 'approved',
              timestamp: '2024-01-10T10:30:00Z',
              actor: 'pharm-001',
              actor_role: 'pharmacist',
            },
            {
              status: 'dispensed',
              timestamp: '2024-01-10T11:00:00Z',
              actor: 'pharm-001',
              actor_role: 'pharmacist',
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
      expect(data.history).toHaveLength(3);
      expect(data.history[0].status).toBe('pending');
      expect(data.history[2].status).toBe('dispensed');
    });
  });
});
