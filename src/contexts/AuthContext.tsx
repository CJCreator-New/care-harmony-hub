import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/auth';
import { sanitizeLogMessage } from '@/utils/sanitize';
import { deviceManager } from '@/utils/deviceManager';
import { passwordPolicyManager } from '@/utils/passwordPolicy';
import { biometricAuthManager } from '@/utils/biometricAuth';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { setUser as setSentryUser, clearUser as clearSentryUser } from '@/lib/monitoring/sentry';

interface Profile {
  id: string;
  user_id: string;
  hospital_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  two_factor_enabled: boolean | null;
}

interface Hospital {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  license_number: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  hospital: Hospital | null;
  roles: UserRole[];
  primaryRole: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<{ error: Error | null; userId?: string }>;
  logout: () => Promise<void>;
  createHospitalAndProfile: (
    hospitalData: Partial<Hospital>
  ) => Promise<{ error: Error | null }>;
  switchRole: (targetRole: UserRole) => Promise<{ error: Error | null }>;
  // Biometric authentication methods
  isBiometricAvailable: () => boolean;
  registerBiometric: (userName: string, userDisplayName: string) => Promise<boolean>;
  authenticateWithBiometric: () => Promise<boolean>;
  hasBiometricEnabled: () => Promise<boolean>;
  // Password policy methods
  validatePassword: (password: string) => Promise<{ isValid: boolean; errors: string[] }>;
  generateSecurePassword: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

const ROLE_PRIORITY: UserRole[] = [
  'admin',
  'doctor',
  'nurse',
  'receptionist',
  'pharmacist',
  'lab_technician',
  'patient',
];

const E2E_MOCK_AUTH_STORAGE_KEY = 'e2e-mock-auth-user';
const E2E_MOCK_PASSWORD = 'TestPass123!';

type E2EMockUserConfig = {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  hospitalId: string;
};

const E2E_MOCK_USERS: Record<string, E2EMockUserConfig> = {
  'admin@testgeneral.com': {
    id: 'e2e-admin-001',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    hospitalId: 'e2e-hospital-001',
  },
  'doctor@testgeneral.com': {
    id: 'e2e-doctor-001',
    firstName: 'Doctor',
    lastName: 'User',
    role: 'doctor',
    hospitalId: 'e2e-hospital-001',
  },
  'nurse@testgeneral.com': {
    id: 'e2e-nurse-001',
    firstName: 'Nurse',
    lastName: 'User',
    role: 'nurse',
    hospitalId: 'e2e-hospital-001',
  },
  'reception@testgeneral.com': {
    id: 'e2e-reception-001',
    firstName: 'Reception',
    lastName: 'User',
    role: 'receptionist',
    hospitalId: 'e2e-hospital-001',
  },
  'receptionist@testgeneral.com': {
    id: 'e2e-reception-001',
    firstName: 'Reception',
    lastName: 'User',
    role: 'receptionist',
    hospitalId: 'e2e-hospital-001',
  },
  'pharmacy@testgeneral.com': {
    id: 'e2e-pharmacy-001',
    firstName: 'Pharmacy',
    lastName: 'User',
    role: 'pharmacist',
    hospitalId: 'e2e-hospital-001',
  },
  'pharmacist@testgeneral.com': {
    id: 'e2e-pharmacy-001',
    firstName: 'Pharmacy',
    lastName: 'User',
    role: 'pharmacist',
    hospitalId: 'e2e-hospital-001',
  },
  'lab@testgeneral.com': {
    id: 'e2e-lab-001',
    firstName: 'Lab',
    lastName: 'User',
    role: 'lab_technician',
    hospitalId: 'e2e-hospital-001',
  },
  'labtech@testgeneral.com': {
    id: 'e2e-lab-001',
    firstName: 'Lab',
    lastName: 'User',
    role: 'lab_technician',
    hospitalId: 'e2e-hospital-001',
  },
  'patient@testgeneral.com': {
    id: 'e2e-patient-001',
    firstName: 'Patient',
    lastName: 'User',
    role: 'patient',
    hospitalId: 'e2e-hospital-001',
  },
};

const getE2EMockUser = (email: string): E2EMockUserConfig | null => {
  const normalizedEmail = email.trim().toLowerCase();
  return E2E_MOCK_USERS[normalizedEmail] ?? null;
};

const PREFERRED_ROLE_STORAGE_KEY = 'preferredRole';

const getStoredPreferredRole = (): UserRole | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(PREFERRED_ROLE_STORAGE_KEY);
    return stored ? (stored as UserRole) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [preferredRole, setPreferredRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isE2EMockAuthEnabled =
    typeof window !== 'undefined' && import.meta.env.VITE_E2E_MOCK_AUTH === 'true';

  const applyE2EMockAuthState = useCallback((email: string, mockUser: E2EMockUserConfig) => {
    const nowIso = new Date().toISOString();
    const mockSupabaseUser = {
      id: mockUser.id,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      email_confirmed_at: nowIso,
      phone: '',
      confirmation_sent_at: nowIso,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { first_name: mockUser.firstName, last_name: mockUser.lastName },
      identities: [],
      created_at: nowIso,
      updated_at: nowIso,
      is_anonymous: false,
    } as User;
    const mockSession = {
      access_token: `e2e-access-${mockUser.id}`,
      refresh_token: `e2e-refresh-${mockUser.id}`,
      expires_in: 60 * 60,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      token_type: 'bearer',
      user: mockSupabaseUser,
    } as Session;

    setUser(mockSupabaseUser);
    setSession(mockSession);
    setProfile({
      id: `profile-${mockUser.id}`,
      user_id: mockUser.id,
      hospital_id: mockUser.hospitalId,
      first_name: mockUser.firstName,
      last_name: mockUser.lastName,
      email,
      phone: null,
      avatar_url: null,
      two_factor_enabled: false,
    });
    setHospital({
      id: mockUser.hospitalId,
      name: 'Test General Hospital',
      address: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      zip: '12345',
      phone: '(555) 123-4567',
      email: 'admin@testgeneral.com',
      license_number: 'LIC-E2E-001',
    });
    setRoles([mockUser.role]);
    setPreferredRole(mockUser.role);

    try {
      window.localStorage.setItem(E2E_MOCK_AUTH_STORAGE_KEY, email.trim().toLowerCase());
      window.localStorage.setItem(PREFERRED_ROLE_STORAGE_KEY, mockUser.role);
    } catch {
      // Ignore storage errors in mock mode
    }
  }, []);

  const logout = useCallback(async () => {
    if (isE2EMockAuthEnabled) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setHospital(null);
      setRoles([]);
      setPreferredRole(null);
      try {
        window.localStorage.removeItem(E2E_MOCK_AUTH_STORAGE_KEY);
        window.localStorage.removeItem(PREFERRED_ROLE_STORAGE_KEY);
        window.localStorage.removeItem('testRole');
      } catch {
        // Ignore storage errors
      }
      clearSentryUser();
      return;
    }

    try {
      if (user) {
        // Log logout event
        await supabase.rpc('log_security_event', {
          p_user_id: user.id,
          p_event_type: 'logout',
          p_user_agent: navigator.userAgent,
          p_details: {},
          p_severity: 'info'
        });
      }

      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setHospital(null);
      setRoles([]);
      setPreferredRole(null);
      try {
        window.localStorage.removeItem(PREFERRED_ROLE_STORAGE_KEY);
        window.localStorage.removeItem('testRole');
      } catch {
        // Ignore storage errors
      }
      clearSentryUser();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, [isE2EMockAuthEnabled, user]);

  // Initialize session timeout
  useSessionTimeout({ logout, isAuthenticated: !!session });

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);

        // Fetch hospital if profile has hospital_id
        if (profileData.hospital_id) {
          const { data: hospitalData } = await supabase
            .from('hospitals')
            .select('*')
            .eq('id', profileData.hospital_id)
            .maybeSingle();

          if (hospitalData) {
            setHospital(hospitalData as Hospital);
          }
        }
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesData) {
        const userRoles = rolesData.map(r => r.role as UserRole);
        setRoles(userRoles);
      }
    } catch (error) {
      console.error('Error fetching user data:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (isE2EMockAuthEnabled) {
      try {
        const storedEmail = window.localStorage.getItem(E2E_MOCK_AUTH_STORAGE_KEY);
        if (storedEmail) {
          const storedMockUser = getE2EMockUser(storedEmail);
          if (storedMockUser) {
            applyE2EMockAuthState(storedEmail, storedMockUser);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }

      return () => {
        isMounted = false;
      };
    }
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Use requestIdleCallback or microtask to avoid deadlock
          queueMicrotask(() => {
            if (isMounted) {
              fetchUserData(currentSession.user!.id);
            }
          });
        } else {
          setProfile(null);
          setHospital(null);
          setRoles([]);
        }
        setIsLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchUserData(currentSession.user.id);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applyE2EMockAuthState, fetchUserData, isE2EMockAuthEnabled]);

  useEffect(() => {
    if (roles.length === 0) {
      setPreferredRole(null);
      return;
    }

    const stored = getStoredPreferredRole();
    if (stored && roles.includes(stored)) {
      setPreferredRole(stored);
      return;
    }

    setPreferredRole(null);
  }, [roles]);

  const login = useCallback(async (email: string, password: string) => {
    if (isE2EMockAuthEnabled) {
      const mockUser = getE2EMockUser(email);
      if (!mockUser || password !== E2E_MOCK_PASSWORD) {
        return { error: new Error('Invalid login credentials') };
      }
      applyE2EMockAuthState(email, mockUser);
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Log failed login attempt
        await supabase.rpc('log_security_event', {
          p_user_id: null,
          p_event_type: 'login_failure',
          p_ip_address: null,
          p_user_agent: navigator.userAgent,
          p_details: { email, error: error.message },
          p_severity: 'warning'
        });
        return { error: error as Error };
      }

      if (data.user) {
        // Register device and log successful login
        const device = await deviceManager.registerDevice(data.user.id);
        await deviceManager.updateDeviceActivity(device?.device_id || '');

        await supabase.rpc('log_security_event', {
          p_user_id: data.user.id,
          p_event_type: 'login_success',
          p_device_id: device?.id,
          p_ip_address: null,
          p_user_agent: navigator.userAgent,
          p_details: { email },
          p_severity: 'info'
        });
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [applyE2EMockAuthState, isE2EMockAuthEnabled]);

  const signup = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
    if (isE2EMockAuthEnabled) {
      if (!email || !password) {
        return { error: new Error('Email and password are required') };
      }

      const mockUserId = `e2e-signup-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const role: UserRole = 'admin';
      const mockSupabaseUser = {
        id: mockUserId,
        aud: 'authenticated',
        role: 'authenticated',
        email,
        email_confirmed_at: nowIso,
        phone: '',
        confirmation_sent_at: nowIso,
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { first_name: firstName, last_name: lastName },
        identities: [],
        created_at: nowIso,
        updated_at: nowIso,
        is_anonymous: false,
      } as User;
      const mockSession = {
        access_token: `e2e-access-${mockUserId}`,
        refresh_token: `e2e-refresh-${mockUserId}`,
        expires_in: 60 * 60,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
        token_type: 'bearer',
        user: mockSupabaseUser,
      } as Session;

      setUser(mockSupabaseUser);
      setSession(mockSession);
      setProfile({
        id: `profile-${mockUserId}`,
        user_id: mockUserId,
        hospital_id: 'e2e-hospital-001',
        first_name: firstName,
        last_name: lastName,
        email,
        phone: null,
        avatar_url: null,
        two_factor_enabled: false,
      });
      setHospital({
        id: 'e2e-hospital-001',
        name: 'Test General Hospital',
        address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zip: '12345',
        phone: '(555) 123-4567',
        email: 'admin@testgeneral.com',
        license_number: 'LIC-E2E-001',
      });
      setRoles([role]);
      setPreferredRole(role);
      return { error: null, userId: mockUserId };
    }

    try {
      // Validate password against policy
      const passwordValidation = await passwordPolicyManager.validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          error: new Error(`Password does not meet requirements: ${passwordValidation.errors.join(', ')}`)
        };
      }

      const redirectUrl = `${window.location.origin}/dashboard`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        // Log signup failure
        await supabase.rpc('log_security_event', {
          p_user_id: null,
          p_event_type: 'signup_failure',
          p_ip_address: null,
          p_user_agent: navigator.userAgent,
          p_details: { email, error: error.message },
          p_severity: 'warning'
        });
        return { error: error as Error };
      }

      // Create profile for the new user
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            email: email,
          });

        if (profileError) {
          console.error('Error creating profile:', sanitizeLogMessage(profileError.message));
        }

        // Log successful signup
        await supabase.rpc('log_security_event', {
          p_user_id: data.user.id,
          p_event_type: 'signup_success',
          p_ip_address: null,
          p_user_agent: navigator.userAgent,
          p_details: { email },
          p_severity: 'info'
        });

        return { error: null, userId: data.user.id };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [isE2EMockAuthEnabled]);

  const createHospitalAndProfile = useCallback(
    async (hospitalData: Partial<Hospital>) => {
      if (isE2EMockAuthEnabled) {
        setHospital({
          id: hospital?.id || 'e2e-hospital-001',
          name: hospitalData.name || hospital?.name || 'My Hospital',
          address: hospitalData.address || hospital?.address || null,
          city: hospitalData.city || hospital?.city || null,
          state: hospitalData.state || hospital?.state || null,
          zip: hospitalData.zip || hospital?.zip || null,
          phone: hospitalData.phone || hospital?.phone || null,
          email: hospitalData.email || hospital?.email || null,
          license_number: hospitalData.license_number || hospital?.license_number || null,
        });
        return { error: null };
      }

      const effectiveUserId = user?.id ?? session?.user?.id;
      if (!effectiveUserId) return { error: new Error('Not authenticated') };

      try {
        const { data, error } = await supabase.functions.invoke('create-hospital-admin', {
          body: {
            name: hospitalData.name || 'My Hospital',
            address: hospitalData.address || null,
            city: hospitalData.city || null,
            state: hospitalData.state || null,
            zip: hospitalData.zip || null,
            phone: hospitalData.phone || null,
            email: hospitalData.email || null,
            license_number: hospitalData.license_number || null,
          },
        });

        if (error) throw error;
        if (data?.error) {
          throw new Error(data.error);
        }

        await fetchUserData(effectiveUserId);

        return { error: null };
      } catch (error) {
        console.error('Error creating hospital and profile:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
        return { error: error as Error };
      }
    },
    [fetchUserData, hospital, isE2EMockAuthEnabled, session, user]
  );

  const primaryRole = useMemo(() => {
    if (preferredRole && roles.includes(preferredRole)) {
      return preferredRole;
    }
    if (roles.length === 0) return null;
    for (const role of ROLE_PRIORITY) {
      if (roles.includes(role)) return role;
    }
    return roles[0] ?? null;
  }, [preferredRole, roles]);

  const switchRole = useCallback(async (targetRole: UserRole) => {
    if (!roles.includes(targetRole)) {
      return { error: new Error('Role not assigned to user') };
    }

    try {
      if (user) {
        await supabase.rpc('log_security_event', {
          p_user_id: user.id,
          p_event_type: 'role_switch',
          p_user_agent: navigator.userAgent,
          p_details: { from: primaryRole, to: targetRole },
          p_severity: 'info'
        });
      }

      setPreferredRole(targetRole);
      try {
        window.localStorage.setItem(PREFERRED_ROLE_STORAGE_KEY, targetRole);
      } catch {
        // Ignore storage errors
      }

      return { error: null };
    } catch (error) {
      console.error('Error switching role:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      return { error: error as Error };
    }
  }, [primaryRole, roles, user]);

  useEffect(() => {
    if (user) {
      setSentryUser({
        id: user.id,
        email: user.email || profile?.email || undefined,
        role: primaryRole || undefined,
        hospitalId: profile?.hospital_id || hospital?.id || undefined,
      });
    } else {
      clearSentryUser();
    }
  }, [user, profile?.email, profile?.hospital_id, hospital?.id, primaryRole]);

  // Biometric authentication methods
  const isBiometricAvailable = useCallback(() => {
    return biometricAuthManager.isBiometricAvailable();
  }, []);

  const registerBiometric = useCallback(async (userName: string, userDisplayName: string) => {
    const currentUserId = user?.id;
    if (!currentUserId) return false;
    return await biometricAuthManager.registerBiometricCredential(currentUserId, userName, userDisplayName);
  }, [user]);

  const authenticateWithBiometric = useCallback(async () => {
    const currentUserId = user?.id;
    if (!currentUserId) return false;
    return await biometricAuthManager.authenticateWithBiometric(currentUserId);
  }, [user]);

  const hasBiometricEnabled = useCallback(async () => {
    const currentUserId = user?.id;
    if (!currentUserId) return false;
    return await biometricAuthManager.hasBiometricEnabled(currentUserId);
  }, [user]);

  // Password policy methods
  const validatePassword = useCallback(async (password: string) => {
    return await passwordPolicyManager.validatePassword(password, hospital?.id || undefined);
  }, [hospital?.id]);

  const generateSecurePassword = useCallback(() => {
    return passwordPolicyManager.generateSecurePassword();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        hospital,
        roles,
        primaryRole,
        isAuthenticated: !!session,
        isLoading,
        login,
        signup,
        logout,
        createHospitalAndProfile,
        switchRole,
        isBiometricAvailable,
        registerBiometric,
        authenticateWithBiometric,
        hasBiometricEnabled,
        validatePassword,
        generateSecurePassword,
      }}
    >
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
