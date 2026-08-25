import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(url, key, {
    global: {
      fetch: async (input, init) => {
        try {
          return await fetch(input, init);
        } catch (err) {
          // Gracefully catch browser network-level failures (e.g. offline, DNS failure, paused Supabase instance)
          // Returns a synthetic 503 response so @supabase/auth-js handles it as a standard HTTP status
          // instead of throwing an unhandled browser Console TypeError: Failed to fetch.
          if (typeof window !== 'undefined') {
            console.warn('[Supabase Network]: Network fetch unreachable, handled gracefully.', (err as Error)?.message || err);
          }
          return new Response(
            JSON.stringify({
              error: 'network_error',
              message: 'Supabase server unreachable or connection failed.',
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
