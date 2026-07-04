import { createClient } from '@/lib/supabase';

export interface BookingRecord {
  id: string;
  dbId?: string;
  coachName: string;
  coachCategory: string;
  date: string;
  timeSlot: string;
  goal: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  price: string;
  bookedAt: string;
  roomId?: string;
}

const STORAGE_KEY = 'interviewace_bookings';

function readStore(): BookingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStore(bookings: BookingRecord[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  }
}

export function saveBooking(record: BookingRecord): void {
  const bookings = readStore();
  bookings.push(record);
  writeStore(bookings);
}

export function getBookings(): BookingRecord[] {
  return readStore();
}

export function getUpcomingBookings(): BookingRecord[] {
  return getBookings().filter((b) => b.status === 'upcoming');
}

export function removeBooking(id: string): void {
  writeStore(readStore().filter((b) => b.id !== id));
}

export function clearBookings(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function fromDbStatus(s: string): BookingRecord['status'] {
  if (s === 'cancelled') return 'cancelled';
  if (s === 'completed') return 'completed';
  return 'upcoming'; // 'confirmed' → upcoming
}

/** Pulls every booking the signed-in student has made, straight from Supabase. */
export async function fetchBookingsFromDb(): Promise<BookingRecord[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data: rows } = await supabase
      .from('bookings')
      .select('*, coaches(name, category, price_per_session)')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false });
    if (!rows) return [];

    return rows.map((r: any): BookingRecord => ({
      id: r.id,
      dbId: r.id,
      coachName: r.coaches?.name || 'Coach',
      coachCategory: r.coaches?.category || '',
      date: r.session_date,
      timeSlot: r.time_slot,
      goal: r.goal || '',
      status: fromDbStatus(r.status),
      price: r.amount ? `₹${r.amount}` : (r.coaches?.price_per_session ? `₹${r.coaches.price_per_session}` : ''),
      bookedAt: r.created_at,
      roomId: r.room_id || undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Merges local (device-only) bookings with the student's real bookings from
 * Supabase, so "My Bookings" and the Dashboard always reflect every session
 * booked from any device — not just localStorage on this one.
 */
export async function hydrateBookings(): Promise<BookingRecord[]> {
  const local = readStore();
  const db = await fetchBookingsFromDb();

  if (db.length === 0) return local;

  const dbIds = new Set(db.map((d) => d.dbId));
  // Keep local-only bookings that never made it to the DB (e.g. demo coaches).
  const localOnly = local.filter((r) => !r.dbId || !dbIds.has(r.dbId));
  const merged = [...db, ...localOnly];
  writeStore(merged);
  return merged;
}
