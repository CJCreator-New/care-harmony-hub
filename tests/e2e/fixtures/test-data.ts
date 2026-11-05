import { E2E_TEST_PASSWORD } from '../support/test-credentials';
import { faker } from '@faker-js/faker';

export const testUsers = {
  patient: {
    email: 'patient.test@caresync.com',
    password: E2E_TEST_PASSWORD,
    name: 'John Doe',
    phone: '555-0100',
  },
  doctor: {
    email: 'doctor.test@caresync.com',
    password: E2E_TEST_PASSWORD,
    name: 'Dr. Jane Smith',
  },
  admin: {
    email: 'admin.test@caresync.com',
    password: E2E_TEST_PASSWORD,
    name: 'Admin User',
  },
};

export const generatePatient = () => ({
  email: faker.internet.email(),
  password: E2E_TEST_PASSWORD,
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  phone: faker.phone.number(),
  dateOfBirth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
  gender: faker.helpers.arrayElement(['male', 'female', 'other']),
});

export const generateAppointment = () => ({
  date: faker.date.future(),
  reason: faker.helpers.arrayElement(['Checkup', 'Follow-up', 'Consultation']),
  notes: faker.lorem.sentence(),
});
