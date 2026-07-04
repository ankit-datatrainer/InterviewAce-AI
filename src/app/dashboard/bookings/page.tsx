'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Clock, Video, Plus, XCircle, CheckCircle2, ChevronRight, IndianRupee } from 'lucide-react';
import { hydrateBookings, getBookings, type BookingRecord } from '@/lib/booking-store';
import { useSessionWindow } from '@/lib/session-window';

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function statusTag(status: BookingRecord['status']) {
  if (status === 'completed') return { cls: 'green', label: 'Completed' };
  if (status === 'cancelled') return { cls: 'red', label: 'Cancelled' };
  return { cls: 'blue', label: 'Upcoming' };
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function BookingCard({ b }: { b: BookingRecord }) {
  const router = useRouter();
  const win = useSessionWindow(b.date, b.timeSlot);
  const tag = statusTag(b.status);
  const isUpcoming = b.status === 'upcoming';
  const canJoin = isUpcoming && !!b.roomId && win.canJoin;

  const goToRoom = () => {
    if (canJoin && b.roomId) router.push(`/dashboard/coaching/room/${b.roomId}`);
  };

  return (
    <div
      onClick={goToRoom}
      role={canJoin ? 'button' : undefined}
      tabIndex={canJoin ? 0 : undefined}
      onKeyDown={(e) => { if (canJoin && (e.key === 'Enter' || e.key === ' ')) goToRoom(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: '1.1rem',
        padding: '1.15rem 1.35rem', borderRadius: 'var(--r-lg, 14px)',
        background: canJoin ? 'linear-gradient(135deg, rgba(37,99,235,0.10), rgba(16,185,129,0.06))' : 'var(--bg-2)',
        border: canJoin ? '1px solid rgba(37,99,235,0.4)' : '1px solid var(--line)',
        cursor: canJoin ? 'pointer' : 'default',
        transition: 'transform .15s ease, box-shadow .15s ease',
        boxShadow: canJoin ? '0 8px 24px rgba(37,99,235,0.18)' : 'none',
      }}
      onMouseEnter={(e) => { if (canJoin) e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { if (canJoin) e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Coach avatar */}
      <div style={{
        width: 56, height: 56, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: 'var(--bg-3, #1a1c26)', display: 'grid', placeItems: 'center',
        fontWeight: 700, color: 'var(--text-2)', fontSize: '1rem',
        border: canJoin ? '2px solid var(--blue)' : '1px solid var(--line)',
      }}>
        {b.coachImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.coachImage} alt={b.coachName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          initials(b.coachName)
        )}
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.35rem' }}>
          <h4 style={{ margin: 0, fontSize: '1.02rem' }}>{b.coachName}</h4>
          <span className={`tag ${tag.cls}`}>{tag.label}</span>
          {canJoin && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', fontSize: '.72rem', fontWeight: 700, color: '#10b981' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulseDot 1.4s infinite' }} /> LIVE NOW
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--text-2)', fontSize: '.86rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}><CalendarDays size={13} /> {formatDate(b.date)}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}><Clock size={13} /> {b.timeSlot}</span>
          {b.price && <span style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }}><IndianRupee size={12} /> {b.price.replace(/[₹]/g, '')}</span>}
        </div>
      </div>

      {/* Action */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        {isUpcoming && b.roomId && (
          canJoin ? (
            <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); goToRoom(); }}>
              <Video size={15} /> Join now
            </button>
          ) : win.countdown ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--text-3)', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
              <Clock size={13} /> Opens in {win.countdown}
            </span>
          ) : null
        )}
        {b.status === 'completed' && <CheckCircle2 size={20} style={{ color: '#10b981' }} />}
        {b.status === 'cancelled' && <XCircle size={20} style={{ color: 'var(--text-3)' }} />}
      </div>

      {canJoin && <ChevronRight size={18} style={{ color: 'var(--blue)', flexShrink: 0 }} />}

      <style>{`@keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
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
          <p>Every coaching session you&apos;ve booked — click a live session to join instantly.</p>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
            {upcoming.map((b) => <BookingCard key={b.id} b={b} />)}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div className="widget">
          <h4>Past sessions ({past.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
            {past.map((b) => <BookingCard key={b.id} b={b} />)}
          </div>
        </div>
      )}
    </>
  );
}
