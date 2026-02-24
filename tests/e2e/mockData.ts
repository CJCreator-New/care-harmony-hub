export type MockUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
};

export type MockPrimaryEntity = {
  id: string;
  name: string;
  description: string;
  category: string;
  startDate: string;
  active: boolean;
};

export type MockNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
};

export type MockSettings = {
  locale: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  theme: 'light' | 'dark';
};

export const mockUsers: Record<string, MockUser> = {
  admin: {
    id: 'user-admin-001',
    name: 'Avery Admin',
    email: 'admin@example.com',
    password: 'Passw0rd!23',
    role: 'admin',
  },
  doctor: {
    id: 'user-doctor-001',
    name: 'Drew Doctor',
    email: 'doctor@example.com',
    password: 'Passw0rd!23',
    role: 'doctor',
  },
  nurse: {
    id: 'user-nurse-001',
    name: 'Nora Nurse',
    email: 'nurse@example.com',
    password: 'Passw0rd!23',
    role: 'nurse',
  },
  receptionist: {
    id: 'user-reception-001',
    name: 'Riley Receptionist',
    email: 'receptionist@example.com',
    password: 'Passw0rd!23',
    role: 'receptionist',
  },
  lab: {
    id: 'user-lab-001',
    name: 'Lane LabTech',
    email: 'lab@example.com',
    password: 'Passw0rd!23',
    role: 'lab_technician',
  },
  pharmacist: {
    id: 'user-pharm-001',
    name: 'Parker Pharmacist',
    email: 'pharmacist@example.com',
    password: 'Passw0rd!23',
    role: 'pharmacist',
  },
  patient: {
    id: 'user-patient-001',
    name: 'Pat Patient',
    email: 'patient@example.com',
    password: 'Passw0rd!23',
    role: 'patient',
  },
  standard: {
    id: 'user-001',
    name: 'Alex Carter',
    email: 'alex.carter@example.com',
    password: 'Passw0rd!23',
    role: 'user',
  },
};

export const mockPrimaryEntities: MockPrimaryEntity[] = [
  {
    id: 'entity-001',
    name: 'Q1 Care Quality Initiative',
    description: 'Program for improving response times and reducing wait periods.',
    category: 'Operations',
    startDate: '2026-01-15',
    active: true,
  },
];

export const mockNotifications: MockNotification[] = [
  {
    id: 'notif-001',
    title: 'New assignment available',
    body: 'A new item was assigned to your queue.',
    read: false,
  },
  {
    id: 'notif-002',
    title: 'System update',
    body: 'Scheduled maintenance on Friday at 11:00 PM.',
    read: true,
  },
];

export const mockSettings: MockSettings = {
  locale: 'en-US',
  emailNotifications: true,
  smsNotifications: false,
  theme: 'light',
};

export const mockApiState = {
  users: { ...mockUsers },
  primaryEntities: [...mockPrimaryEntities],
  notifications: [...mockNotifications],
  settings: { ...mockSettings },
};

export function resetMockState(): void {
  mockApiState.users = { ...mockUsers };
  mockApiState.primaryEntities = [...mockPrimaryEntities];
  mockApiState.notifications = [...mockNotifications];
  mockApiState.settings = { ...mockSettings };
}
