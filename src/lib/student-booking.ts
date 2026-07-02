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
    .select('id, price_per_session')
    .ilike('name', name)
    .maybeSingle();

  const coachId = coach?.id ?? null;
  const pricePerSession = coach?.price_per_session ?? null;

  let weekly: { weekday: number; start: string; end: string }[] = [];
  const booked = new Set<string>();

  if (coachId) {
    const [{ data: av }, { data: bk }] = await Promise.all([
      supabase.from('coach_availability').select('weekday, start_time, end_time').eq('coach_id', coachId),
      supabase.from('bookings').select('session_date, time_slot').eq('coach_id', coachId).neq('status', 'cancelled'),
    ]);
    weekly = (av || []).map((s: any) => ({
      weekday: s.weekday,
      start: String(s.start_time || '').slice(0, 5),
      end: String(s.end_time || '').slice(0, 5),
    }));
    (bk || []).forEach((b: any) => booked.add(`${b.session_date}|${b.time_slot}`));
  }

  const source: 'published' | 'default' = weekly.length > 0 ? 'published' : 'default';

  const slots: BookableSlot[] = [];
  const today = new Date();
  for (let i = 1; i <= 14 && slots.length < 15; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const windows =
      source === 'published'
        ? weekly.filter((w) => w.weekday === d.getDay()).map((w) => ({ start: w.start, end: w.end }))
        : DEFAULT_WINDOWS;
    for (const w of windows) {
      const time = `${w.start} - ${w.end}`;
      const id = `${isoDate(d)}|${time}`;
      if (booked.has(id)) continue;
      slots.push({ id, date: isoDate(d), label: labelDate(d), time });
    }
  }

  return { coachId, pricePerSession, slots, source };
}

export async function createCoachBooking(params: {
  coachId: string | null;
  date: string;
  timeSlot: string;
  goal: string;
  roomId: string;
  amount: number;
}): Promise<{ ok: boolean }> {
  // Demo coaches without a DB row can't be persisted to Supabase (FK); the
  // caller still records the booking locally so the student can join the room.
  if (!params.coachId) return { ok: false };
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const { error } = await supabase.from('bookings').insert({
      user_id: user.id,
      coach_id: params.coachId,
      session_date: params.date,
      time_slot: params.timeSlot,
      goal: params.goal,
      status: 'confirmed',
      room_id: params.roomId,
      amount: params.amount || null,
    });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
