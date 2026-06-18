// ── Admin Data Store ──
// Manages all admin data in localStorage with demo seed data

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  plan: 'Free' | 'Pro' | 'Premium';
  interviews: number;
  joined: string;
  status: 'Active' | 'Trial' | 'Payment due' | 'Suspended';
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
  status: 'Verified' | 'Docs pending' | 'Paused';
}

export interface AdminPayment {
  id: string;
  userName: string;
  item: string;
  amount: string;
  method: string;
  status: 'Paid' | 'Failed' | 'Refund req.';
  date: string;
}

export interface AdminTicket {
  id: string;
  userName: string;
  subject: string;
  priority: 'High' | 'Medium' | 'Low';
  age: string;
  status: 'Open' | 'In progress' | 'Resolved' | 'Escalated';
}

// ── Storage keys ──
const KEYS = {
  users: 'interviewace_admin_users',
  interviews: 'interviewace_admin_interviews',
  resumes: 'interviewace_admin_resumes',
  coaches: 'interviewace_admin_coaches',
  payments: 'interviewace_admin_payments',
  tickets: 'interviewace_admin_tickets',
};

// ── Seed data ──

const seedUsers: AdminUser[] = [
  { id: 'u1', name: 'Aarav Sharma', email: 'aarav.sharma@gmail.com', initials: 'AS', color: '#2563EB', plan: 'Pro', interviews: 14, joined: '2026-01-12', status: 'Active' },
  { id: 'u2', name: 'Priya Patel', email: 'priya.patel@outlook.com', initials: 'PP', color: '#7C3AED', plan: 'Premium', interviews: 28, joined: '2025-11-05', status: 'Active' },
  { id: 'u3', name: 'Rohan Mehta', email: 'rohan.mehta@yahoo.com', initials: 'RM', color: '#059669', plan: 'Free', interviews: 3, joined: '2026-04-22', status: 'Trial' },
  { id: 'u4', name: 'Ananya Desai', email: 'ananya.d@gmail.com', initials: 'AD', color: '#DC2626', plan: 'Pro', interviews: 9, joined: '2026-02-18', status: 'Active' },
  { id: 'u5', name: 'Vikram Singh', email: 'vikram.singh@proton.me', initials: 'VS', color: '#EA580C', plan: 'Premium', interviews: 21, joined: '2025-12-09', status: 'Payment due' },
  { id: 'u6', name: 'Sneha Iyer', email: 'sneha.iyer@gmail.com', initials: 'SI', color: '#0891B2', plan: 'Free', interviews: 1, joined: '2026-05-30', status: 'Trial' },
  { id: 'u7', name: 'Karthik Nair', email: 'karthik.n@hotmail.com', initials: 'KN', color: '#4338CA', plan: 'Pro', interviews: 17, joined: '2026-01-28', status: 'Active' },
  { id: 'u8', name: 'Meera Joshi', email: 'meera.joshi@gmail.com', initials: 'MJ', color: '#BE185D', plan: 'Premium', interviews: 32, joined: '2025-10-15', status: 'Active' },
  { id: 'u9', name: 'Arjun Reddy', email: 'arjun.reddy@gmail.com', initials: 'AR', color: '#15803D', plan: 'Free', interviews: 5, joined: '2026-03-11', status: 'Suspended' },
  { id: 'u10', name: 'Divya Krishnan', email: 'divya.k@outlook.com', initials: 'DK', color: '#9333EA', plan: 'Pro', interviews: 11, joined: '2026-02-04', status: 'Active' },
];

const seedInterviews: AdminInterview[] = [
  { id: 'i1', userId: 'u1', userName: 'Aarav Sharma', type: 'Technical — React', duration: '28 min', score: '82%', flag: 'Passed', flagTag: 'green', date: '2026-06-11' },
  { id: 'i2', userId: 'u2', userName: 'Priya Patel', type: 'Behavioral — Leadership', duration: '22 min', score: '91%', flag: 'Excellent', flagTag: 'green', date: '2026-06-11' },
  { id: 'i3', userId: 'u4', userName: 'Ananya Desai', type: 'Technical — DSA', duration: '35 min', score: '67%', flag: 'Needs work', flagTag: 'amber', date: '2026-06-10' },
  { id: 'i4', userId: 'u7', userName: 'Karthik Nair', type: 'HR — Salary negotiation', duration: '18 min', score: '78%', flag: 'Passed', flagTag: 'green', date: '2026-06-10' },
  { id: 'i5', userId: 'u8', userName: 'Meera Joshi', type: 'System Design', duration: '40 min', score: '88%', flag: 'Excellent', flagTag: 'green', date: '2026-06-09' },
  { id: 'i6', userId: 'u3', userName: 'Rohan Mehta', type: 'Technical — Python', duration: '25 min', score: '54%', flag: 'Failed', flagTag: 'red', date: '2026-06-09' },
  { id: 'i7', userId: 'u5', userName: 'Vikram Singh', type: 'Behavioral — Teamwork', duration: '20 min', score: '85%', flag: 'Passed', flagTag: 'green', date: '2026-06-08' },
  { id: 'i8', userId: 'u10', userName: 'Divya Krishnan', type: 'Technical — Java', duration: '30 min', score: '73%', flag: 'Needs work', flagTag: 'amber', date: '2026-06-08' },
];

const seedResumes: AdminResume[] = [
  { id: 'r1', fileName: 'Aarav_Sharma_Resume.pdf', userName: 'Aarav Sharma', targetRole: 'Frontend Developer', atsScore: 87, uploads: 3, date: '2026-06-10' },
  { id: 'r2', fileName: 'Priya_SDE_Resume.pdf', userName: 'Priya Patel', targetRole: 'SDE-2 at Amazon', atsScore: 92, uploads: 5, date: '2026-06-09' },
  { id: 'r3', fileName: 'Rohan_DS_CV.pdf', userName: 'Rohan Mehta', targetRole: 'Data Scientist', atsScore: 64, uploads: 1, date: '2026-06-08' },
  { id: 'r4', fileName: 'Ananya_PM_Resume.pdf', userName: 'Ananya Desai', targetRole: 'Product Manager', atsScore: 78, uploads: 2, date: '2026-06-07' },
  { id: 'r5', fileName: 'Karthik_Backend.pdf', userName: 'Karthik Nair', targetRole: 'Backend Engineer', atsScore: 83, uploads: 4, date: '2026-06-06' },
  { id: 'r6', fileName: 'Meera_FullStack.pdf', userName: 'Meera Joshi', targetRole: 'Full Stack Developer', atsScore: 95, uploads: 6, date: '2026-06-05' },
];

const seedCoaches: AdminCoach[] = [
  { id: 'c1', name: 'Rajesh Kumar', initials: 'RK', color: '#2563EB', category: 'Technical', rating: 4.9, sessions: 142, payoutDue: '18,500', status: 'Verified' },
  { id: 'c2', name: 'Sunita Agarwal', initials: 'SA', color: '#7C3AED', category: 'HR / Behavioral', rating: 4.8, sessions: 98, payoutDue: '12,200', status: 'Verified' },
  { id: 'c3', name: 'Amit Choudhary', initials: 'AC', color: '#059669', category: 'System Design', rating: 4.7, sessions: 76, payoutDue: '9,800', status: 'Docs pending' },
  { id: 'c4', name: 'Neha Gupta', initials: 'NG', color: '#DC2626', category: 'Product Management', rating: 4.6, sessions: 54, payoutDue: '7,400', status: 'Verified' },
  { id: 'c5', name: 'Deepak Verma', initials: 'DV', color: '#EA580C', category: 'Data Science', rating: 4.5, sessions: 41, payoutDue: '5,100', status: 'Paused' },
  { id: 'c6', name: 'Kavita Rao', initials: 'KR', color: '#0891B2', category: 'Technical', rating: 4.8, sessions: 110, payoutDue: '14,300', status: 'Verified' },
];

const seedPayments: AdminPayment[] = [
  { id: 'p1', userName: 'Priya Patel', item: 'Premium plan — Annual', amount: '8,999', method: 'UPI', status: 'Paid', date: '2026-06-10' },
  { id: 'p2', userName: 'Vikram Singh', item: 'Premium plan — Monthly', amount: '999', method: 'Card', status: 'Failed', date: '2026-06-09' },
  { id: 'p3', userName: 'Aarav Sharma', item: 'Pro plan — Monthly', amount: '499', method: 'UPI', status: 'Paid', date: '2026-06-08' },
  { id: 'p4', userName: 'Karthik Nair', item: 'Coaching session — Rajesh Kumar', amount: '1,200', method: 'Card', status: 'Paid', date: '2026-06-07' },
  { id: 'p5', userName: 'Meera Joshi', item: 'Premium plan — Annual', amount: '8,999', method: 'Net Banking', status: 'Refund req.', date: '2026-06-06' },
  { id: 'p6', userName: 'Divya Krishnan', item: 'Pro plan — Monthly', amount: '499', method: 'UPI', status: 'Paid', date: '2026-06-05' },
];

const seedTickets: AdminTicket[] = [
  { id: 't1', userName: 'Vikram Singh', subject: 'Payment failed but amount debited', priority: 'High', age: '2h', status: 'Open' },
  { id: 't2', userName: 'Rohan Mehta', subject: 'Interview recording not available', priority: 'Medium', age: '6h', status: 'In progress' },
  { id: 't3', userName: 'Ananya Desai', subject: 'ATS score seems incorrect', priority: 'Low', age: '1d', status: 'Resolved' },
  { id: 't4', userName: 'Meera Joshi', subject: 'Refund not processed after 7 days', priority: 'High', age: '3d', status: 'Escalated' },
  { id: 't5', userName: 'Sneha Iyer', subject: 'Cannot schedule coaching session', priority: 'Medium', age: '12h', status: 'Open' },
];

// ── Helpers ──

function load<T>(key: string, seed: T[]): T[] {
  if (typeof window === 'undefined') return seed;
  const raw = localStorage.getItem(key);
  if (raw) {
    try { return JSON.parse(raw) as T[]; } catch { /* fall through */ }
  }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

function save<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Users ──

export function getAdminUsers(): AdminUser[] {
  return load<AdminUser>(KEYS.users, seedUsers);
}

export function updateAdminUser(id: string, updates: Partial<AdminUser>): void {
  const users = getAdminUsers().map((u) => (u.id === id ? { ...u, ...updates } : u));
  save(KEYS.users, users);
}

export function deleteAdminUser(id: string): void {
  const users = getAdminUsers().filter((u) => u.id !== id);
  save(KEYS.users, users);
}

// ── Interviews ──

export function getAdminInterviews(): AdminInterview[] {
  return load<AdminInterview>(KEYS.interviews, seedInterviews);
}

export function updateAdminInterview(id: string, updates: Partial<AdminInterview>): void {
  const interviews = getAdminInterviews().map((i) => (i.id === id ? { ...i, ...updates } : i));
  save(KEYS.interviews, interviews);
}

export function deleteAdminInterview(id: string): void {
  const interviews = getAdminInterviews().filter((i) => i.id !== id);
  save(KEYS.interviews, interviews);
}

// ── Resumes ──

export function getAdminResumes(): AdminResume[] {
  return load<AdminResume>(KEYS.resumes, seedResumes);
}

export function deleteAdminResume(id: string): void {
  const resumes = getAdminResumes().filter((r) => r.id !== id);
  save(KEYS.resumes, resumes);
}

// ── Coaches ──

export function getAdminCoaches(): AdminCoach[] {
  return load<AdminCoach>(KEYS.coaches, seedCoaches);
}

export function updateAdminCoach(id: string, updates: Partial<AdminCoach>): void {
  const coaches = getAdminCoaches().map((c) => (c.id === id ? { ...c, ...updates } : c));
  save(KEYS.coaches, coaches);
}

export function deleteAdminCoach(id: string): void {
  const coaches = getAdminCoaches().filter((c) => c.id !== id);
  save(KEYS.coaches, coaches);
}

// ── Payments ──

export function getAdminPayments(): AdminPayment[] {
  return load<AdminPayment>(KEYS.payments, seedPayments);
}

export function updateAdminPayment(id: string, updates: Partial<AdminPayment>): void {
  const payments = getAdminPayments().map((p) => (p.id === id ? { ...p, ...updates } : p));
  save(KEYS.payments, payments);
}

export function deleteAdminPayment(id: string): void {
  const payments = getAdminPayments().filter((p) => p.id !== id);
  save(KEYS.payments, payments);
}

// ── Tickets ──

export function getAdminTickets(): AdminTicket[] {
  return load<AdminTicket>(KEYS.tickets, seedTickets);
}

export function updateAdminTicket(id: string, updates: Partial<AdminTicket>): void {
  const tickets = getAdminTickets().map((t) => (t.id === id ? { ...t, ...updates } : t));
  save(KEYS.tickets, tickets);
}

export function deleteAdminTicket(id: string): void {
  const tickets = getAdminTickets().filter((t) => t.id !== id);
  save(KEYS.tickets, tickets);
}

// ── Stats ──

export function getAdminStats(): { totalUsers: number; interviewsThisWeek: number; revenue: string; openTickets: number } {
  const users = getAdminUsers();
  const interviews = getAdminInterviews();
  const tickets = getAdminTickets();

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const interviewsThisWeek = interviews.filter((i) => new Date(i.date) >= oneWeekAgo).length;
  const openTickets = tickets.filter((t) => t.status === 'Open' || t.status === 'In progress' || t.status === 'Escalated').length;

  return {
    totalUsers: users.length,
    interviewsThisWeek,
    revenue: '2,34,500',
    openTickets,
  };
}
