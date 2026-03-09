/**
 * Supabase query helper - creates a relaxed-type Supabase client directly.
 * 
 * This bypasses the auto-generated client.ts (which has type issues) and
 * creates the client with relaxed generics to avoid PostgrestVersion strict inference.
 *
 * Import this instead of the raw client:
 *   import { supabase } from '@/integrations/supabase/client';
 *   (tsconfig path alias maps this import here)
 */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing required environment variables: VITE_SUPABASE_URL and ' +
    'VITE_SUPABASE_PUBLISHABLE_KEY must be set in your .env file.'
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient<any, 'public', any> = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
