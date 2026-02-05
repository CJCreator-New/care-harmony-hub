import { UserRole } from '@/types/auth';
import { isValidRole } from '@/types/rbac';

const TEST_ROLE_STORAGE_KEY = 'testRole';

export const getDevTestRole = (roles: UserRole[]): UserRole | null => {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'production') return null;

  try {
    const stored = localStorage.getItem(TEST_ROLE_STORAGE_KEY);
    if (!stored) return null;

    if (!isValidRole(stored)) {
      localStorage.removeItem(TEST_ROLE_STORAGE_KEY);
      return null;
    }

    if (roles.length === 0) {
      return null;
    }

    if (!roles.includes(stored)) {
      localStorage.removeItem(TEST_ROLE_STORAGE_KEY);
      return null;
    }

    return stored;
  } catch {
    return null;
  }
};

export const setDevTestRole = (role: UserRole | null) => {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'production') return;
  try {
    if (role) {
      localStorage.setItem(TEST_ROLE_STORAGE_KEY, role);
    } else {
      localStorage.removeItem(TEST_ROLE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
};

export const clearDevTestRole = () => setDevTestRole(null);
