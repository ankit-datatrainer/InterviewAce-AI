export interface BookingRecord {
  id: string;
  coachName: string;
  coachCategory: string;
  date: string;
  timeSlot: string;
  goal: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  price: string;
  bookedAt: string;
}

const STORAGE_KEY = 'interviewace_bookings';

export function saveBooking(record: BookingRecord): void {
  const bookings = getBookings();
  bookings.push(record);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  }
}

export function getBookings(): BookingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getUpcomingBookings(): BookingRecord[] {
  return getBookings().filter((b) => b.status === 'upcoming');
}

export function removeBooking(id: string): void {
  const bookings = getBookings().filter((b) => b.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  }
}

export function clearBookings(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
