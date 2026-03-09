// Augment SupabaseClientOptions to accept `fetch`
import type { SupabaseClientOptions as _Opts } from '@supabase/supabase-js';

declare module '@supabase/supabase-js' {
  interface SupabaseClientOptions<SchemaName> {
    fetch?: typeof globalThis.fetch;
  }
}
