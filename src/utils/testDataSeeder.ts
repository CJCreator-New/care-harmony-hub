// Test Data Seeder for KPI Validation
// Run this to populate the system with realistic test data

import { supabase } from '@/integrations/supabase/client';

interface TestDataOptions {
  patientCount?: number;
  appointmentCount?: number;
  staffCount?: number;
  includeToday?: boolean;
  includeThisMonth?: boolean;
}

export class TestDataSeeder {
  private hospitalId: string;

  constructor(hospitalId: string) {
    this.hospitalId = hospitalId;
  }

  async seedAll(options: TestDataOptions = {}) {
    const {
      patientCount = 50,
      appointmentCount = 20,
      staffCount = 10,
      includeToday = true,
      includeThisMonth = true
    } = options;

    console.log('🌱 Starting test data seeding...');

    try {
      // 1. Create patients
      console.log(`📋 Creating ${patientCount} patients...`);
      const patients = await this.createPatients(patientCount);

      // 2. Create staff members
      console.log(`👥 Creating ${staffCount} staff members...`);
      const staff = await this.createStaff(staffCount);

      // 3. Create appointments
      console.log(`📅 Creating ${appointmentCount} appointments...`);
      await this.createAppointments(appointmentCount, patients, staff, includeToday);

      // 4. Create billing records
      console.log(`💰 Creating billing records...`);
      await this.createBillingRecords(patients, includeThisMonth);

      // 5. Create queue entries
      console.log(`⏳ Creating queue entries...`);
      await this.createQueueEntries(patients);

      // 6. Update staff presence
      console.log(`🟢 Updating staff presence...`);
      await this.updateStaffPresence(staff);

      console.log('✅ Test data seeding completed successfully!');
      return {
        patients: patients.length,
        staff: staff.length,
        appointments: appointmentCount,
        message: 'Test data created successfully'
      };
    } catch (error) {
      console.error('❌ Error seeding test data:', error);
      throw error;
    }
  }

  private async createPatients(count: number) {
    const patients = [];
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria', 'William', 'Jennifer', 'Richard', 'Patricia', 'Charles', 'Linda', 'Joseph', 'Barbara', 'Thomas', 'Elizabeth'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
    const genders: ('male' | 'female' | 'other' | 'prefer_not_to_say')[] = ['male', 'female', 'other'];
    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    // Get current max MRN number for this hospital
    const { data: existingPatients, error: fetchError } = await supabase
      .from('patients')
      .select('mrn')
      .eq('hospital_id', this.hospitalId)
      .order('mrn', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    let nextMrnNumber = 1;
    if (existingPatients && existingPatients.length > 0) {
      const lastMrn = existingPatients[0].mrn;
      const lastNumber = parseInt(lastMrn.substring(3)); // Remove 'MRN' prefix
      nextMrnNumber = lastNumber + 1;
    }

    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const birthYear = 1950 + Math.floor(Math.random() * 50);
      const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');

      // Generate sequential MRN
      const mrn = `MRN${String(nextMrnNumber + i).padStart(8, '0')}`;

      const patient = {
        hospital_id: this.hospitalId,
        mrn: mrn,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: `${birthYear}-${birthMonth}-${birthDay}`,
        gender: genders[Math.floor(Math.random() * genders.length)],
        phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        address: `${Math.floor(Math.random() * 9999) + 1} ${['Main', 'Oak', 'Pine', 'Elm', 'Cedar'][Math.floor(Math.random() * 5)]} St`,
        city: ['Springfield', 'Franklin', 'Georgetown', 'Madison', 'Washington'][Math.floor(Math.random() * 5)],
        state: ['CA', 'NY', 'TX', 'FL', 'IL'][Math.floor(Math.random() * 5)],
        zip: String(Math.floor(Math.random() * 90000) + 10000),
        blood_type: bloodTypes[Math.floor(Math.random() * bloodTypes.length)],
        allergies: Math.random() > 0.7 ? [['Penicillin', 'Peanuts', 'Shellfish'][Math.floor(Math.random() * 3)]] : null,
        is_active: Math.random() > 0.1, // 90% active
        created_at: this.randomDateThisMonth().toISOString()
      };

      patients.push(patient);
    }

    const { data, error } = await supabase.from('patients').insert(patients).select();
    if (error) throw error;

    // Log patient registrations
    for (const patient of data) {
      await supabase.from('activity_logs').insert({
        hospital_id: this.hospitalId,
        user_id: patient.id, // Use patient id as placeholder
        action_type: 'patient_registered',
        entity_type: 'patient',
        entity_id: patient.id,
        details: {
          patient_name: `${patient.first_name} ${patient.last_name}`,
          mrn: patient.mrn,
          source: 'test_data_seeder'
        }
      });
    }

    return data;
  }

  private async createStaff(count: number) {
    const roles: ('doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab_technician')[] = ['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'];
    const firstNames = ['Dr. Alice', 'Dr. Bob', 'Nurse Carol', 'Nurse Dan', 'Emma', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
    const lastNames = ['Anderson', 'Brown', 'Clark', 'Davis', 'Evans', 'Foster', 'Green', 'Harris', 'Irwin', 'Jackson'];

    const staff = [];
    for (let i = 0; i < count; i++) {
      const role = roles[i % roles.length];
      const userId = `test-user-${Date.now()}-${i}`;
      
      const profile = {
        user_id: userId,
        hospital_id: this.hospitalId,
        first_name: firstNames[i % firstNames.length],
        last_name: lastNames[i % lastNames.length],
        email: `staff${i}@hospital.com`
      };

      staff.push(profile);
    }

    const { data: profileData, error: profileError } = await supabase.from('profiles').insert(staff).select();
    if (profileError) throw profileError;

    // Create user roles
    const userRoles = profileData.map((profile, idx) => ({
      user_id: profile.user_id,
      hospital_id: this.hospitalId,
      role: roles[idx % roles.length]
    }));

    const { error: roleError } = await supabase.from('user_roles').insert(userRoles);
    if (roleError) throw roleError;

    return profileData;
  }

  private async createAppointments(count: number, patients: any[], staff: any[], includeToday: boolean) {
    const appointmentTypes = ['check-up', 'follow-up', 'consultation', 'emergency', 'vaccination'];
    const statuses: ('scheduled' | 'completed' | 'cancelled')[] = ['scheduled', 'completed', 'cancelled'];
    const priorities: ('low' | 'normal' | 'high' | 'urgent' | 'emergency')[] = ['low', 'normal', 'high', 'urgent'];
    const doctors = staff;

    const appointments = [];
    const today = new Date();
    
    for (let i = 0; i < count; i++) {
      const patient = patients[Math.floor(Math.random() * patients.length)];
      const doctor = doctors[Math.floor(Math.random() * doctors.length)];
      
      let appointmentDate;
      if (includeToday && i < 5) {
        // Create some appointments for today
        appointmentDate = today;
      } else {
        // Random date within last 30 days or next 30 days
        const daysOffset = Math.floor(Math.random() * 60) - 30;
        appointmentDate = new Date(today.getTime() + daysOffset * 24 * 60 * 60 * 1000);
      }

      const hour = Math.floor(Math.random() * 10) + 8; // 8 AM to 6 PM
      const minute = Math.random() > 0.5 ? '00' : '30';

      const appointment = {
        hospital_id: this.hospitalId,
        patient_id: patient.id,
        doctor_id: doctor?.user_id || null,
        scheduled_date: appointmentDate.toISOString().split('T')[0],
        scheduled_time: `${String(hour).padStart(2, '0')}:${minute}`,
        duration_minutes: [15, 30, 45, 60][Math.floor(Math.random() * 4)],
        appointment_type: appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        reason_for_visit: 'Test appointment for system validation',
        created_at: this.randomDateThisMonth().toISOString()
      };

      appointments.push(appointment);
    }

    const { data, error } = await supabase.from('appointments').insert(appointments).select();
    if (error) throw error;

    // Log appointment activities
    for (const appointment of data) {
      const patient = patients.find(p => p.id === appointment.patient_id);
      if (appointment.doctor_id) {
        await supabase.from('activity_logs').insert({
          hospital_id: this.hospitalId,
          user_id: appointment.doctor_id,
          action_type: 'appointment_created',
          entity_type: 'appointment',
          entity_id: appointment.id,
          details: {
            patient_name: `${patient?.first_name} ${patient?.last_name}`,
            scheduled_date: appointment.scheduled_date,
            scheduled_time: appointment.scheduled_time,
            source: 'test_data_seeder'
          }
        });
      }
    }

    return data;
  }

  private async createBillingRecords(patients: any[], includeThisMonth: boolean) {
    const invoices = [];
    const payments = [];
    
    // Create invoices for random patients
    const invoiceCount = Math.floor(patients.length * 0.3); // 30% of patients have invoices
    
    for (let i = 0; i < invoiceCount; i++) {
      const patient = patients[Math.floor(Math.random() * patients.length)];
      const amount = Math.floor(Math.random() * 500) + 100; // $100-$600
      const isPaid = Math.random() > 0.3; // 70% paid
      
      let invoiceDate;
      if (includeThisMonth) {
        invoiceDate = this.randomDateThisMonth();
      } else {
        invoiceDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Last 90 days
      }

      const invoice = {
        hospital_id: this.hospitalId,
        patient_id: patient.id,
        invoice_number: `INV-${Date.now()}-${i}`,
        total: amount,
        status: isPaid ? 'paid' : 'pending',
        paid_amount: isPaid ? amount : 0,
        created_at: invoiceDate.toISOString()
      };

      invoices.push(invoice);

      if (isPaid) {
        payments.push({
          hospital_id: this.hospitalId,
          invoice_id: null, // Will be set after invoice creation
          amount: amount,
          payment_method: ['cash', 'card', 'insurance'][Math.floor(Math.random() * 3)],
          payment_date: invoiceDate.toISOString(),
          created_at: invoiceDate.toISOString()
        });
      }
    }

    const { data: invoiceData, error: invoiceError } = await supabase.from('invoices').insert(invoices).select();
    if (invoiceError) throw invoiceError;

    // Update payment invoice_ids and insert
    if (payments.length > 0) {
      const updatedPayments = payments.map((payment, index) => ({
        ...payment,
        invoice_id: invoiceData[index]?.id
      })).filter(p => p.invoice_id);

      const { error: paymentError } = await supabase.from('payments').insert(updatedPayments);
      if (paymentError) throw paymentError;
    }

    return { invoices: invoiceData, payments: payments.length };
  }

  private async createQueueEntries(patients: any[]) {
    const queueCount = Math.min(5, patients.length); // Max 5 queue entries
    const departments = ['General', 'Cardiology', 'Pediatrics', 'Emergency'];
    const statuses = ['waiting', 'in_service', 'completed'];

    const queueEntries = [];
    
    for (let i = 0; i < queueCount; i++) {
      const patient = patients[Math.floor(Math.random() * patients.length)];
      const checkInTime = new Date(Date.now() - Math.random() * 60 * 60 * 1000); // Within last hour
      
      const entry = {
        hospital_id: this.hospitalId,
        patient_id: patient.id,
        queue_number: i + 1,
        department: departments[Math.floor(Math.random() * departments.length)],
        status: i === 0 ? 'waiting' : statuses[Math.floor(Math.random() * statuses.length)], // First one is always waiting
        priority: (['normal', 'high', 'urgent'] as const)[Math.floor(Math.random() * 3)],
        check_in_time: checkInTime.toISOString(),
        service_start_time: Math.random() > 0.5 ? new Date(checkInTime.getTime() + Math.random() * 30 * 60 * 1000).toISOString() : null,
        service_end_time: Math.random() > 0.7 ? new Date(checkInTime.getTime() + Math.random() * 60 * 60 * 1000).toISOString() : null
      };

      queueEntries.push(entry);
    }

    const { data, error } = await supabase.from('patient_queue').insert(queueEntries).select();
    if (error) throw error;

    return data;
  }

  private async updateStaffPresence(staff: any[]) {
    // Skip staff presence update - profiles table doesn't have is_active column for update
    const activeStaffCount = Math.floor(staff.length * 0.7);
    return activeStaffCount;
  }

  private randomDateThisMonth(): Date {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const randomTime = startOfMonth.getTime() + Math.random() * (now.getTime() - startOfMonth.getTime());
    return new Date(randomTime);
  }

  async cleanup() {
    console.log('🧹 Cleaning up test data...');
    
    try {
      // Delete in reverse order of dependencies
      await supabase.from('activity_logs').delete().eq('hospital_id', this.hospitalId);
      await supabase.from('payments').delete().eq('hospital_id', this.hospitalId);
      await supabase.from('invoices').delete().eq('hospital_id', this.hospitalId);
      await supabase.from('patient_queue').delete().eq('hospital_id', this.hospitalId);
      await supabase.from('appointments').delete().eq('hospital_id', this.hospitalId);
      await supabase.from('user_roles').delete().eq('hospital_id', this.hospitalId);
      await supabase.from('profiles').delete().eq('hospital_id', this.hospitalId);
      await supabase.from('patients').delete().eq('hospital_id', this.hospitalId);
      
      console.log('✅ Test data cleanup completed');
    } catch (error) {
      console.error('❌ Error cleaning up test data:', error);
      throw error;
    }
  }
}

// Usage function for easy import
export async function seedTestData(hospitalId: string, options?: TestDataOptions) {
  const seeder = new TestDataSeeder(hospitalId);
  return await seeder.seedAll(options);
}

export async function cleanupTestData(hospitalId: string) {
  const seeder = new TestDataSeeder(hospitalId);
  return await seeder.cleanup();
}