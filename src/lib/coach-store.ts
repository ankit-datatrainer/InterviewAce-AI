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
  // Marketplace controls (admin-managed)
  priority: string;          // Premium | Featured | Standard | New
  visibility: boolean;
  kycVerified: boolean;
  // Coach-editable extras
  certificates: string[];    // public URLs (PDF / image)
  languages: string[];
  introVideoUrl: string | null;
}

export interface CoachSession {
  id: string;
  studentId: string | null;
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
    priority: c.priority ?? 'Standard',
    visibility: c.visibility !== false,
    kycVerified: !!c.kyc_verified,
    certificates: c.certificates ?? [],
    languages: c.languages ?? [],
    introVideoUrl: c.intro_video_url ?? null,
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

/** All coaches visible to students (approved) for the marketplace listing. */
export async function getPublicCoaches(): Promise<CoachProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .in('status', ['approved', 'active'])
    .order('rating', { ascending: false });
  if (error || !data) return [];
  return data.map(mapCoach);
}

export async function updateMyCoachProfile(coachId: string, updates: Partial<CoachProfile>): Promise<void> {
  const supabase = createClient();
  const db: any = {};
  if (updates.name !== undefined) db.name = updates.name;
  if (updates.title !== undefined) db.title = updates.title;
  if (updates.bio !== undefined) db.bio = updates.bio;
  if (updates.tags !== undefined) db.tags = updates.tags;
  if (updates.imageUrl !== undefined) db.image_url = updates.imageUrl;
  // NOTE: pricePerSession / commission / verification / priority / visibility
  // are admin-only. A database trigger reverts them for non-admins, so we no
  // longer send price from the coach portal at all.
  if (updates.experienceYears !== undefined) db.experience_years = updates.experienceYears;
  if (updates.certificates !== undefined) db.certificates = updates.certificates;
  if (updates.languages !== undefined) db.languages = updates.languages;
  if (updates.introVideoUrl !== undefined) db.intro_video_url = updates.introVideoUrl;
  if (Object.keys(db).length > 0) {
    await supabase.from('coaches').update(db).eq('id', coachId);
  }
}

/**
 * Uploads a certificate (PDF or image, ≤5 MB) to the public
 * `coach-certificates` storage bucket and returns its public URL.
 */
export async function uploadCertificate(coachId: string, file: File): Promise<string> {
  const okTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  if (!okTypes.includes(file.type)) throw new Error('Only PDF, PNG, JPG or WEBP files are allowed.');
  if (file.size > 5 * 1024 * 1024) throw new Error('File must be under 5 MB.');
  const supabase = createClient();
  const ext = file.name.split('.').pop() || 'pdf';
  const path = `${coachId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('coach-certificates').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('coach-certificates').getPublicUrl(path);
  return data.publicUrl;
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
    studentId: b.user_id ?? null,
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
  id: string | null;
  name: string;
  sessions: number;
  lastSession: string;
}

export async function getMyStudents(coachId: string): Promise<CoachStudent[]> {
  const sessions = await getMySessions(coachId);
  const byStudent = new Map<string, CoachStudent>();
  for (const s of sessions) {
    const key = s.studentId || s.studentName;
    const existing = byStudent.get(key);
    if (existing) {
      existing.sessions += 1;
      if (s.sessionDate > existing.lastSession) existing.lastSession = s.sessionDate;
    } else {
      byStudent.set(key, { id: s.studentId, name: s.studentName, sessions: 1, lastSession: s.sessionDate });
    }
  }
  return [...byStudent.values()].sort((a, b) => b.sessions - a.sessions);
}

// ─────────────────────────── Coach CRM ───────────────────────────
// Notes, homework and goals per student. RLS restricts every row to the
// coach that owns it (plus read access for the assigned student).

export interface CrmNote { id: string; studentId: string; notes: string; createdAt: string; }
export interface CrmHomework { id: string; studentId: string; task: string; status: string; dueDate: string | null; createdAt: string; }
export interface CrmGoal { id: string; studentId: string; goal: string; progress: number; createdAt: string; }

export interface StudentDetail {
  profile: { id: string; name: string; email: string | null; phone: string | null } | null;
  interviews: { id: string; type: string; role: string; score: number; date: string }[];
  notes: CrmNote[];
  homework: CrmHomework[];
  goals: CrmGoal[];
}

/** Full CRM view of one student: profile, AI interview history, notes, homework, goals. */
export async function getStudentDetail(coachId: string, studentId: string): Promise<StudentDetail> {
  const supabase = createClient();
  const [profileRes, interviewsRes, notesRes, hwRes, goalsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, phone').eq('id', studentId).maybeSingle(),
    supabase.from('interviews').select('id, interview_type, target_role, overall_score, created_at').eq('user_id', studentId).order('created_at', { ascending: false }).limit(10),
    supabase.from('coach_notes').select('*').eq('coach_id', coachId).eq('student_id', studentId).order('created_at', { ascending: false }),
    supabase.from('coach_homework').select('*').eq('coach_id', coachId).eq('student_id', studentId).order('created_at', { ascending: false }),
    supabase.from('coach_goals').select('*').eq('coach_id', coachId).eq('student_id', studentId).order('created_at', { ascending: false }),
  ]);

  const p: any = profileRes.data;
  return {
    profile: p ? { id: p.id, name: p.full_name || 'Student', email: p.email ?? null, phone: p.phone ?? null } : null,
    interviews: (interviewsRes.data || []).map((iv: any) => ({
      id: iv.id, type: iv.interview_type || 'Interview', role: iv.target_role || '—',
      score: iv.overall_score ?? 0, date: iv.created_at,
    })),
    notes: (notesRes.data || []).map((n: any) => ({ id: n.id, studentId: n.student_id, notes: n.notes, createdAt: n.created_at })),
    homework: (hwRes.data || []).map((h: any) => ({ id: h.id, studentId: h.student_id, task: h.task, status: h.status, dueDate: h.due_date ?? null, createdAt: h.created_at })),
    goals: (goalsRes.data || []).map((g: any) => ({ id: g.id, studentId: g.student_id, goal: g.goal, progress: g.progress ?? 0, createdAt: g.created_at })),
  };
}

export async function addStudentNote(coachId: string, studentId: string, notes: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('coach_notes').insert({ coach_id: coachId, student_id: studentId, notes });
  if (error) throw new Error(error.message);
}

export async function assignHomework(coachId: string, studentId: string, task: string, dueDate?: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('coach_homework').insert({ coach_id: coachId, student_id: studentId, task, due_date: dueDate || null });
  if (error) throw new Error(error.message);
}

export async function setHomeworkStatus(id: string, status: 'assigned' | 'submitted' | 'done'): Promise<void> {
  const supabase = createClient();
  await supabase.from('coach_homework').update({ status }).eq('id', id);
}

export async function setStudentGoal(coachId: string, studentId: string, goal: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('coach_goals').insert({ coach_id: coachId, student_id: studentId, goal, progress: 0 });
  if (error) throw new Error(error.message);
}

export async function setGoalProgress(id: string, progress: number): Promise<void> {
  const supabase = createClient();
  await supabase.from('coach_goals').update({ progress: Math.max(0, Math.min(100, progress)) }).eq('id', id);
}
