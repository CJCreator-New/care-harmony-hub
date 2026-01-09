import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Role Switching localStorage Persistence', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  it('should persist testRole in localStorage', () => {
    const testRole = 'doctor';
    localStorage.setItem('testRole', testRole);
    
    const storedRole = localStorage.getItem('testRole');
    expect(storedRole).toBe(testRole);
  });

  it('should return null when no testRole is stored', () => {
    const storedRole = localStorage.getItem('testRole');
    expect(storedRole).toBeNull();
  });

  it('should update testRole in localStorage', () => {
    // Set initial role
    localStorage.setItem('testRole', 'admin');
    expect(localStorage.getItem('testRole')).toBe('admin');
    
    // Update role
    localStorage.setItem('testRole', 'nurse');
    expect(localStorage.getItem('testRole')).toBe('nurse');
  });

  it('should remove testRole from localStorage', () => {
    // Set role
    localStorage.setItem('testRole', 'pharmacist');
    expect(localStorage.getItem('testRole')).toBe('pharmacist');
    
    // Remove role
    localStorage.removeItem('testRole');
    expect(localStorage.getItem('testRole')).toBeNull();
  });

  it('should handle role switching simulation', () => {
    const roles = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'];
    
    roles.forEach(role => {
      localStorage.setItem('testRole', role);
      expect(localStorage.getItem('testRole')).toBe(role);
    });
  });
});