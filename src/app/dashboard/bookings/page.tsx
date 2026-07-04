'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Clock, Video, GraduationCap, Plus, XCircle } from 'lucide-react';
import { hydrateBookings, getBookings, type BookingRecord } from '@/lib/booking-store';
import { useSessionWindow } from '@/lib/session-window';

function statusTag(status: BookingRecord['status']) {
  if (status === 'completed') return { cls: 'green', label: 'Completed' };
  if (status === 'cancelled') return { cls: 'red', label: 'Cancelled' };
  return { cls: 'blue', label: 'Upcoming' };
}

function BookingCard({ b }: { b: BookingRecord }) {
  const router = useRouter();
  const win = useSessionWindow(b.date, b.timeSlot);
  const tag = statusTag(b.status);
  const isUpcoming = b.status === 'upcoming';

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '1.25rem', background: 'var(--bg-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
      <div>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
          <GraduationCap size={16} style={{ color: 'var(--blue)' }} /> {b.coachName}
          <span className={`tag ${tag.cls}`} style={{ marginLeft: '.3rem' }}>{tag.label}</span>
        </h4>
        <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-2)', fontSize: '.9rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><CalendarDays size={14} /> {b.date}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><Clock size={14} /> {b.timeSlot}</span>
          {b.price && <span>{b.price}</span>}
        </div>
        {b.goal && <p style={{ marginTop: '.5rem', fontSize: '.9rem', color: 'var(--text-2)' }}><strong>Goal:</strong> {b.goal}</p>}
      </div>

      {isUpcoming && b.roomId && (
        win.canJoin ? (
          <button className="btn btn-primary btn-sm" onClick={() => router.push(`/dashboard/coaching/room/${b.roomId}`)}>
            <Video size={15} /> Join session
          </button>
        ) : win.countdown ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--text-3)', fontSize: '.85rem' }}>
            <Clock size={14} /> Opens in {win.countdown}
          </span>
        ) : null
      )}
      {b.status === 'cancelled' && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--text-3)', fontSize: '.85rem' }}>
          <XCircle size={14} /> Cancelled
        </span>
      )}
    </div>
  );
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setBookings(getBookings());
    setLoaded(true);
    hydrateBookings().then((all) => setBookings([...all])).catch(() => {});
  }, []);

  if (!loaded) return null;

  const sorted = [...bookings].sort((a, b) => (a.date < b.date ? 1 : -1));
  const upcoming = sorted.filter((b) => b.status === 'upcoming');
  const past = sorted.filter((b) => b.status !== 'upcoming');

  return (
    <>
      <div className="app-head">
        <div>
          <h2>My Bookings</h2>
          <p>Every coaching session you&apos;ve booked, upcoming and past.</p>
        </div>
        <Link href="/dashboard/coaching" className="btn btn-primary btn-sm"><Plus size={16} /> Book a session</Link>
      </div>

      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4>Upcoming ({upcoming.length})</h4>
        {upcoming.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-3)' }}>
            <CalendarDays size={32} style={{ opacity: 0.3, marginBottom: '.6rem' }} />
            <p style={{ marginBottom: '.8rem' }}>No upcoming sessions.</p>
            <Link href="/dashboard/coaching" className="btn btn-primary btn-sm">Browse coaches</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {upcoming.map((b) => <BookingCard key={b.id} b={b} />)}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div className="widget">
          <h4>Past sessions ({past.length})</h4>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {past.map((b) => <BookingCard key={b.id} b={b} />)}
          </div>
        </div>
      )}
    </>
  );
}
