import { createClient } from '@/lib/supabase';

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved';

export interface Complaint {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  bookingId: string | null;
  coachName: string | null;
  subject: string;
  message: string;
  status: ComplaintStatus;
  adminResponse: string | null;
  createdAt: string;
}

/** Student raises a complaint (optionally tied to a booking/coach). */
export async function raiseComplaint(input: {
  subject: string;
  message: string;
  bookingId?: string | null;
  coachId?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('complaints').insert({
    user_id: user.id,
    subject: input.subject,
    message: input.message,
    booking_id: input.bookingId ?? null,
    coach_id: input.coachId ?? null,
  });
  if (error) throw error;
}

/** Student's own complaints. */
export async function getMyComplaints(): Promise<Complaint[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('complaints')
    .select('*, coaches(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return (data ?? []).map((r: any) => mapRow(r, null, null));
}

/** Admin view — every complaint, with reporter + coach names. */
export async function getAllComplaints(): Promise<Complaint[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('complaints')
    .select('*, coaches(name)')
    .order('created_at', { ascending: false });
  const rows = data ?? [];

  // No FK from complaints → profiles, so resolve reporter names in one batch.
  const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))];
  const nameById = new Map<string, { name: string | null; email: string | null }>();
  if (userIds.length) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);
    (profs ?? []).forEach((p: any) => nameById.set(p.id, { name: p.full_name ?? null, email: p.email ?? null }));
  }

  return rows.map((r: any) => {
    const p = nameById.get(r.user_id);
    return mapRow(r, p?.name ?? null, p?.email ?? null);
  });
}

export async function updateComplaint(
  id: string,
  patch: { status?: ComplaintStatus; adminResponse?: string },
): Promise<void> {
  const supabase = createClient();
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.adminResponse !== undefined) dbPatch.admin_response = patch.adminResponse;
  const { error } = await supabase.from('complaints').update(dbPatch).eq('id', id);
  if (error) throw error;
}

function mapRow(r: any, userName: string | null, userEmail: string | null): Complaint {
  return {
    id: r.id,
    userId: r.user_id,
    userName: userName ?? 'User',
    userEmail,
    bookingId: r.booking_id ?? null,
    coachName: r.coaches?.name ?? null,
    subject: r.subject,
    message: r.message,
    status: (r.status ?? 'open') as ComplaintStatus,
    adminResponse: r.admin_response ?? null,
    createdAt: r.created_at,
  };
}
