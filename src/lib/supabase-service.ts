import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-only Supabase client using the SERVICE ROLE key. This is what lets us
// send our OWN branded auth emails (generate confirmation links, create/confirm
// users) instead of Supabase's default template.
//
// SECURITY: never import this in client components. The service role key must
// only ever exist in server code / server env — it bypasses RLS.
//
// Returns null when SUPABASE_SERVICE_ROLE_KEY is not configured, so callers can
// gracefully fall back to the default Supabase email flow.
export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isServiceConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
