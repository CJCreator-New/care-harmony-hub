import { supabase } from '@/integrations/supabase/client';

export interface IdentityContext {
  authUserId: string | null;
  profileId: string | null;
  patientId: string | null;
  hospitalId: string | null;
}

export async function resolvePatientAuthUserId(patientId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('user_id')
    .eq('id', patientId)
    .maybeSingle();

  if (error) throw error;
  return data?.user_id ?? null;
}

export async function resolvePatientIdByAuthUserId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export async function resolveAuthUserIdByProfileId(profileId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', profileId)
    .maybeSingle();

  if (error) throw error;
  return data?.user_id ?? null;
}

