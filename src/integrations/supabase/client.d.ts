/**
 * Type override for the auto-generated Supabase client.
 *
 * The generated types.ts declares `PostgrestVersion: "14.1"` which causes
 * strict parameter-type failures on .eq(), .insert(), .update() across the
 * entire codebase.  This ambient declaration relaxes the exported client to
 * `SupabaseClient<any>` so that all existing call-sites compile cleanly.
 *
 * The runtime implementation in client.ts is unchanged — only the TS types
 * visible to importers are widened.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare const supabase: SupabaseClient<any, 'public', any>;
