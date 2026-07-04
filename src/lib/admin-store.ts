import { createClient } from '@/lib/supabase';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  plan: string;
  interviews: number;
  joined: string;
  status: string;
}

export interface AdminInterview {
  id: string;
  userId: string;
  userName: string;
  type: string;
  duration: string;
  score: string;
  flag: string;
  flagTag: string;
  date: string;
}

export interface AdminResume {
  id: string;
  fileName: string;
  userName: string;
  targetRole: string;
  atsScore: number;
  uploads: number;
  date: string;
}

export interface AdminCoach {
  id: string;
  name: string;
  initials: string;
  color: string;
  category: string;
  rating: number;
  sessions: number;
  payoutDue: string;
  status: string;
  email?: string;
  linked?: boolean;
}

export interface AdminPayment {
  id: string;
  userName: string;
  item: string;
  amount: string;
  method: string;
  status: string;
  date: string;
}

export interface AdminTicket {
  id: string;
  userName: string;
  subject: string;
  priority: string;
  age: string;
  status: string;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
}

function getColorForId(id: string) {
  const colors = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#EA580C', '#0891B2', '#4338CA', '#BE185D', '#15803D', '#9333EA'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  // Primary path: the service-role API lists EVERY real user (bypasses RLS).
  try {
    const res = await fetch('/api/admin/users', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.users) && data.users.length > 0) {
        return data.users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          initials: getInitials(u.name || 'U'),
          color: getColorForId(u.id),
          plan: u.plan,
          interviews: u.interviews,
          joined: u.joined,
          status: u.status,
        }));
      }
    }
  } catch { /* fall through to the direct query below */ }

  // Fallback (service key not set): read profiles directly with the user client.
  const supabase = createClient();
  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  const { data: interviews } = await supabase.from('interviews').select('user_id');
  if (!profiles) return [];
  return profiles.map((p: any) => {
    const userInterviews = interviews?.filter((i: any) => i.user_id === p.id).length || 0;
    return {
      id: p.id,
      name: p.full_name || 'Unknown User',
      email: p.email,
      initials: getInitials(p.full_name || 'U'),
      color: getColorForId(p.id),
      plan: p.plan === 'pro' ? 'Pro' : p.plan === 'premium' ? 'Premium' : 'Free',
      interviews: userInterviews,
      joined: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '',
      status: 'Active',
    };
  });
}

export async function updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<void> {
  try {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, plan: updates.plan, name: updates.name }),
    });
    if (res.ok) return;
  } catch { /* fall through */ }
  const supabase = createClient();
  const dbUpdates: any = {};
  if (updates.plan) dbUpdates.plan = updates.plan.toLowerCase();
  if (updates.name) dbUpdates.full_name = updates.name;
  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from('profiles').update(dbUpdates).eq('id', id);
  }
}

export async function deleteAdminUser(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) return;
  } catch { /* fall through */ }
  const supabase = createClient();
  await supabase.from('profiles').delete().eq('id', id);
}

export async function getAdminInterviews(): Promise<AdminInterview[]> {
  const supabase = createClient();
  const { data: interviews } = await supabase
    .from('interviews')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false });
    
  if (!interviews) return [];
  
  return interviews.map((i: any) => {
    let flag = 'Passed';
    let flagTag = 'green';
    const score = i.overall_score || 0;
    
    if (score < 60) {
      flag = 'Failed';
      flagTag = 'red';
    } else if (score < 80) {
      flag = 'Needs work';
      flagTag = 'amber';
    } else if (score >= 90) {
      flag = 'Excellent';
      flagTag = 'green';
    }
    
    return {
      id: i.id,
      userId: i.user_id,
      userName: i.profiles?.full_name || 'Unknown',
      type: `${i.interview_type?.charAt(0).toUpperCase() + i.interview_type?.slice(1)} — ${i.target_role}`,
      duration: i.duration_seconds ? `${Math.floor(i.duration_seconds / 60)} min` : 'N/A',
      score: i.overall_score ? `${i.overall_score}%` : 'N/A',
      flag,
      flagTag,
      date: new Date(i.created_at).toISOString().split('T')[0]
    };
  });
}

export async function updateAdminInterview(id: string, updates: Partial<AdminInterview>): Promise<void> {}

export async function deleteAdminInterview(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('interviews').delete().eq('id', id);
}

export async function getAdminResumes(): Promise<AdminResume[]> {
  const supabase = createClient();
  const { data: resumes } = await supabase
    .from('resumes')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false });
    
  if (!resumes) return [];
  
  return resumes.map((r: any) => ({
    id: r.id,
    fileName: r.file_name,
    userName: r.profiles?.full_name || 'Unknown',
    targetRole: r.target_role || 'Not specified',
    atsScore: r.ats_score || 0,
    uploads: 1,
    date: new Date(r.created_at).toISOString().split('T')[0]
  }));
}

export async function deleteAdminResume(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('resumes').delete().eq('id', id);
}

export async function getAdminCoaches(): Promise<AdminCoach[]> {
  const supabase = createClient();
  const { data: coaches } = await supabase
    .from('coaches')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (!coaches) return [];
  
  return coaches.map((c: any) => {
    const commission = (c.commission_pct ?? 20) / 100;
    return {
      id: c.id,
      name: c.name,
      initials: getInitials(c.name),
      color: c.avatar_color || getColorForId(c.id),
      category: c.category,
      rating: c.rating,
      sessions: c.total_sessions || 0,
      payoutDue: Math.round((c.total_sessions || 0) * (c.price_per_session || 0) * (1 - commission)).toLocaleString(),
      status: c.status === 'approved' ? 'Approved' : c.status === 'suspended' ? 'Suspended' : c.status === 'pending' ? 'Pending' : (c.is_verified ? 'Approved' : 'Pending'),
      email: c.email || '',
      linked: !!c.user_id,
    };
  });
}

export async function updateAdminCoach(id: string, updates: Partial<AdminCoach>): Promise<void> {
  const supabase = createClient();
  const dbUpdates: any = {};
  if (updates.status) dbUpdates.is_verified = updates.status === 'Verified';
  
  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from('coaches').update(dbUpdates).eq('id', id);
  }
}

export async function deleteAdminCoach(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('coaches').delete().eq('id', id);
}

export async function getAdminPayments(): Promise<AdminPayment[]> {
  const supabase = createClient();
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, profiles(full_name), coaches(price_per_session)')
    .order('created_at', { ascending: false });
    
  if (!bookings) return [];
  
  return bookings.map((b: any) => ({
    id: b.id,
    userName: b.profiles?.full_name || 'Unknown',
    item: `Coaching Session`,
    amount: (b.coaches?.price_per_session || 0).toLocaleString(),
    method: 'Card',
    status: b.payment_status === 'paid' ? 'Paid' : 'Failed',
    date: new Date(b.created_at).toISOString().split('T')[0]
  }));
}

export async function updateAdminPayment(id: string, updates: Partial<AdminPayment>): Promise<void> {
  const supabase = createClient();
  const dbUpdates: any = {};
  if (updates.status) dbUpdates.payment_status = updates.status.toLowerCase();
  
  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from('bookings').update(dbUpdates).eq('id', id);
  }
}

export async function deleteAdminPayment(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('bookings').delete().eq('id', id);
}

export async function getAdminTickets(): Promise<AdminTicket[]> {
  const supabase = createClient();
  const { data: messages } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (!messages) return [];
  
  return messages.map((m: any) => {
    const age = Math.floor((new Date().getTime() - new Date(m.created_at).getTime()) / (1000 * 60 * 60));
    return {
      id: m.id,
      userName: m.name,
      subject: m.message.substring(0, 50) + '...',
      priority: 'Medium',
      age: `${age}h`,
      status: 'Open'
    };
  });
}

export async function updateAdminTicket(id: string, updates: Partial<AdminTicket>): Promise<void> {}

export async function deleteAdminTicket(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('contact_messages').delete().eq('id', id);
}

// ─────────────────────────────────────────────────────────────
// Audit logging
// ─────────────────────────────────────────────────────────────
export async function logAudit(action: string, targetType: string, targetId: string, meta?: any): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('audit_logs').insert({
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    action,
    target_type: targetType,
    target_id: targetId,
    meta: meta ?? null,
  });
}

export interface AuditLog {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  date: string;
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const supabase = createClient();
  const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
  if (!data) return [];
  return data.map((l: any) => ({
    id: l.id,
    actorEmail: l.actor_email || 'system',
    action: l.action,
    targetType: l.target_type || '',
    targetId: l.target_id || '',
    date: new Date(l.created_at).toLocaleString(),
  }));
}

// ─────────────────────────────────────────────────────────────
// Coach onboarding + approval
// ─────────────────────────────────────────────────────────────
export interface NewCoachInput {
  name: string;
  email?: string;
  title?: string;
  bio?: string;
  category: string;
  pricePerSession: number;
  experienceYears?: number;
  tags?: string[];
  commissionPct?: number;
}

export async function createCoach(input: NewCoachInput): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('coaches').insert({
    name: input.name,
    email: input.email || null,
    title: input.title || null,
    description: input.bio || null,
    bio: input.bio || null,
    category: input.category,
    price_per_session: input.pricePerSession,
    experience_years: input.experienceYears ?? 0,
    tags: input.tags ?? [],
    commission_pct: input.commissionPct ?? 20,
    avatar_color: getColorForId(input.name),
    status: 'pending',
    is_verified: false,
  }).select('id').single();
  if (error) {
    console.error('createCoach error', error);
    return null;
  }
  if (data?.id) await logAudit('coach.create', 'coach', data.id, { name: input.name });
  return data?.id ?? null;
}

export async function setCoachStatus(id: string, status: 'pending' | 'approved' | 'suspended'): Promise<void> {
  const supabase = createClient();
  await supabase.from('coaches').update({ status, is_verified: status === 'approved' }).eq('id', id);
  await logAudit(`coach.${status}`, 'coach', id);
}

/** Links an existing coach row to an auth user (by email) and grants the coach role. */
export async function linkCoachToUser(coachId: string, email: string): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient();
  const { data: profile } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle();
  if (!profile) return { ok: false, message: 'No registered user found with that email. Ask them to sign up first.' };
  await supabase.from('coaches').update({ user_id: profile.id, email }).eq('id', coachId);
  await supabase.from('profiles').update({ role: 'coach' }).eq('id', profile.id);
  await logAudit('coach.link_user', 'coach', coachId, { email });
  return { ok: true, message: 'Coach linked to user account and granted coach access.' };
}

// ─────────────────────────────────────────────────────────────
// Payouts
// ─────────────────────────────────────────────────────────────
export interface AdminPayout {
  id: string;
  coachId: string;
  coachName: string;
  amount: number;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
}

export async function getAdminPayouts(): Promise<AdminPayout[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('payouts')
    .select('*, coaches(name)')
    .order('created_at', { ascending: false });
  if (!data) return [];
  return data.map((p: any) => ({
    id: p.id,
    coachId: p.coach_id,
    coachName: p.coaches?.name || 'Unknown',
    amount: p.amount,
    status: p.status,
    periodStart: p.period_start,
    periodEnd: p.period_end,
    paidAt: p.paid_at,
  }));
}

export async function createPayout(coachId: string, amount: number, periodStart?: string, periodEnd?: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('payouts').insert({ coach_id: coachId, amount, period_start: periodStart || null, period_end: periodEnd || null, status: 'pending' });
  await logAudit('payout.create', 'coach', coachId, { amount });
}

export async function markPayoutPaid(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('payouts').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
  await logAudit('payout.paid', 'payout', id);
}

// ─────────────────────────────────────────────────────────────
// Announcements
// ─────────────────────────────────────────────────────────────
export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string;
  date: string;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const supabase = createClient();
  const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  if (!data) return [];
  return data.map((a: any) => ({ id: a.id, title: a.title, body: a.body, audience: a.audience, date: new Date(a.created_at).toLocaleString() }));
}

export async function createAnnouncement(title: string, body: string, audience: 'all' | 'students' | 'coaches'): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('announcements').insert({ title, body, audience, created_by: user?.id ?? null });
  await logAudit('announcement.create', 'announcement', title, { audience });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('announcements').delete().eq('id', id);
}

// ─────────────────────────────────────────────────────────────
// Analytics (time series for the dashboard + analytics page)
// ─────────────────────────────────────────────────────────────
export interface AnalyticsData {
  signupsByMonth: { label: string; value: number }[];
  interviewsByMonth: { label: string; value: number }[];
  revenueByMonth: { label: string; value: number }[];
  planBreakdown: { plan: string; count: number }[];
}

function lastNMonths(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-US', { month: 'short' }) });
  }
  return out;
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const supabase = createClient();
  const months = lastNMonths(6);
  const bucket = () => Object.fromEntries(months.map((m) => [m.key, 0])) as Record<string, number>;

  const [{ data: profiles }, { data: interviews }, { data: bookings }] = await Promise.all([
    supabase.from('profiles').select('created_at, plan'),
    supabase.from('interviews').select('created_at'),
    supabase.from('bookings').select('created_at, payment_status, amount, coaches(price_per_session)'),
  ]);

  const signups = bucket();
  const ivs = bucket();
  const rev = bucket();
  const plans: Record<string, number> = { free: 0, pro: 0, premium: 0 };

  (profiles || []).forEach((p: any) => {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key in signups) signups[key]++;
    plans[p.plan || 'free'] = (plans[p.plan || 'free'] || 0) + 1;
  });
  (interviews || []).forEach((i: any) => {
    const d = new Date(i.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key in ivs) ivs[key]++;
  });
  (bookings || []).forEach((b: any) => {
    if (b.payment_status !== 'paid') return;
    const d = new Date(b.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const amt = b.amount || b.coaches?.price_per_session || 0;
    if (key in rev) rev[key] += amt;
  });

  return {
    signupsByMonth: months.map((m) => ({ label: m.label, value: signups[m.key] })),
    interviewsByMonth: months.map((m) => ({ label: m.label, value: ivs[m.key] })),
    revenueByMonth: months.map((m) => ({ label: m.label, value: rev[m.key] })),
    planBreakdown: Object.entries(plans).map(([plan, count]) => ({ plan, count })),
  };
}

export async function getAdminStats(): Promise<{ totalUsers: number; interviewsThisWeek: number; revenue: string; openTickets: number }> {
  const users = await getAdminUsers();
  const interviews = await getAdminInterviews();
  const tickets = await getAdminTickets();
  const payments = await getAdminPayments();

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const interviewsThisWeek = interviews.filter((i) => new Date(i.date) >= oneWeekAgo).length;
  const openTickets = tickets.filter((t) => t.status === 'Open' || t.status === 'In progress' || t.status === 'Escalated').length;
  
  const revenueNum = payments.filter(p => p.status === 'Paid').reduce((acc, curr) => acc + parseInt(curr.amount.replace(/,/g, '') || '0', 10), 0);

  return {
    totalUsers: users.length,
    interviewsThisWeek,
    revenue: revenueNum.toLocaleString(),
    openTickets,
  };
}
