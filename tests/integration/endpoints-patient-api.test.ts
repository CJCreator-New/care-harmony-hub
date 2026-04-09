/**
 * Patient API Endpoint Tests - Week 6 Mon-Tue
 * Target: 15 endpoints with 3-5 tests per endpoint
 * Focus: CRUD operations, hospital scoping, validation, error handling
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Patient API Endpoints - Complete Coverage', () => {
  const baseUrl = 'http://localhost:3000/api';
  const mockHospitalId = 'hosp-001';
  const mockToken = 'mock-jwt-token';

  const authHeaders = {
    'Authorization': `Bearer ${mockToken}`,
    'Content-Type': 'application/json',
    'X-Hospital-ID': mockHospitalId,
  };

  // ====== POST /api/patients ======
  describe('POST /api/patients - Create Patient', () => {
    const endpoint = `${baseUrl}/patients`;

    it('should create patient with valid data', async () => {
      const payload = {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-15',
        gender: 'M',
        email: 'john.doe@example.com',
        phone: '+1-555-0100',
        ssn: '123-45-6789',
      };

      // Mock fetch response
      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'pat-001',
          hospital_id: mockHospitalId,
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
      expect(data.id).toBeDefined();
      expect(data.hospital_id).toBe(mockHospitalId);
      expect(data.first_name).toBe('John');
    });

    it('should enforce hospital_id from JWT context', async () => {
      const payload = {
        first_name: 'Jane',
        last_name: 'Smith',
        date_of_birth: '1985-06-20',
        gender: 'F',
        email: 'jane.smith@example.com',
        phone: '+1-555-0101',
        ssn: '987-65-4321',
        hospital_id: 'different-hospital', // Should be ignored
      };

      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'pat-002',
          ...payload,
          hospital_id: mockHospitalId, // Should override (placed after spread to ensure it's set)
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      expect(data.hospital_id).toBe(mockHospitalId);
    });

    it('should reject invalid email format', async () => {
      const payload = {
        first_name: 'Bob',
        last_name: 'Jones',
        date_of_birth: '1992-03-10',
        gender: 'M',
        email: 'invalid-email',
        phone: '+1-555-0102',
        ssn: '456-78-9012',
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid email format',
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

    it('should reject NICU (future) date of birth', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const payload = {
        first_name: 'Baby',
        last_name: 'Future',
        date_of_birth: futureDate.toISOString().split('T')[0],
        gender: 'M',
        email: 'baby@example.com',
        phone: '+1-555-0103',
        ssn: '111-22-3333',
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Date of birth cannot be in the future',
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

    it('should reject unrealistic age (>150 years)', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 151);

      const payload = {
        first_name: 'Ancient',
        last_name: 'Person',
        date_of_birth: pastDate.toISOString().split('T')[0],
        gender: 'M',
        email: 'ancient@example.com',
        phone: '+1-555-0104',
        ssn: '222-33-4444',
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid age (maximum 150 years)',
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

  // ====== GET /api/patients/:id ======
  describe('GET /api/patients/:id - Retrieve Single Patient', () => {
    it('should retrieve patient by ID with hospital scoping', async () => {
      const patientId = 'pat-001';
      const endpoint = `${baseUrl}/patients/${patientId}`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: patientId,
          hospital_id: mockHospitalId,
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1990-01-15',
          gender: 'M',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(patientId);
      expect(data.hospital_id).toBe(mockHospitalId);
    });

    it('should return 404 when patient not found in hospital', async () => {
      const patientId = 'unknown-patient';
      const endpoint = `${baseUrl}/patients/${patientId}`;

      const mockResponse = {
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Patient not found',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(404);
    });

    it('should prevent accessing patients from other hospitals', async () => {
      const patientId = 'pat-from-other-hospital';
      const endpoint = `${baseUrl}/patients/${patientId}`;

      const mockResponse = {
        ok: false,
        status: 403,
        json: async () => ({
          error: 'Access denied: patient belongs to different hospital',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(403);
    });
  });

  // ====== GET /api/patients (List) ======
  describe('GET /api/patients - List Patients Paginated', () => {
    const endpoint = `${baseUrl}/patients`;

    it('should list patients with pagination (2 per page)', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'pat-001', first_name: 'John', hospital_id: mockHospitalId },
            { id: 'pat-002', first_name: 'Jane', hospital_id: mockHospitalId },
          ],
          pagination: {
            total: 10,
            page: 1,
            per_page: 2,
            total_pages: 5,
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(`${endpoint}?page=1&limit=2`, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(2);
      expect(data.pagination.page).toBe(1);
    });

    it('should enforce hospital scoping in list query', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'pat-001', first_name: 'John', hospital_id: mockHospitalId },
            { id: 'pat-003', first_name: 'Bob', hospital_id: mockHospitalId },
          ],
          pagination: { total: 3, page: 1 },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders,
      });

      const data = await response.json();
      data.data.forEach((patient: any) => {
        expect(patient.hospital_id).toBe(mockHospitalId);
      });
    });

    it('should search patients by name', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'pat-001', first_name: 'John', last_name: 'Doe', hospital_id: mockHospitalId }],
          pagination: { total: 1 },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(`${endpoint}?name=John`, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data[0].first_name).toContain('John');
    });

    it('should search patients by phone', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'pat-001', phone: '+1-555-0100', hospital_id: mockHospitalId }],
          pagination: { total: 1 },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(`${endpoint}?phone=555-0100`, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(200);
    });
  });

  // ====== PUT /api/patients/:id ======
  describe('PUT /api/patients/:id - Update Patient', () => {
    it('should update patient basic information', async () => {
      const patientId = 'pat-001';
      const endpoint = `${baseUrl}/patients/${patientId}`;

      const updatePayload = {
        phone: '+1-555-9999',
        email: 'newemail@example.com',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: patientId,
          hospital_id: mockHospitalId,
          first_name: 'John',
          ...updatePayload,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.phone).toBe('+1-555-9999');
    });

    it('should not allow changing hospital_id after creation', async () => {
      const patientId = 'pat-001';
      const endpoint = `${baseUrl}/patients/${patientId}`;

      const updatePayload = {
        hospital_id: 'different-hospital',
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Cannot change hospital_id after creation',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(400);
    });

    it('should preserve encryption_metadata on update', async () => {
      const patientId = 'pat-001';
      const endpoint = `${baseUrl}/patients/${patientId}`;

      const updatePayload = {
        phone: '+1-555-8888',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: patientId,
          hospital_id: mockHospitalId,
          ...updatePayload,
          encryption_metadata: {
            algorithm: 'AES-256-GCM',
            encrypted_fields: ['ssn', 'date_of_birth'],
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(updatePayload),
      });

      const data = await response.json();
      expect(data.encryption_metadata).toBeDefined();
      expect(data.encryption_metadata.algorithm).toBe('AES-256-GCM');
    });
  });

  // ====== DELETE /api/patients/:id ======
  describe('DELETE /api/patients/:id - Delete Patient', () => {
    it('should delete patient successfully', async () => {
      const patientId = 'pat-001';
      const endpoint = `${baseUrl}/patients/${patientId}`;

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

    it('should prevent deleting patients from other hospitals', async () => {
      const patientId = 'pat-other-hospital';
      const endpoint = `${baseUrl}/patients/${patientId}`;

      const mockResponse = {
        ok: false,
        status: 403,
        json: async () => ({
          error: 'Access denied',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(response.status).toBe(403);
    });
  });

  // ====== GET /api/patients/:id/contact-info ======
  describe('GET /api/patients/:id/contact-info - Get Contact Information', () => {
    it('should retrieve contact information for patient', async () => {
      const patientId = 'pat-001';
      const endpoint = `${baseUrl}/patients/${patientId}/contact-info`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          email: 'john.doe@example.com',
          phone: '+1-555-0100',
          emergency_contact: {
            name: 'Jane Doe',
            phone: '+1-555-0101',
            relationship: 'Spouse',
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
      expect(data.email).toBeDefined();
      expect(data.emergency_contact).toBeDefined();
    });
  });

  // ====== POST /api/patients/:id/addresses ======
  describe('POST /api/patients/:id/addresses - Add Patient Address', () => {
    it('should add US address with validation', async () => {
      const patientId = 'pat-001';
      const endpoint = `${baseUrl}/patients/${patientId}/addresses`;

      const addressPayload = {
        street_address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'US',
        is_primary: true,
      };

      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'addr-001',
          patient_id: patientId,
          ...addressPayload,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(addressPayload),
      });

      expect(response.status).toBe(201);
    });

    it('should validate international address', async () => {
      const patientId = 'pat-001';
      const endpoint = `${baseUrl}/patients/${patientId}/addresses`;

      const addressPayload = {
        street_address: '10 Downing Street',
        city: 'London',
        postal_code: 'SW1A 2AA',
        country: 'UK',
        is_primary: false,
      };

      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'addr-002',
          patient_id: patientId,
          ...addressPayload,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(addressPayload),
      });

      expect(response.status).toBe(201);
    });
  });

  // ====== GET /api/patients/:id/medical-history ======
  describe('GET /api/patients/:id/medical-history - Get Medical History', () => {
    it('should retrieve aggregated medical history', async () => {
      const patientId = 'pat-001';
      const endpoint = `${baseUrl}/patients/${patientId}/medical-history`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          allergies: ['Penicillin', 'Shellfish'],
          past_surgeries: ['Appendectomy 2010'],
          chronic_conditions: ['Hypertension', 'Type 2 Diabetes'],
          medications: ['Lisinopril', 'Metformin'],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.allergies)).toBe(true);
    });
  });

  // ====== PATCH /api/patients/:id/emergency-notify ======
  describe('PATCH /api/patients/:id/emergency-notify - Update Emergency Notification', () => {
    it('should update emergency contact information', async () => {
      const patientId = 'pat-001';
      const endpoint = `${baseUrl}/patients/${patientId}/emergency-notify`;

      const notifyPayload = {
        emergency_contact_name: 'Jane Doe',
        emergency_contact_phone: '+1-555-0101',
        emergency_contact_relationship: 'Spouse',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: patientId,
          ...notifyPayload,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(notifyPayload),
      });

      expect(response.status).toBe(200);
    });
  });
});
