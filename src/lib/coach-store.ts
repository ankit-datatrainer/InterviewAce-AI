import { createClient } from '@/lib/supabase';

// Data layer for the Coach Portal. Every query is scoped to the coach row that
// is linked (coaches.user_id) to the currently authenticated user. RLS enforces
// the same scoping on the server, so these are safe from the browser.

export interface CoachProfile {
  id: string;
  userId: string | null;
  name: string;
  title: string | null;
  bio: string | null;
  category: string;
  tags: string[];
  email: string | null;
  imageUrl: string | null;
  pricePerSession: number;
  experienceYears: number | null;
  rating: number;
  totalReviews: number;
  totalSessions: number;
  commissionPct: number;
  status: string;
  isVerified: boolean;
}

export interface CoachSession {
  id: string;
  studentName: string;
  sessionDate: string;
  timeSlot: string;
  goal: string | null;
  status: string;
  paymentStatus: string;
  amount: number | null;
  roomId: string | null;
  notes: string | null;
}

export interface CoachReview {
  id: string;
  studentName: string;
  rating: number;
  comment: string | null;
  date: string;
}

export interface AvailabilitySlot {
  id: string;
  weekday: number; // 0 = Sunday
  startTime: string;
  endTime: string;
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function mapCoach(c: any): CoachProfile {
  return {
    id: c.id,
    userId: c.user_id ?? null,
    name: c.name,
    title: c.title ?? null,
    bio: c.bio ?? c.description ?? null,
    category: c.category,
    tags: c.tags ?? [],
    email: c.email ?? null,
    imageUrl: c.image_url ?? null,
    pricePerSession: c.price_per_session ?? 0,
    experienceYears: c.experience_years ?? null,
    rating: c.rating ?? 0,
    totalReviews: c.total_reviews ?? 0,
    totalSessions: c.total_sessions ?? 0,
    commissionPct: c.commission_pct ?? 20,
    status: c.status ?? 'approved',
    isVerified: !!c.is_verified,
  };
}

/** The coach row linked to the logged-in user, or null if none. */
export async function getMyCoachProfile(): Promise<CoachProfile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('coaches').select('*').eq('user_id', user.id).maybeSingle();
  return data ? mapCoach(data) : null;
}

export async function updateMyCoachProfile(coachId: string, updates: Partial<CoachProfile>): Promise<void> {
  const supabase = createClient();
  const db: any = {};
  if (updates.name !== undefined) db.name = updates.name;
  if (updates.title !== undefined) db.title = updates.title;
  if (updates.bio !== undefined) db.bio = updates.bio;
  if (updates.tags !== undefined) db.tags = updates.tags;
  if (updates.imageUrl !== undefined) db.image_url = updates.imageUrl;
  if (updates.pricePerSession !== undefined) db.price_per_session = updates.pricePerSession;
  if (updates.experienceYears !== undefined) db.experience_years = updates.experienceYears;
  if (Object.keys(db).length > 0) {
    await supabase.from('coaches').update(db).eq('id', coachId);
  }
}

export async function getMySessions(coachId: string): Promise<CoachSession[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('bookings')
    .select('*, profiles(full_name)')
    .eq('coach_id', coachId)
    .order('session_date', { ascending: false });
  if (!data) return [];
  return data.map((b: any) => ({
    id: b.id,
    studentName: b.profiles?.full_name || 'Student',
    sessionDate: b.session_date,
    timeSlot: b.time_slot,
    goal: b.goal ?? null,
    status: b.status,
    paymentStatus: b.payment_status,
    amount: b.amount ?? null,
    roomId: b.room_id ?? null,
    notes: b.notes ?? null,
  }));
}

export async function updateSession(id: string, updates: { status?: string; notes?: string }): Promise<void> {
  const supabase = createClient();
  const db: any = {};
  if (updates.status) db.status = updates.status;
  if (updates.notes !== undefined) db.notes = updates.notes;
  if (Object.keys(db).length > 0) await supabase.from('bookings').update(db).eq('id', id);
}

export async function getMyReviews(coachId: string): Promise<CoachReview[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('reviews')
    .select('*, profiles(full_name)')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false });
  if (!data) return [];
  return data.map((r: any) => ({
    id: r.id,
    studentName: r.profiles?.full_name || 'Student',
    rating: r.rating,
    comment: r.comment ?? null,
    date: new Date(r.created_at).toISOString().split('T')[0],
  }));
}

export async function getAvailability(coachId: string): Promise<AvailabilitySlot[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('coach_availability')
    .select('*')
    .eq('coach_id', coachId)
    .order('weekday', { ascending: true });
  if (!data) return [];
  return data.map((s: any) => ({
    id: s.id,
    weekday: s.weekday,
    startTime: s.start_time?.slice(0, 5) ?? s.start_time,
    endTime: s.end_time?.slice(0, 5) ?? s.end_time,
  }));
}

export async function addAvailability(coachId: string, weekday: number, startTime: string, endTime: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('coach_availability').insert({ coach_id: coachId, weekday, start_time: startTime, end_time: endTime });
}

export async function removeAvailability(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('coach_availability').delete().eq('id', id);
}

export interface CoachEarnings {
  paidTotal: number;
  pendingTotal: number;
  lifetimeGross: number;
  payouts: { id: string; amount: number; status: string; periodStart: string | null; periodEnd: string | null; paidAt: string | null }[];
}

export async function getMyEarnings(coach: CoachProfile): Promise<CoachEarnings> {
  const supabase = createClient();
  const { data: payouts } = await supabase
    .from('payouts')
    .select('*')
    .eq('coach_id', coach.id)
    .order('created_at', { ascending: false });

  const list = (payouts || []).map((p: any) => ({
    id: p.id,
    amount: p.amount,
    status: p.status,
    periodStart: p.period_start ?? null,
    periodEnd: p.period_end ?? null,
    paidAt: p.paid_at ?? null,
  }));

  const paidTotal = list.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingTotal = list.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const coachShare = (100 - coach.commissionPct) / 100;
  const lifetimeGross = Math.round(coach.totalSessions * coach.pricePerSession * coachShare);

  return { paidTotal, pendingTotal, lifetimeGross, payouts: list };
}

export interface CoachStudent {
  name: string;
  sessions: number;
  lastSession: string;
}

export async function getMyStudents(coachId: string): Promise<CoachStudent[]> {
  const sessions = await getMySessions(coachId);
  const byStudent = new Map<string, CoachStudent>();
  for (const s of sessions) {
    const existing = byStudent.get(s.studentName);
    if (existing) {
      existing.sessions += 1;
      if (s.sessionDate > existing.lastSession) existing.lastSession = s.sessionDate;
    } else {
      byStudent.set(s.studentName, { name: s.studentName, sessions: 1, lastSession: s.sessionDate });
    }
  }
  return [...byStudent.values()].sort((a, b) => b.sessions - a.sessions);
}
