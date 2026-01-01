import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/auth';

interface Profile {
  id: string;
  user_id: string;
  hospital_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      console.error('Error fetching user data:', error);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Defer data fetching to avoid deadlock
          setTimeout(() => {
            fetchUserData(currentSession.user.id);
          }, 0);
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
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchUserData(currentSession.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  }, []);

  const signup = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
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
        console.error('Error creating profile:', profileError);
      }

      return { error: null, userId: data.user.id };
    }

    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setHospital(null);
    setRoles([]);
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
        console.error('Error creating hospital and profile:', error);
        return { error: error as Error };
      }
    },
    [user, session, fetchUserData]
  );

  const primaryRole = roles.length > 0 ? roles[0] : null;

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
