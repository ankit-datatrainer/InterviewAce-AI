import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getServiceClient } from '@/lib/supabase-service';
import { resolveRole } from '@/lib/roles';

// Admin-only. Lists EVERY real user (from Supabase Auth), merged with their
// profile + interview count. Uses the service role so it bypasses RLS and sees
// all users — the browser (anon) client only ever sees its own row.

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

export async function GET() {
  const gate = await assertAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const service = getServiceClient();
  if (!service) {
    return NextResponse.json({ error: 'SERVICE_KEY_MISSING', users: [] }, { status: 200 });
  }

  // 1) All auth users (paginated).
  const authUsers: any[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    authUsers.push(...(data?.users || []));
    if (!data || data.users.length < 200) break;
  }

  // 2) Profiles + interview counts (service bypasses RLS).
  const { data: profiles } = await service.from('profiles').select('*');
  const { data: interviews } = await service.from('interviews').select('user_id');
  const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
  const interviewCount = new Map<string, number>();
  for (const i of interviews || []) {
    interviewCount.set(i.user_id, (interviewCount.get(i.user_id) || 0) + 1);
  }

  const users = authUsers.map((u) => {
    const p: any = profileById.get(u.id) || {};
    const meta = u.user_metadata || {};
    const name = p.full_name || meta.full_name || (u.email ? u.email.split('@')[0] : 'Unknown User');
    const plan = p.plan || meta.plan || 'free';
    const role = p.role || meta.user_type || 'student';
    return {
      id: u.id,
      name,
      email: u.email || p.email || '—',
      plan: plan === 'pro' ? 'Pro' : plan === 'premium' ? 'Premium' : 'Free',
      role,
      interviews: interviewCount.get(u.id) || 0,
      joined: (u.created_at || p.created_at || new Date().toISOString()).split('T')[0],
      status: u.banned_until && new Date(u.banned_until) > new Date() ? 'Suspended'
        : u.email_confirmed_at ? 'Active' : 'Unverified',
    };
  }).sort((a, b) => (a.joined < b.joined ? 1 : -1));

  return NextResponse.json({ users });
}

// Update a user's plan, name, or ban status (admin only).
export async function PATCH(req: NextRequest) {
  const gate = await assertAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const service = getServiceClient();
  if (!service) return NextResponse.json({ error: 'SERVICE_KEY_MISSING' }, { status: 400 });

  const { id, plan, name, banned } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const updates: any = {};
  if (plan) updates.plan = String(plan).toLowerCase();
  if (name) updates.full_name = name;

  // Ban/unban at the AUTH level so a banned user genuinely cannot sign in
  // (~100 years), and mirror the flag on the profile for the UI.
  if (typeof banned === 'boolean') {
    const { error } = await service.auth.admin.updateUserById(id, {
      ban_duration: banned ? '876000h' : 'none',
    } as any);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    updates.is_banned = banned;
  }

  if (Object.keys(updates).length > 0) {
    // is_banned may not exist until the marketplace migration runs — retry
    // without it rather than failing the whole update.
    const { error } = await service.from('profiles').update(updates).eq('id', id);
    if (error && 'is_banned' in updates) {
      delete updates.is_banned;
      if (Object.keys(updates).length > 0) await service.from('profiles').update(updates).eq('id', id);
    }
  }
  return NextResponse.json({ ok: true });
}

// Delete a user completely (admin only).
export async function DELETE(req: NextRequest) {
  const gate = await assertAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const service = getServiceClient();
  if (!service) return NextResponse.json({ error: 'SERVICE_KEY_MISSING' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await service.from('profiles').delete().eq('id', id);
  try { await service.auth.admin.deleteUser(id); } catch { /* profile already gone is fine */ }
  return NextResponse.json({ ok: true });
}
