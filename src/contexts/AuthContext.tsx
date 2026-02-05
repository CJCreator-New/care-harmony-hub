import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
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
    hospitalData: Partial<Hospital>,
    role: UserRole,
    userIdOverride?: string
  ) => Promise<{ error: Error | null }>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
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
      clearSentryUser();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, [user]);

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
  }, [fetchUserData]);

  const login = useCallback(async (email: string, password: string) => {
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
  }, []);

  const signup = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
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
  }, []);

  const createHospitalAndProfile = useCallback(
    async (hospitalData: Partial<Hospital>, role: UserRole, userIdOverride?: string) => {
      const effectiveUserId = userIdOverride ?? user?.id ?? session?.user?.id;
      if (!effectiveUserId) return { error: new Error('Not authenticated') };

      try {
        // Create hospital (avoid RETURNING so RLS doesn't block reading the row before membership)
        const newHospitalId = crypto.randomUUID();
        const { error: hospitalError } = await supabase
          .from('hospitals')
          .insert({
            id: newHospitalId,
            name: hospitalData.name || 'My Hospital',
            address: hospitalData.address,
            city: hospitalData.city,
            state: hospitalData.state,
            zip: hospitalData.zip,
            phone: hospitalData.phone,
            email: hospitalData.email,
            license_number: hospitalData.license_number,
          });

        if (hospitalError) throw hospitalError;

        // Update profile with hospital_id
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ hospital_id: newHospitalId })
          .eq('user_id', effectiveUserId);

        if (profileError) throw profileError;

        // Create user role
        const { error: roleError } = await supabase.from('user_roles').insert({
          user_id: effectiveUserId,
          role: role,
          hospital_id: newHospitalId,
        });

        if (roleError) throw roleError;

        // Refresh user data
        await fetchUserData(effectiveUserId);

        return { error: null };
      } catch (error) {
        console.error('Error creating hospital and profile:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
        return { error: error as Error };
      }
    },
    [user, session, fetchUserData]
  );

  const primaryRole = roles.length > 0 ? roles[0] : null;

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
