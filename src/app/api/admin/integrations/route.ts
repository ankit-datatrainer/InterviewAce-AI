import { NextResponse } from 'next/server';

/**
 * Reports which server-side integrations have their secret keys configured.
 * Only booleans are returned — never the key values — so this is safe to call
 * from the admin UI. Secrets themselves are managed via env vars on the server.
 */
export async function GET() {
  const present = (...vals: (string | undefined)[]) => vals.every((v) => !!v && v.trim().length > 0);
  const anyPresent = (...vals: (string | undefined)[]) => vals.some((v) => !!v && v.trim().length > 0);
  return NextResponse.json({
    supabase: present(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseAdmin: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
    razorpay: present(process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET),
    videosdk: present(process.env.VIDEOSDK_API_KEY, process.env.VIDEOSDK_SECRET),
    heygen: present(process.env.HEYGEN_API_KEY),
    deepgram: present(process.env.DEEPGRAM_API_KEY),
    openrouter: present(process.env.OPENROUTER_API_KEY),
    nim: present(process.env.NVIDIA_NIM_API_KEY),
    email: anyPresent(process.env.SMTP_USER) && anyPresent(process.env.SMTP_PASS),
  });
}
