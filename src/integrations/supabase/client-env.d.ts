// Augment ImportMeta and SupabaseClientOptions so the auto-generated client.ts compiles cleanly.

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
  [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Allow the `fetch` property on createClient options
declare module '@supabase/supabase-js' {
  interface SupabaseClientOptions<SchemaName> {
    fetch?: typeof fetch;
  }
}
