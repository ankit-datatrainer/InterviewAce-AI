'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, RefreshCw, Eye, Ban, Search, CalendarDays, Clock } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getAllBookings, adminCancelBooking, type AdminBookingRow } from '@/lib/admin-store';

type Filter = 'all' | 'confirmed' | 'completed' | 'cancelled';
const FILTERS: Filter[] = ['all', 'confirmed', 'completed', 'cancelled'];

const statusColor = (s: string) =>
  s === 'completed' ? 'green' : s === 'cancelled' ? 'red' : 'blue';

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminBookingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState<AdminBookingRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmFor, setConfirmFor] = useState<AdminBookingRow | null>(null);

  const refresh = useCallback(async () => {
    try { setRows(await getAllBookings()); } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (!q) return true;
    return (
      r.studentName.toLowerCase().includes(q) ||
      (r.studentEmail || '').toLowerCase().includes(q) ||
      r.coachName.toLowerCase().includes(q)
    );
  });

  const counts = {
    confirmed: rows.filter((r) => r.status === 'confirmed').length,
    completed: rows.filter((r) => r.status === 'completed').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
  };

  const doCancel = async (r: AdminBookingRow) => {
    setCancelling(r.id);
    try {
      await adminCancelBooking(r.id);
      toast(`Cancelled ${r.studentName}'s session with ${r.coachName}.`);
      setConfirmFor(null);
      refresh();
    } catch {
      toast('Could not cancel the session.');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>All Sessions</h2>
          <p>Every session booked by any user &mdash; monitor, join, or cancel.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refresh}><RefreshCw size={15} /> Refresh</button>
      </div>

      {/* Stat chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Total', value: rows.length, cls: '' },
          { label: 'Upcoming', value: counts.confirmed, cls: 'blue' },
          { label: 'Completed', value: counts.completed, cls: 'green' },
          { label: 'Cancelled', value: counts.cancelled, cls: 'red' },
        ].map((s) => (
          <div key={s.label} className="widget" style={{ padding: '1rem 1.2rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: 'var(--text-3)', fontSize: '.8rem', marginTop: '.3rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="widget">
        {/* Filters + search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div className="tab-bar" style={{ marginBottom: 0 }}>
            {FILTERS.map((f) => (
              <button key={f} className={`tab-btn${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
                {f === 'confirmed' ? 'Upcoming' : f}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', minWidth: 240 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input
              className="input"
              placeholder="Search student, email, coach…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
          </div>
        </div>

        {!loaded ? null : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
            <CalendarClock size={34} style={{ opacity: 0.3, marginBottom: '.6rem' }} />
            <p>No sessions match this view.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="adm">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Coach</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.studentName}</div>
                      {r.studentEmail && <div style={{ color: 'var(--text-3)', fontSize: '.78rem' }}>{r.studentEmail}</div>}
                    </td>
                    <td>{r.coachName}</td>
                    <td style={{ whiteSpace: 'nowrap' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}><CalendarDays size={13} style={{ color: 'var(--text-3)' }} /> {formatDate(r.sessionDate)}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}><Clock size={13} style={{ color: 'var(--text-3)' }} /> {r.timeSlot}</span></td>
                    <td>{r.amount ? `₹${r.amount}` : '—'}</td>
                    <td><span className={`tag ${statusColor(r.status)}`} style={{ textTransform: 'capitalize' }}>{r.status === 'confirmed' ? 'Upcoming' : r.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                        {r.roomId && r.status === 'confirmed' && (
                          <button className="btn btn-ghost btn-sm" title="Join silently" onClick={() => router.push(`/admin/room/${r.roomId}`)}>
                            <Eye size={14} /> Monitor
                          </button>
                        )}
                        {r.status === 'confirmed' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
                            disabled={cancelling === r.id}
                            onClick={() => setConfirmFor(r)}
                          >
                            <Ban size={14} /> {cancelling === r.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel confirmation */}
      {confirmFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setConfirmFor(null)}>
          <div className="widget" style={{ maxWidth: 440, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ marginTop: 0 }}>Cancel this session?</h4>
            <p style={{ color: 'var(--text-2)', fontSize: '.9rem' }}>
              {confirmFor.studentName}&apos;s session with {confirmFor.coachName} on {formatDate(confirmFor.sessionDate)} at {confirmFor.timeSlot} will be cancelled. The student and coach will see it as cancelled.
            </p>
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '1.2rem' }}>
              <button className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} disabled={cancelling === confirmFor.id} onClick={() => doCancel(confirmFor)}>
                {cancelling === confirmFor.id ? 'Cancelling…' : 'Yes, cancel session'}
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmFor(null)}>Keep it</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
