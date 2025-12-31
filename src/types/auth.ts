export type UserRole = 'patient' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab_technician' | 'admin';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  hospitalId?: string;
  hospitalName?: string;
  createdAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  licenseNumber: string;
  roles: UserRole[];
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  hospital: Hospital | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupData {
  hospital: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
    licenseNumber: string;
  };
  admin: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };
}
