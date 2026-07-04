import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getServiceClient } from '@/lib/supabase-service';
import { resolveRole } from '@/lib/roles';

// Admin-only: sends a password-recovery email to the given user.

async function assertAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Not signed in' };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (resolveRole(user.email, profile?.role) !== 'admin') {
    return { ok: false as const, status: 403, error: 'Admin access required' };
  }
  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  const gate = await assertAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { email } = await req.json().catch(() => ({}));
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const redirectTo = `${siteUrl}/login`;

  // Preferred: service role (works regardless of rate limits on the anon key).
  const service = getServiceClient();
  if (service) {
    const { error } = await service.auth.resetPasswordForEmail(email, { redirectTo });
    if (!error) return NextResponse.json({ message: `Password-reset email sent to ${email}.` });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Fallback: anon server client.
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: `Password-reset email sent to ${email}.` });
}
