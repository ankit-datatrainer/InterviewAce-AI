import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getServiceClient } from '@/lib/supabase-service';
import { resolveRole } from '@/lib/roles';

// Admin-only: directly sets a coach's login password (no email round-trip).

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

  const { userId, password } = await req.json().catch(() => ({}));
  if (!userId || !password) return NextResponse.json({ error: 'userId and password are required' }, { status: 400 });
  if (String(password).length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

  const service = getServiceClient();
  if (!service) return NextResponse.json({ error: 'SERVICE_KEY_MISSING' }, { status: 400 });

  const { error } = await service.auth.admin.updateUserById(userId, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
