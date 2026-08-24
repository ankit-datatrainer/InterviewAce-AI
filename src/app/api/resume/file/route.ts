import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const storagePath = request.nextUrl.searchParams.get('path')?.trim() || '';
  if (!storagePath || storagePath.startsWith('/') || storagePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid resume path.' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = profile?.role === 'admin';
  if (!isAdmin && !storagePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'You do not have access to this resume.' }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Private resume storage is not configured.' }, { status: 503 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.storage.from('resumes').createSignedUrl(storagePath, 60);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Resume file was not found.' }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
