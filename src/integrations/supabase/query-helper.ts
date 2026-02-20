/**
 * Supabase query helper - re-exports the supabase client with relaxed types.
 * 
 * The auto-generated types.ts uses `__InternalSupabase: { PostgrestVersion: "14.1" }`
 * which causes widespread `SelectQueryError` and parameter type failures on `.eq()`, 
 * `.insert()`, `.update()` across the codebase.
 * 
 * Import this instead of the raw client when you hit type inference issues:
 *   import { supabase } from '@/integrations/supabase/query-helper';
 */
import { supabase as _supabase } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';

// Re-export with relaxed generics to bypass PostgrestVersion strict inference
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient<any, 'public', any> = _supabase as any;
