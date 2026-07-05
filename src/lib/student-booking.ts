import { createClient } from '@/lib/supabase';

// Student-facing booking helper. Reads a coach's published weekly availability
// (set in the Coach Portal) from Supabase, expands it into concrete upcoming
// time slots, and creates a booking. Coaches that aren't in the DB yet fall back
// to a sensible default schedule so the flow still works for demo profiles.

export interface BookableSlot {
  id: string;        // unique key: "YYYY-MM-DD|HH:MM - HH:MM"
  date: string;      // YYYY-MM-DD
  label: string;     // "Mon, Jun 30"
  time: string;      // "10:00 - 11:00"
}

export interface CoachBookingInfo {
  coachId: string | null;
  pricePerSession: number | null;
  slots: BookableSlot[];
  source: 'published' | 'default';
  /** false when the admin has paused new bookings for this coach. */
  acceptingBookings: boolean;
}

const DEFAULT_WINDOWS = [
  { start: '10:00', end: '11:00' },
  { start: '14:00', end: '15:00' },
  { start: '17:00', end: '18:00' },
];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function labelDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export async function getCoachBookingInfo(name: string): Promise<CoachBookingInfo> {
  const supabase = createClient();

  const { data: coach } = await supabase
    .from('coaches')
    .select('id, price_per_session, accepting_bookings')
    .ilike('name', name)
    .maybeSingle();

  const coachId = coach?.id ?? null;
  const pricePerSession = coach?.price_per_session ?? null;
  // Missing column (pre-migration) reads as undefined — treat as accepting.
  const acceptingBookings = coach?.accepting_bookings !== false;

  let weekly: { weekday: number; start: string; end: string }[] = [];
  const booked = new Set<string>();
  const blockedDates = new Set<string>();
  // Exact per-date session timings the coach/admin set in the 5-day calendar.
  const dateWindows = new Map<string, { start: string; end: string }[]>();

  if (coachId && acceptingBookings) {
    const [{ data: av }, { data: bk }, { data: blocked }, { data: dateSlots }] = await Promise.all([
      supabase.from('coach_availability').select('weekday, start_time, end_time').eq('coach_id', coachId),
      supabase.from('bookings').select('session_date, time_slot').eq('coach_id', coachId).neq('status', 'cancelled'),
      supabase.from('coach_blocked_dates').select('blocked_date').eq('coach_id', coachId),
      supabase.from('coach_date_slots').select('slot_date, start_time, end_time').eq('coach_id', coachId),
    ]);
    weekly = (av || []).map((s: any) => ({
      weekday: s.weekday,
      start: String(s.start_time || '').slice(0, 5),
      end: String(s.end_time || '').slice(0, 5),
    }));
    (bk || []).forEach((b: any) => booked.add(`${b.session_date}|${b.time_slot}`));
    (blocked || []).forEach((b: any) => blockedDates.add(b.blocked_date));
    (dateSlots || []).forEach((s: any) => {
      const arr = dateWindows.get(s.slot_date) || [];
      arr.push({ start: String(s.start_time || '').slice(0, 5), end: String(s.end_time || '').slice(0, 5) });
      dateWindows.set(s.slot_date, arr);
    });
  }

  const source: 'published' | 'default' = weekly.length > 0 || dateWindows.size > 0 ? 'published' : 'default';

  const slots: BookableSlot[] = [];
  if (acceptingBookings) {
    const today = new Date();
    for (let i = 1; i <= 14 && slots.length < 15; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = isoDate(d);
      if (blockedDates.has(dateStr)) continue; // admin holiday / blocked day
      // Date-specific slots take precedence; otherwise weekly recurring; else default.
      const weeklyWindows = weekly.filter((w) => w.weekday === d.getDay()).map((w) => ({ start: w.start, end: w.end }));
      const perDate = dateWindows.get(dateStr) || [];
      // Union date-specific + weekly, de-duped by "start-end".
      const merged = [...perDate, ...weeklyWindows];
      const seen = new Set<string>();
      const unioned = merged.filter((w) => { const k = `${w.start}-${w.end}`; if (seen.has(k)) return false; seen.add(k); return true; });
      const windows = unioned.length > 0 ? unioned : (source === 'default' ? DEFAULT_WINDOWS : []);
      for (const w of windows) {
        const time = `${w.start} - ${w.end}`;
        const id = `${dateStr}|${time}`;
        if (booked.has(id)) continue;
        slots.push({ id, date: dateStr, label: labelDate(d), time });
      }
    }
  }

  return { coachId, pricePerSession, slots, source, acceptingBookings };
}

/** Dates (YYYY-MM-DD) the signed-in student already has a live booking on — used to enforce one session per day. */
export async function getUserBookedDates(): Promise<Set<string>> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Set();
    const { data } = await supabase
      .from('bookings')
      .select('session_date')
      .eq('user_id', user.id)
      .neq('status', 'cancelled');
    return new Set((data || []).map((b: any) => b.session_date));
  } catch {
    return new Set();
  }
}

export async function createCoachBooking(params: {
  coachId: string | null;
  date: string;
  timeSlot: string;
  goal: string;
  roomId: string;
  amount: number;
}): Promise<{ ok: boolean; id?: string; reason?: 'ALREADY_BOOKED_THAT_DAY' }> {
  // Demo coaches without a DB row can't be persisted to Supabase (FK); the
  // caller still records the booking locally so the student can join the room.
  if (!params.coachId) return { ok: false };
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    // One session per calendar day — re-check right before inserting to close
    // the race window even if the UI already filtered the date out.
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('session_date', params.date)
      .neq('status', 'cancelled');
    if ((count || 0) > 0) return { ok: false, reason: 'ALREADY_BOOKED_THAT_DAY' };

    const { data, error } = await supabase.from('bookings').insert({
      user_id: user.id,
      coach_id: params.coachId,
      session_date: params.date,
      time_slot: params.timeSlot,
      goal: params.goal,
      status: 'confirmed',
      room_id: params.roomId,
      amount: params.amount || null,
    }).select('id').single();
    return { ok: !error, id: data?.id };
  } catch {
    return { ok: false };
  }
}
