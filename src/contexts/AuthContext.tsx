import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User, Hospital, AuthState, LoginCredentials, SignupData, UserRole } from '@/types/auth';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  setHospitalRoles: (roles: UserRole[]) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data for demo
const mockUsers: Record<string, { user: User; password: string }> = {
  'admin@hospital.com': {
    user: {
      id: '1',
      email: 'admin@hospital.com',
      username: 'admin',
      firstName: 'John',
      lastName: 'Admin',
      role: 'admin',
      hospitalId: 'h1',
      hospitalName: 'City General Hospital',
      createdAt: new Date().toISOString(),
    },
    password: 'Admin@123',
  },
  'doctor@hospital.com': {
    user: {
      id: '2',
      email: 'doctor@hospital.com',
      username: 'dr.smith',
      firstName: 'Sarah',
      lastName: 'Smith',
      role: 'doctor',
      hospitalId: 'h1',
      hospitalName: 'City General Hospital',
      createdAt: new Date().toISOString(),
    },
    password: 'Doctor@123',
  },
  'nurse@hospital.com': {
    user: {
      id: '3',
      email: 'nurse@hospital.com',
      username: 'nurse.jones',
      firstName: 'Emily',
      lastName: 'Jones',
      role: 'nurse',
      hospitalId: 'h1',
      hospitalName: 'City General Hospital',
      createdAt: new Date().toISOString(),
    },
    password: 'Nurse@123',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    hospital: null,
    isAuthenticated: false,
    isLoading: false,
  });

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser = mockUsers[credentials.email];
    if (mockUser && mockUser.password === credentials.password) {
      setState({
        user: mockUser.user,
        hospital: {
          id: 'h1',
          name: 'City General Hospital',
          address: '123 Medical Center Dr',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          phone: '+1-555-0123',
          email: 'info@citygeneralhospital.com',
          licenseNumber: 'LIC-123456',
          roles: ['doctor', 'nurse', 'admin', 'receptionist', 'pharmacist', 'lab_technician'],
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
      throw new Error('Invalid email or password');
    }
  }, []);

  const signup = useCallback(async (data: SignupData) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newUser: User = {
      id: crypto.randomUUID(),
      email: data.admin.email,
      username: data.admin.username,
      firstName: data.admin.firstName,
      lastName: data.admin.lastName,
      role: 'admin',
      hospitalId: crypto.randomUUID(),
      hospitalName: data.hospital.name,
      createdAt: new Date().toISOString(),
    };

    const newHospital: Hospital = {
      id: newUser.hospitalId!,
      name: data.hospital.name,
      address: data.hospital.address,
      city: data.hospital.city,
      state: data.hospital.state,
      zip: data.hospital.zip,
      phone: data.hospital.phone,
      email: data.hospital.email,
      licenseNumber: data.hospital.licenseNumber,
      roles: [],
      createdAt: new Date().toISOString(),
    };

    setState({
      user: newUser,
      hospital: newHospital,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(() => {
    setState({
      user: null,
      hospital: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const setHospitalRoles = useCallback((roles: UserRole[]) => {
    setState(prev => ({
      ...prev,
      hospital: prev.hospital ? { ...prev.hospital, roles } : null,
    }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout, setHospitalRoles }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
