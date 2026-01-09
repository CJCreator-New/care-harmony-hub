// KPI Validation Test Suite
// Tests for dashboard metrics consistency and data flow integrity

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { useActivityLog } from '@/hooks/useActivityLog';

describe('Dashboard KPI Validation', () => {
  let testHospitalId: string;
  let testPatientId: string;
  let testDoctorId: string;

  beforeEach(async () => {
    // Setup test hospital and users
    testHospitalId = 'test-hospital-' + Date.now();
    await setupTestEnvironment();
  });

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  describe('Patient KPIs', () => {
    it('should update Total Patients when new patient is registered', async () => {
      // Get initial count
      const { data: initialPatients } = await supabase
        .from('patients')
        .select('count')
        .eq('hospital_id', testHospitalId)
        .eq('is_active', true);

      const initialCount = initialPatients?.[0]?.count || 0;

      // Create new patient
      const newPatient = {
        first_name: 'Test',
        last_name: 'Patient',
        mrn: 'MRN' + Date.now(),
        hospital_id: testHospitalId,
        is_active: true,
        date_of_birth: '1990-01-01',
        gender: 'male'
      };

      const { data: createdPatient } = await supabase
        .from('patients')
        .insert(newPatient)
        .select()
        .single();

      // Verify activity log entry
      const { logActivity } = useActivityLog();
      await logActivity('patient_registered', {
        patient_id: createdPatient.id,
        patient_name: `${newPatient.first_name} ${newPatient.last_name}`,
        mrn: newPatient.mrn
      });

      // Check updated count
      const { data: updatedPatients } = await supabase
        .from('patients')
        .select('count')
        .eq('hospital_id', testHospitalId)
        .eq('is_active', true);

      const newCount = updatedPatients?.[0]?.count || 0;
      expect(newCount).toBe(initialCount + 1);

      // Verify dashboard reflects change
      render(<AdminDashboard />);
      await waitFor(() => {
        expect(screen.getByText(newCount.toString())).toBeInTheDocument();
      });
    });

    it('should exclude inactive patients from Total Patients count', async () => {
      // Create active patient
      const activePatient = await createTestPatient({ is_active: true });
      
      // Create inactive patient
      const inactivePatient = await createTestPatient({ is_active: false });

      // Verify only active patient is counted
      const { data: activeCount } = await supabase
        .from('patients')
        .select('count')
        .eq('hospital_id', testHospitalId)
        .eq('is_active', true);

      expect(activeCount?.[0]?.count).toBe(1);
    });
  });

  describe('Appointment KPIs', () => {
    it('should update Today\'s Appointments when appointments are created', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create appointments for today
      const appointments = [
        {
          patient_id: testPatientId,
          doctor_id: testDoctorId,
          hospital_id: testHospitalId,
          scheduled_date: today,
          scheduled_time: '09:00',
          status: 'scheduled'
        },
        {
          patient_id: testPatientId,
          doctor_id: testDoctorId,
          hospital_id: testHospitalId,
          scheduled_date: today,
          scheduled_time: '10:00',
          status: 'completed'
        },
        {
          patient_id: testPatientId,
          doctor_id: testDoctorId,
          hospital_id: testHospitalId,
          scheduled_date: today,
          scheduled_time: '11:00',
          status: 'cancelled'
        }
      ];

      await supabase.from('appointments').insert(appointments);

      // Verify counts
      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select('status')
        .eq('hospital_id', testHospitalId)
        .eq('scheduled_date', today);

      const stats = {
        total: todayAppointments?.length || 0,
        completed: todayAppointments?.filter(a => a.status === 'completed').length || 0,
        cancelled: todayAppointments?.filter(a => a.status === 'cancelled').length || 0,
        scheduled: todayAppointments?.filter(a => a.status === 'scheduled').length || 0
      };

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.cancelled).toBe(1);
      expect(stats.scheduled).toBe(1);

      // Verify dashboard shows correct counts
      render(<AdminDashboard />);
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // Total appointments
        expect(screen.getByText('1 completed')).toBeInTheDocument();
        expect(screen.getByText('1 cancelled')).toBeInTheDocument();
      });
    });

    it('should not count appointments from other dates in Today\'s Appointments', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Create appointments for yesterday and tomorrow
      await supabase.from('appointments').insert([
        {
          patient_id: testPatientId,
          doctor_id: testDoctorId,
          hospital_id: testHospitalId,
          scheduled_date: yesterday,
          scheduled_time: '09:00',
          status: 'completed'
        },
        {
          patient_id: testPatientId,
          doctor_id: testDoctorId,
          hospital_id: testHospitalId,
          scheduled_date: tomorrow,
          scheduled_time: '09:00',
          status: 'scheduled'
        }
      ]);

      // Verify today's count is still 0
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select('count')
        .eq('hospital_id', testHospitalId)
        .eq('scheduled_date', today);

      expect(todayAppointments?.[0]?.count || 0).toBe(0);
    });
  });

  describe('Staff KPIs', () => {
    it('should correctly calculate Active Staff based on presence', async () => {
      // Create staff members with different activity states
      const staffMembers = [
        {
          user_id: 'user-1',
          hospital_id: testHospitalId,
          first_name: 'Active',
          last_name: 'Doctor',
          role: 'doctor',
          is_active: true,
          last_seen: new Date().toISOString() // Recently active
        },
        {
          user_id: 'user-2',
          hospital_id: testHospitalId,
          first_name: 'Inactive',
          last_name: 'Nurse',
          role: 'nurse',
          is_active: true,
          last_seen: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
        },
        {
          user_id: 'user-3',
          hospital_id: testHospitalId,
          first_name: 'Disabled',
          last_name: 'Staff',
          role: 'receptionist',
          is_active: false,
          last_seen: new Date().toISOString()
        }
      ];

      await supabase.from('profiles').insert(staffMembers);

      // Calculate active staff (active within 24 hours)
      const { data: activeStaff } = await supabase
        .from('profiles')
        .select('count')
        .eq('hospital_id', testHospitalId)
        .eq('is_active', true)
        .gte('last_seen', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      expect(activeStaff?.[0]?.count).toBe(1); // Only the recently active doctor

      // Verify Staff by Role counts all active staff regardless of presence
      const { data: staffByRole } = await supabase
        .from('profiles')
        .select('role')
        .eq('hospital_id', testHospitalId)
        .eq('is_active', true);

      const roleCounts = staffByRole?.reduce((acc, staff) => {
        acc[staff.role] = (acc[staff.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(roleCounts?.doctor).toBe(1);
      expect(roleCounts?.nurse).toBe(1);
      expect(roleCounts?.receptionist).toBeUndefined(); // Disabled staff not counted
    });
  });

  describe('Revenue KPIs', () => {
    it('should calculate Monthly Revenue from payments', async () => {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      
      // Create invoices and payments
      const invoice1 = await createTestInvoice({ total: 500, status: 'paid' });
      const invoice2 = await createTestInvoice({ total: 300, status: 'pending' });
      
      await supabase.from('payments').insert([
        {
          invoice_id: invoice1.id,
          hospital_id: testHospitalId,
          amount: 500,
          payment_date: new Date().toISOString(),
          payment_method: 'cash'
        }
      ]);

      // Calculate revenue
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('hospital_id', testHospitalId)
        .gte('payment_date', startOfMonth.toISOString());

      const { data: pending } = await supabase
        .from('invoices')
        .select('total')
        .eq('hospital_id', testHospitalId)
        .eq('status', 'pending')
        .gte('created_at', startOfMonth.toISOString());

      const paidAmount = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const pendingAmount = pending?.reduce((sum, i) => sum + i.total, 0) || 0;

      expect(paidAmount).toBe(500);
      expect(pendingAmount).toBe(300);

      // Verify dashboard shows correct amounts
      render(<AdminDashboard />);
      await waitFor(() => {
        expect(screen.getByText('$0.5K')).toBeInTheDocument(); // Paid revenue
        expect(screen.getByText('$0.3K pending')).toBeInTheDocument(); // Pending revenue
      });
    });
  });

  describe('Queue Management KPIs', () => {
    it('should calculate wait times correctly', async () => {
      const now = new Date();
      const nineMinutesAgo = new Date(now.getTime() - 9 * 60 * 1000);

      // Create queue entry
      const queueEntry = {
        patient_id: testPatientId,
        hospital_id: testHospitalId,
        status: 'waiting',
        priority: 'normal',
        department: 'General',
        check_in_time: nineMinutesAgo.toISOString(),
        queue_number: 1
      };

      await supabase.from('patient_queue').insert(queueEntry);

      // Calculate wait time
      const { data: queueData } = await supabase
        .from('patient_queue')
        .select('check_in_time')
        .eq('hospital_id', testHospitalId)
        .eq('status', 'waiting');

      const waitTimes = queueData?.map(entry => {
        const checkInTime = new Date(entry.check_in_time);
        return Math.floor((now.getTime() - checkInTime.getTime()) / (1000 * 60));
      });

      const avgWaitTime = waitTimes?.reduce((sum, time) => sum + time, 0) / waitTimes?.length || 0;

      expect(Math.round(avgWaitTime)).toBe(9); // Should be approximately 9 minutes

      // Verify dashboard shows correct wait time
      render(<AdminDashboard />);
      await waitFor(() => {
        expect(screen.getByText('9m Waiting')).toBeInTheDocument();
        expect(screen.getByText('Avg Wait 9 min')).toBeInTheDocument();
      });
    });
  });

  describe('Activity Logging', () => {
    it('should log patient registration activity', async () => {
      const patient = await createTestPatient();
      
      // Verify activity log entry exists
      const { data: activityLogs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('hospital_id', testHospitalId)
        .eq('action_type', 'patient_registered')
        .eq('entity_id', patient.id);

      expect(activityLogs?.length).toBe(1);
      expect(activityLogs?.[0]?.details?.patient_name).toBe(`${patient.first_name} ${patient.last_name}`);
    });

    it('should log queue status changes', async () => {
      const queueEntry = await createTestQueueEntry();
      
      // Update queue status
      await supabase
        .from('patient_queue')
        .update({ status: 'in_service' })
        .eq('id', queueEntry.id);

      // Log the activity
      const { logActivity } = useActivityLog();
      await logActivity('queue_status_updated', {
        queue_id: queueEntry.id,
        old_status: 'waiting',
        new_status: 'in_service'
      });

      // Verify activity log entry
      const { data: activityLogs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('hospital_id', testHospitalId)
        .eq('action_type', 'queue_status_updated')
        .eq('entity_id', queueEntry.id);

      expect(activityLogs?.length).toBe(1);
    });

    it('should show recent activity on dashboard', async () => {
      // Perform some activities
      await createTestPatient();
      await createTestAppointment();

      // Verify Recent Activity widget shows entries
      render(<AdminDashboard />);
      await waitFor(() => {
        expect(screen.queryByText('No recent activity')).not.toBeInTheDocument();
        expect(screen.getByText('patient_registered')).toBeInTheDocument();
      });
    });
  });

  // Helper functions
  async function setupTestEnvironment() {
    // Create test hospital
    await supabase.from('hospitals').insert({
      id: testHospitalId,
      name: 'Test Hospital',
      city: 'Test City'
    });

    // Create test patient
    const patient = await createTestPatient();
    testPatientId = patient.id;

    // Create test doctor
    const doctor = await supabase.from('profiles').insert({
      user_id: 'test-doctor-' + Date.now(),
      hospital_id: testHospitalId,
      first_name: 'Test',
      last_name: 'Doctor',
      role: 'doctor',
      is_active: true
    }).select().single();
    testDoctorId = doctor.data.user_id;
  }

  async function createTestPatient(overrides = {}) {
    const patient = {
      hospital_id: testHospitalId,
      first_name: 'Test',
      last_name: 'Patient',
      mrn: 'MRN' + Date.now(),
      date_of_birth: '1990-01-01',
      gender: 'male',
      is_active: true,
      ...overrides
    };

    const { data } = await supabase.from('patients').insert(patient).select().single();
    return data;
  }

  async function createTestAppointment(overrides = {}) {
    const appointment = {
      patient_id: testPatientId,
      doctor_id: testDoctorId,
      hospital_id: testHospitalId,
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '09:00',
      status: 'scheduled',
      ...overrides
    };

    const { data } = await supabase.from('appointments').insert(appointment).select().single();
    return data;
  }

  async function createTestInvoice(overrides = {}) {
    const invoice = {
      patient_id: testPatientId,
      hospital_id: testHospitalId,
      invoice_number: 'INV' + Date.now(),
      total: 100,
      status: 'pending',
      ...overrides
    };

    const { data } = await supabase.from('invoices').insert(invoice).select().single();
    return data;
  }

  async function createTestQueueEntry(overrides = {}) {
    const queueEntry = {
      patient_id: testPatientId,
      hospital_id: testHospitalId,
      status: 'waiting',
      priority: 'normal',
      department: 'General',
      check_in_time: new Date().toISOString(),
      queue_number: 1,
      ...overrides
    };

    const { data } = await supabase.from('patient_queue').insert(queueEntry).select().single();
    return data;
  }

  async function cleanupTestData() {
    // Clean up in reverse order of dependencies
    await supabase.from('activity_logs').delete().eq('hospital_id', testHospitalId);
    await supabase.from('payments').delete().eq('hospital_id', testHospitalId);
    await supabase.from('invoices').delete().eq('hospital_id', testHospitalId);
    await supabase.from('patient_queue').delete().eq('hospital_id', testHospitalId);
    await supabase.from('appointments').delete().eq('hospital_id', testHospitalId);
    await supabase.from('patients').delete().eq('hospital_id', testHospitalId);
    await supabase.from('profiles').delete().eq('hospital_id', testHospitalId);
    await supabase.from('hospitals').delete().eq('id', testHospitalId);
  }
});