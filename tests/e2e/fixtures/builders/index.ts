/**
 * Test Data Builders
 * Fluent API for creating test data with sensible defaults
 */

import { faker } from '@faker-js/faker';

/**
 * Patient Builder
 */
export class PatientBuilder {
  private patient: Record<string, unknown> = {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1980-01-01',
    gender: 'male',
    phone: '555-0100',
    email: 'patient@example.com',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    insuranceProvider: 'Blue Cross',
    insuranceNumber: 'BC123456789',
  };

  withFirstName(firstName: string): this {
    this.patient.firstName = firstName;
    return this;
  }

  withLastName(lastName: string): this {
    this.patient.lastName = lastName;
    return this;
  }

  withFullName(firstName: string, lastName: string): this {
    this.patient.firstName = firstName;
    this.patient.lastName = lastName;
    return this;
  }

  withAge(age: number): this {
    const today = new Date();
    const birthYear = today.getFullYear() - age;
    this.patient.dateOfBirth = `${birthYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return this;
  }

  withDateOfBirth(dob: string): this {
    this.patient.dateOfBirth = dob;
    return this;
  }

  withGender(gender: 'male' | 'female' | 'other'): this {
    this.patient.gender = gender;
    return this;
  }

  withPhone(phone: string): this {
    this.patient.phone = phone;
    return this;
  }

  withEmail(email: string): this {
    this.patient.email = email;
    return this;
  }

  withAddress(address: string, city: string, state: string, zipCode: string): this {
    this.patient.address = address;
    this.patient.city = city;
    this.patient.state = state;
    this.patient.zipCode = zipCode;
    return this;
  }

  withInsurance(provider: string, number: string): this {
    this.patient.insuranceProvider = provider;
    this.patient.insuranceNumber = number;
    return this;
  }

  withRandomData(): this {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    this.patient = {
      ...this.patient,
      firstName,
      lastName,
      email: faker.internet.email({ firstName, lastName }),
      phone: faker.phone.number('555-####'),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }).toISOString().split('T')[0],
      gender: faker.helpers.arrayElement(['male', 'female', 'other']),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode(),
      insuranceNumber: faker.string.alphanumeric(10).toUpperCase(),
    };
    return this;
  }

  build(): Record<string, unknown> {
    return { ...this.patient };
  }
}

/**
 * Appointment Builder
 */
export class AppointmentBuilder {
  private appointment: Record<string, unknown> = {
    type: 'consultation',
    duration: 30,
    status: 'scheduled',
    reason: 'General checkup',
    notes: '',
  };

  withType(type: 'consultation' | 'follow-up' | 'emergency' | 'procedure'): this {
    this.appointment.type = type;
    return this;
  }

  withDuration(duration: number): this {
    this.appointment.duration = duration;
    return this;
  }

  withStatus(status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'): this {
    this.appointment.status = status;
    return this;
  }

  withReason(reason: string): this {
    this.appointment.reason = reason;
    return this;
  }

  withNotes(notes: string): this {
    this.appointment.notes = notes;
    return this;
  }

  forDate(date: Date): this {
    this.appointment.dateTime = date.toISOString();
    return this;
  }

  forToday(hour: number = 10, minute: number = 0): this {
    const today = new Date();
    today.setHours(hour, minute, 0, 0);
    this.appointment.dateTime = today.toISOString();
    return this;
  }

  forTomorrow(hour: number = 10, minute: number = 0): this {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hour, minute, 0, 0);
    this.appointment.dateTime = tomorrow.toISOString();
    return this;
  }

  forNextWeek(hour: number = 10, minute: number = 0): this {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(hour, minute, 0, 0);
    this.appointment.dateTime = nextWeek.toISOString();
    return this;
  }

  withPatient(patientId: string): this {
    this.appointment.patientId = patientId;
    return this;
  }

  withDoctor(doctorId: string): this {
    this.appointment.doctorId = doctorId;
    return this;
  }

  asUrgent(): this {
    this.appointment.priority = 'urgent';
    return this;
  }

  withRandomData(): this {
    this.appointment = {
      ...this.appointment,
      type: faker.helpers.arrayElement(['consultation', 'follow-up', 'procedure']),
      duration: faker.helpers.arrayElement([15, 30, 45, 60]),
      reason: faker.helpers.arrayElement([
        'General checkup',
        'Follow-up visit',
        'Blood pressure check',
        'Prescription refill',
        'Lab results review',
      ]),
      notes: faker.lorem.sentence(),
    };
    return this.forTomorrow(faker.number.int({ min: 9, max: 16 }), faker.helpers.arrayElement([0, 30]));
  }

  build(): Record<string, unknown> {
    return { ...this.appointment };
  }
}

/**
 * Prescription Builder
 */
export class PrescriptionBuilder {
  private prescription: Record<string, unknown> = {
    medication: 'Amoxicillin',
    dosage: '500mg',
    frequency: 'Three times daily',
    duration: '7 days',
    quantity: 21,
    refills: 0,
    instructions: 'Take with food',
  };

  withMedication(medication: string): this {
    this.prescription.medication = medication;
    return this;
  }

  withDosage(dosage: string): this {
    this.prescription.dosage = dosage;
    return this;
  }

  withFrequency(frequency: string): this {
    this.prescription.frequency = frequency;
    return this;
  }

  withDuration(duration: string): this {
    this.prescription.duration = duration;
    return this;
  }

  withQuantity(quantity: number): this {
    this.prescription.quantity = quantity;
    return this;
  }

  withRefills(refills: number): this {
    this.prescription.refills = refills;
    return this;
  }

  withInstructions(instructions: string): this {
    this.prescription.instructions = instructions;
    return this;
  }

  forPatient(patientId: string): this {
    this.prescription.patientId = patientId;
    return this;
  }

  prescribedBy(doctorId: string): this {
    this.prescription.doctorId = doctorId;
    return this;
  }

  withRandomData(): this {
    const medications = [
      { name: 'Amoxicillin', dosage: '500mg', frequency: 'Three times daily' },
      { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily' },
      { name: 'Metformin', dosage: '850mg', frequency: 'Twice daily' },
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime' },
      { name: 'Omeprazole', dosage: '20mg', frequency: 'Once daily before breakfast' },
    ];
    
    const med = faker.helpers.arrayElement(medications);
    
    this.prescription = {
      ...this.prescription,
      medication: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: faker.helpers.arrayElement(['7 days', '14 days', '30 days', '90 days']),
      quantity: faker.number.int({ min: 7, max: 90 }),
      refills: faker.number.int({ min: 0, max: 3 }),
    };
    return this;
  }

  build(): Record<string, unknown> {
    return { ...this.prescription };
  }
}

/**
 * Vitals Builder
 */
export class VitalsBuilder {
  private vitals: Record<string, unknown> = {
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    heartRate: 72,
    temperature: 98.6,
    respiratoryRate: 16,
    oxygenSaturation: 98,
    weight: 70,
    height: 170,
  };

  withBloodPressure(systolic: number, diastolic: number): this {
    this.vitals.bloodPressureSystolic = systolic;
    this.vitals.bloodPressureDiastolic = diastolic;
    return this;
  }

  withHeartRate(heartRate: number): this {
    this.vitals.heartRate = heartRate;
    return this;
  }

  withTemperature(temperature: number): this {
    this.vitals.temperature = temperature;
    return this;
  }

  withRespiratoryRate(rate: number): this {
    this.vitals.respiratoryRate = rate;
    return this;
  }

  withOxygenSaturation(saturation: number): this {
    this.vitals.oxygenSaturation = saturation;
    return this;
  }

  withWeight(weight: number): this {
    this.vitals.weight = weight;
    return this;
  }

  withHeight(height: number): this {
    this.vitals.height = height;
    return this;
  }

  forPatient(patientId: string): this {
    this.vitals.patientId = patientId;
    return this;
  }

  recordedBy(staffId: string): this {
    this.vitals.recordedBy = staffId;
    return this;
  }

  asNormal(): this {
    this.vitals = {
      ...this.vitals,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      heartRate: 72,
      temperature: 98.6,
      respiratoryRate: 16,
      oxygenSaturation: 98,
    };
    return this;
  }

  asHypertensive(): this {
    this.vitals.bloodPressureSystolic = 150;
    this.vitals.bloodPressureDiastolic = 95;
    return this;
  }

  asFeverish(): this {
    this.vitals.temperature = 101.5;
    return this;
  }

  withRandomData(): this {
    this.vitals = {
      ...this.vitals,
      bloodPressureSystolic: faker.number.int({ min: 100, max: 140 }),
      bloodPressureDiastolic: faker.number.int({ min: 60, max: 90 }),
      heartRate: faker.number.int({ min: 60, max: 100 }),
      temperature: faker.number.float({ min: 97.0, max: 99.0, fractionDigits: 1 }),
      respiratoryRate: faker.number.int({ min: 12, max: 20 }),
      oxygenSaturation: faker.number.int({ min: 95, max: 100 }),
      weight: faker.number.float({ min: 50, max: 120, fractionDigits: 1 }),
      height: faker.number.int({ min: 150, max: 200 }),
    };
    return this;
  }

  build(): Record<string, unknown> {
    return { ...this.vitals };
  }
}

// Export factory functions for convenience
export const createPatient = () => new PatientBuilder();
export const createAppointment = () => new AppointmentBuilder();
export const createPrescription = () => new PrescriptionBuilder();
export const createVitals = () => new VitalsBuilder();
