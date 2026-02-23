export type UserRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'viewer';

export interface RoleCredentials {
  email: string;
  password: string;
}

const ROLE_ENV_MAP: Record<UserRole, { email: string; password: string }> = {
  admin: { email: 'E2E_ADMIN_EMAIL', password: 'E2E_ADMIN_PASSWORD' },
  doctor: { email: 'E2E_DOCTOR_EMAIL', password: 'E2E_DOCTOR_PASSWORD' },
  nurse: { email: 'E2E_NURSE_EMAIL', password: 'E2E_NURSE_PASSWORD' },
  receptionist: { email: 'E2E_RECEPTIONIST_EMAIL', password: 'E2E_RECEPTIONIST_PASSWORD' },
  viewer: { email: 'E2E_VIEWER_EMAIL', password: 'E2E_VIEWER_PASSWORD' },
};

export const ROLE_PROJECTS: UserRole[] = ['admin', 'doctor', 'nurse', 'receptionist', 'viewer'];

export function getRoleCredentials(role: UserRole): RoleCredentials | null {
  const keys = ROLE_ENV_MAP[role];
  const email = process.env[keys.email];
  const password = process.env[keys.password];
  if (!email || !password) return null;
  return { email, password };
}

export function storageStatePath(role: UserRole): string {
  return `tests/e2e/.auth/${role}.json`;
}
