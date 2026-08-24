import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type DeletionScope = 'interviews' | 'resumes' | 'all';

async function removeResumeFiles(userId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.storage.from('resumes').list(userId, { limit: 1_000 });
  if (error || !data?.length) return;
  await admin.storage.from('resumes').remove(data.map((file) => `${userId}/${file.name}`));
}

export async function DELETE(request: NextRequest) {
  const rawScope = request.nextUrl.searchParams.get('scope');
  const scope: DeletionScope | null = rawScope === 'interviews' || rawScope === 'resumes' || rawScope === 'all'
    ? rawScope
    : null;
  if (!scope) {
    return NextResponse.json({ error: 'Use scope=interviews, resumes, or all.' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const failures: string[] = [];
  if (scope === 'interviews' || scope === 'all') {
    const { error } = await supabase.from('interviews').delete().eq('user_id', user.id);
    if (error) failures.push('interviews');
  }
  if (scope === 'resumes' || scope === 'all') {
    await removeResumeFiles(user.id).catch(() => failures.push('resume files'));
    const { error } = await supabase.from('resumes').delete().eq('user_id', user.id);
    if (error) failures.push('resumes');
  }

  if (failures.length > 0) {
    return NextResponse.json(
      { error: `Could not delete: ${failures.join(', ')}.` },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { deleted: scope },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
