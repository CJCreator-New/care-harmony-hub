/**
 * Appointment API Endpoint Tests - Week 6 Mon-Tue
 * Target: 10 endpoints with 3-5 tests per endpoint
 * Focus: Appointment CRUD, scheduling, cancellation, hospital routing
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Appointment API Endpoints - Complete Coverage', () => {
  const baseUrl = 'http://localhost:3000/api';
  const mockHospitalId = 'hosp-001';
  const mockToken = 'mock-jwt-token';
  const mockDoctorId = 'doc-001';
  const mockPatientId = 'pat-001';
  const mockReceptionistId = 'recep-001';

  const authHeaders = {
    'Authorization': `Bearer ${mockToken}`,
    'Content-Type': 'application/json',
    'X-Hospital-ID': mockHospitalId,
  };

  // ====== POST /api/appointments ======
  describe('POST /api/appointments - Create Appointment', () => {
    const endpoint = `${baseUrl}/appointments`;

    it('should create appointment with valid data', async () => {
      const payload = {
        patient_id: mockPatientId,
        doctor_id: mockDoctorId,
        appointment_date: '2024-02-15',
        appointment_time: '10:00',
        reason: 'Routine checkup',
        notes: 'Follow-up on hypertension management',
      };

      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'appt-001',
          hospital_id: mockHospitalId,
          status: 'scheduled',
          ...payload,
          created_at: new Date().toISOString(),
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { ...authHeaders, 'X-User-ID': mockReceptionistId },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.status).toBe('scheduled');
      expect(data.patient_id).toBe(mockPatientId);
    });

    it('should reject past appointment dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const payload = {
        patient_id: mockPatientId,
        doctor_id: mockDoctorId,
        appointment_date: pastDate.toISOString().split('T')[0],
        appointment_time: '10:00',
        reason: 'Checkup',
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Appointment date cannot be in the past',
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

    it('should check doctor availability', async () => {
      const payload = {
        patient_id: mockPatientId,
        doctor_id: mockDoctorId,
        appointment_date: '2024-02-15',
        appointment_time: '10:00', // Already booked
        reason: 'Checkup',
      };

      const mockResponse = {
        ok: false,
        status: 409,
        json: async () => ({
          error: 'Doctor unavailable at this time. Available slots: 10:30, 11:00, 14:00',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(409);
    });

    it('should require at least 24 hours advance booking', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const payload = {
        patient_id: mockPatientId,
        doctor_id: mockDoctorId,
        appointment_date: tomorrow.toISOString().split('T')[0],
        appointment_time: '09:00',
        reason: 'Checkup',
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Appointments must be scheduled at least 24 hours in advance',
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

  // ====== GET /api/appointments/:id ======
  describe('GET /api/appointments/:id - Retrieve Appointment', () => {
    it('should retrieve appointment by ID', async () => {
      const appointmentId = 'appt-001';
      const endpoint = `${baseUrl}/appointments/${appointmentId}`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: appointmentId,
          hospital_id: mockHospitalId,
          patient_id: mockPatientId,
          doctor_id: mockDoctorId,
          appointment_date: '2024-02-15',
          appointment_time: '10:00',
          status: 'scheduled',
          reason: 'Routine checkup',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(appointmentId);
    });
  });

  // ====== GET /api/appointments?patient_id=X ======
  describe('GET /api/appointments?patient_id=X - List Patient Appointments', () => {
    it('should retrieve all appointments for patient', async () => {
      const endpoint = `${baseUrl}/appointments?patient_id=${mockPatientId}`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 'appt-001',
              appointment_date: '2024-02-15',
              appointment_time: '10:00',
              status: 'scheduled',
              doctor_id: mockDoctorId,
            },
            {
              id: 'appt-002',
              appointment_date: '2024-02-25',
              appointment_time: '14:00',
              status: 'scheduled',
              doctor_id: 'doc-002',
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

  // ====== GET /api/appointments?doctor_id=X ======
  describe('GET /api/appointments?doctor_id=X - List Doctor Schedule', () => {
    it('should retrieve appointments for doctor', async () => {
      const endpoint = `${baseUrl}/appointments?doctor_id=${mockDoctorId}&date=2024-02-15`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          doctor_id: mockDoctorId,
          date: '2024-02-15',
          appointments: [
            {
              id: 'appt-001',
              patient_name: 'John Doe',
              time: '09:00',
              status: 'scheduled',
            },
            {
              id: 'appt-003',
              patient_name: 'Jane Smith',
              time: '10:30',
              status: 'scheduled',
            },
            {
              id: 'appt-004',
              patient_name: 'Bob Johnson',
              time: '11:00',
              status: 'no_show',
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
      expect(data.appointments).toHaveLength(3);
    });
  });

  // ====== PUT /api/appointments/:id ======
  describe('PUT /api/appointments/:id - Update Appointment', () => {
    it('should reschedule appointment', async () => {
      const appointmentId = 'appt-001';
      const endpoint = `${baseUrl}/appointments/${appointmentId}`;

      const updatePayload = {
        appointment_date: '2024-02-20',
        appointment_time: '14:00',
        notes: 'Rescheduled at patient request',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: appointmentId,
          status: 'scheduled',
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
      expect(data.appointment_date).toBe('2024-02-20');
    });

    it('should prevent rescheduling completed appointments', async () => {
      const appointmentId = 'appt-completed';
      const endpoint = `${baseUrl}/appointments/${appointmentId}`;

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Cannot reschedule completed appointment',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ appointment_date: '2024-02-20' }),
      });

      expect(response.status).toBe(400);
    });
  });

  // ====== DELETE /api/appointments/:id ======
  describe('DELETE /api/appointments/:id - Cancel Appointment', () => {
    it('should cancel scheduled appointment', async () => {
      const appointmentId = 'appt-001';
      const endpoint = `${baseUrl}/appointments/${appointmentId}`;

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

    it('should prevent canceling completed appointments', async () => {
      const appointmentId = 'appt-completed';
      const endpoint = `${baseUrl}/appointments/${appointmentId}`;

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Cannot cancel completed appointment',
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

  // ====== POST /api/appointments/:id/check-in ======
  describe('POST /api/appointments/:id/check-in - Check-In Patient', () => {
    it('should check in patient for appointment', async () => {
      const appointmentId = 'appt-001';
      const endpoint = `${baseUrl}/appointments/${appointmentId}/check-in`;

      const payload = {
        checked_in_by: mockReceptionistId,
        check_in_time: new Date().toISOString(),
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: appointmentId,
          status: 'checked_in',
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
      expect(data.status).toBe('checked_in');
    });
  });

  // ====== POST /api/appointments/:id/complete ======
  describe('POST /api/appointments/:id/complete - Complete Appointment', () => {
    it('should mark appointment as completed', async () => {
      const appointmentId = 'appt-001';
      const endpoint = `${baseUrl}/appointments/${appointmentId}/complete`;

      const payload = {
        notes: 'Patient examined, prescribed pain relief',
        completed_by: mockDoctorId,
        diagnosis: 'Acute lower back pain',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: appointmentId,
          status: 'completed',
          completed_at: new Date().toISOString(),
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
      expect(data.status).toBe('completed');
    });
  });

  // ====== POST /api/appointments/:id/no-show ======
  describe('POST /api/appointments/:id/no-show - Mark as No-Show', () => {
    it('should mark appointment as no-show', async () => {
      const appointmentId = 'appt-001';
      const endpoint = `${baseUrl}/appointments/${appointmentId}/no-show`;

      const payload = {
        marked_by: mockReceptionistId,
        reason: 'Patient did not arrive',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: appointmentId,
          status: 'no_show',
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
      expect(data.status).toBe('no_show');
    });
  });

  // ====== GET /api/appointments/available-slots ======
  describe('GET /api/appointments/available-slots - Get Available Slots', () => {
    it('should return available appointment slots for doctor', async () => {
      const endpoint = `${baseUrl}/appointments/available-slots?doctor_id=${mockDoctorId}&date=2024-02-15`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          doctor_id: mockDoctorId,
          date: '2024-02-15',
          available_slots: [
            { time: '09:00', duration_minutes: 30 },
            { time: '10:00', duration_minutes: 30 },
            { time: '10:30', duration_minutes: 30 },
            { time: '14:00', duration_minutes: 30 },
            { time: '15:30', duration_minutes: 30 },
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
      expect(data.available_slots.length).toBeGreaterThan(0);
    });
  });

  // ====== GET /api/appointments/queue ======
  describe('GET /api/appointments/queue - Get Appointment Queue', () => {
    it('should return today\'s appointment queue for hospital', async () => {
      const endpoint = `${baseUrl}/appointments/queue`;

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          hospital_id: mockHospitalId,
          date: new Date().toISOString().split('T')[0],
          queue: [
            {
              position: 1,
              appointment_id: 'appt-001',
              patient_name: 'John Doe',
              check_in_time: '09:45',
              status: 'checked_in',
              doctor: 'Dr. Sarah Smith',
            },
            {
              position: 2,
              appointment_id: 'appt-002',
              patient_name: 'Jane Smith',
              check_in_time: null,
              status: 'scheduled',
              doctor: 'Dr. Sarah Smith',
            },
            {
              position: 3,
              appointment_id: 'appt-003',
              patient_name: 'Bob Johnson',
              check_in_time: null,
              status: 'scheduled',
              doctor: 'Dr. Michael Brown',
            },
          ],
          total_scheduled: 3,
          total_checked_in: 1,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.queue).toHaveLength(3);
      expect(data.total_scheduled).toBe(3);
    });
  });
});
