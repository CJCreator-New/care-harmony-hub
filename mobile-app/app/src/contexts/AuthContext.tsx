import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  phone?: string;
  full_name?: string;
  /** Resolved patient record id from the `patients` table (patient-role users only). */
  patient_id?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** Convenience accessor — same as user?.patient_id */
  patientId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? {
        id: session.user.id,
        email: session.user.email!,
        phone: session.user.phone,
        full_name: session.user.user_metadata?.full_name,
      } : null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Resolve patient_id for patient-role users
          const { data: patientRow } = await supabase
            .from('patients')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();

          setUser({
            id: session.user.id,
            email: session.user.email!,
            phone: session.user.phone,
            full_name: session.user.user_metadata?.full_name,
            patient_id: patientRow?.id,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await SecureStore.deleteItemAsync('supabase-session');
  };

  const patientId = user?.patient_id ?? null;

  return (
    <AuthContext.Provider value={{ user, loading, patientId, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};